import { createAdminClient } from "@/lib/supabase/admin"
import { renderTemplate, sendMessageToOrder, generateOrdersExcel, type TemplateVars, type EmailAttachment } from "@/lib/messaging"
import { ORDER_STATUSES } from "@/lib/constants"

type TriggerType = "new_order" | "status_change" | "scheduled"
type ActionType = "send_sms" | "send_email" | "change_status" | "webhook"

// Validera webhook-URL for å forhindre SSRF
function isAllowedWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:") return false
    const hostname = parsed.hostname.toLowerCase()
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname === "metadata.google.internal" ||
      hostname === "169.254.169.254"
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

type TriggerConfig = {
  from_status?: string
  to_status?: string
}

type ScheduledTriggerConfig = {
  schedule_type: "once" | "recurring"
  schedule_time: string       // HH:mm
  schedule_date?: string      // YYYY-MM-DD (för engångskörning)
  schedule_days?: number[]    // 0=måndag, 6=söndag (för återkommande)
  order_filter?: {
    status?: string           // Filtrera ordrar efter status
    older_than_days?: number  // Ordrar äldre än X dagar
  }
}

type ActionConfig = {
  template_id?: string
  new_status?: string
  webhook_url?: string
  message?: string
  subject?: string
  attach_leads?: boolean
}

// Beräkna nästa körning baserat på schemalagd konfiguration
export function calculateNextRunAt(config: Record<string, unknown>): string | null {
  const scheduleType = config.schedule_type as string
  const scheduleTime = config.schedule_time as string // HH:mm

  if (!scheduleTime) return null

  const [hours, minutes] = scheduleTime.split(":").map(Number)

  if (scheduleType === "once") {
    const scheduleDate = config.schedule_date as string // YYYY-MM-DD
    if (!scheduleDate) return null
    const next = new Date(`${scheduleDate}T${scheduleTime}:00`)
    // Om tiden redan passerat, returnera null
    if (next <= new Date()) return null
    return next.toISOString()
  }

  if (scheduleType === "recurring") {
    const scheduleDays = (config.schedule_days as number[]) || []
    const now = new Date()

    // Prova kommande 8 dagar för att hitta nästa matchande dag
    for (let offset = 0; offset <= 7; offset++) {
      const candidate = new Date(now)
      candidate.setDate(candidate.getDate() + offset)
      candidate.setHours(hours, minutes, 0, 0)

      // Hoppa över om tiden redan passerat idag
      if (candidate <= now) continue

      // Konvertera JS weekday (0=söndag) till vår (0=måndag)
      const jsDay = candidate.getDay()
      const ourDay = jsDay === 0 ? 6 : jsDay - 1

      // Om inga dagar angivna = varje dag, annars kolla match
      if (scheduleDays.length === 0 || scheduleDays.includes(ourDay)) {
        return candidate.toISOString()
      }
    }

    return null
  }

  return null
}

// Kör en schemalagd automation mot matchande ordrar
export async function runScheduledAutomation(automation: {
  id: string
  trigger_config: Record<string, unknown>
  automation_actions: Array<{
    id: string
    action_type: string
    action_config: Record<string, unknown>
    position: number
  }>
}) {
  const supabase = createAdminClient()
  const config = automation.trigger_config as ScheduledTriggerConfig

  // Bygg query baserat på orderfilter
  let query = supabase.from("orders").select("*")

  if (config.order_filter?.status) {
    query = query.eq("status", config.order_filter.status)
  }

  if (config.order_filter?.older_than_days) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - config.order_filter.older_than_days)
    query = query.lte("created_at", cutoff.toISOString())
  }

  const { data: orders, error } = await query

  if (error) {
    throw new Error(`Feil ved henting av ordrar: ${error.message}`)
  }

  if (!orders || orders.length === 0) {
    // Logga att inga ordrar matchade
    await supabase.from("automation_logs").insert({
      automation_id: automation.id,
      status: "success",
      details: "Planlagt kjøring — ingen bestillinger matchet filteret",
    })
    return
  }

  const actions = automation.automation_actions.sort((a, b) => a.position - b.position)

  // Separera sammanfattningsåtgärder (attach_leads) från per-order-åtgärder
  const summaryActions = actions.filter((a) => {
    const cfg = a.action_config as ActionConfig
    return cfg.attach_leads && a.action_type === "send_email"
  })
  const perOrderActions = actions.filter((a) => {
    const cfg = a.action_config as ActionConfig
    return !(cfg.attach_leads && a.action_type === "send_email")
  })

  // Kör sammanfattningsåtgärder EN gång (inte per order)
  for (const action of summaryActions) {
    const actionConfig = action.action_config as ActionConfig
    // Använd tomma vars — sammanfattningsmejl behöver inte per-order-variabler
    const summaryVars: TemplateVars = {
      navn: "",
      epost: "",
      telefon: "",
      kommune: "",
      adresse: "",
      tomming_type: "",
      order_id: "",
    }

    try {
      await executeAction(supabase, {
        actionType: action.action_type as ActionType,
        actionConfig,
        orderId: orders[0].id,
        order: orders[0],
        vars: summaryVars,
        allOrders: orders,
      })

      await supabase.from("automation_logs").insert({
        automation_id: automation.id,
        status: "success",
        details: `Planlagt: ${action.action_type} sammanfattning skickad (${orders.length} bestillinger)`,
      })
    } catch (err) {
      await supabase.from("automation_logs").insert({
        automation_id: automation.id,
        status: "failed",
        details: `Planlagt: ${(err as Error).message}`,
      })
    }
  }

  // Kör per-order-åtgärder mot varje matchande order
  if (perOrderActions.length > 0) {
    for (const order of orders) {
      const vars: TemplateVars = {
        navn: order.navn || "Kunde",
        epost: order.epost || "",
        telefon: order.telefon || "",
        kommune: order.kommune || "",
        adresse: order.adresse || "",
        tomming_type: order.tomming_type || "",
        order_id: order.order_id || "",
      }

      for (const action of perOrderActions) {
        const actionConfig = action.action_config as ActionConfig

        try {
          await executeAction(supabase, {
            actionType: action.action_type as ActionType,
            actionConfig,
            orderId: order.id,
            order,
            vars,
            allOrders: orders,
          })

          await supabase.from("automation_logs").insert({
            automation_id: automation.id,
            order_id: order.id,
            status: "success",
            details: `Planlagt: ${action.action_type} utført for ${order.order_id}`,
          })
        } catch (err) {
          await supabase.from("automation_logs").insert({
            automation_id: automation.id,
            order_id: order.id,
            status: "failed",
            details: `Planlagt: ${(err as Error).message} for ${order.order_id}`,
          })
        }
      }
    }
  }
}

// Kjør automationer for en trigger (event-basert)
export async function runAutomations(
  triggerType: TriggerType,
  orderId: string,
  context?: { from_status?: string; to_status?: string }
) {
  const supabase = createAdminClient()

  // Hent aktive automationer for denne triggeren
  const { data: automations } = await supabase
    .from("automations")
    .select(`
      *,
      automation_actions (*)
    `)
    .eq("trigger_type", triggerType)
    .eq("enabled", true)
    .order("created_at", { ascending: true })

  if (!automations || automations.length === 0) return

  // Hent order-data
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single()

  if (!order) return

  const vars: TemplateVars = {
    navn: order.navn || "Kunde",
    epost: order.epost || "",
    telefon: order.telefon || "",
    kommune: order.kommune || "",
    adresse: order.adresse || "",
    tomming_type: order.tomming_type || "",
    order_id: order.order_id || "",
  }

  for (const automation of automations) {
    const config = automation.trigger_config as TriggerConfig

    // Sjekk trigger-vilkår
    if (triggerType === "status_change") {
      if (config.from_status && config.from_status !== context?.from_status) continue
      if (config.to_status && config.to_status !== context?.to_status) continue
    }

    // Sorter actions etter posisjon
    const actions = ((automation.automation_actions || []) as Array<{
      id: string
      action_type: string
      action_config: ActionConfig
      position: number
    }>).sort((a, b) => a.position - b.position)

    for (const action of actions) {
      const actionConfig = action.action_config as ActionConfig

      try {
        await executeAction(supabase, {
          actionType: action.action_type as ActionType,
          actionConfig,
          orderId,
          order,
          vars,
        })

        // Logg success
        await supabase.from("automation_logs").insert({
          automation_id: automation.id,
          order_id: orderId,
          status: "success",
          details: `${action.action_type} utført`,
        })
      } catch (err) {
        // Logg failure
        await supabase.from("automation_logs").insert({
          automation_id: automation.id,
          order_id: orderId,
          status: "failed",
          details: (err as Error).message,
        })
      }
    }
  }
}

async function executeAction(
  supabase: ReturnType<typeof createAdminClient>,
  opts: {
    actionType: ActionType
    actionConfig: ActionConfig
    orderId: string
    order: Record<string, unknown>
    vars: TemplateVars
    allOrders?: Record<string, unknown>[]
  }
) {
  const { actionType, actionConfig, orderId, order, vars, allOrders } = opts

  // Generera Excel-bilaga om attach_leads är aktiverat
  let attachments: EmailAttachment[] | undefined
  if (actionConfig.attach_leads && actionType === "send_email" && allOrders && allOrders.length > 0) {
    const excelAttachment = await generateOrdersExcel(allOrders)
    attachments = [excelAttachment]
  }

  switch (actionType) {
    case "send_sms":
    case "send_email": {
      const channel = actionType === "send_sms" ? "sms" : "email"

      // Sammanfattningsmejl (attach_leads) skickas till admin, inte kunden
      const isSummary = !!actionConfig.attach_leads && actionType === "send_email"

      if (actionConfig.template_id) {
        const { data: template } = await supabase
          .from("message_templates")
          .select("*")
          .eq("id", actionConfig.template_id)
          .single()

        if (!template) throw new Error("Mal ikke funnet")

        const renderedBody = renderTemplate(template.body, vars)
        const renderedSubject = template.subject
          ? renderTemplate(template.subject, vars)
          : undefined

        let recipient: string
        if (isSummary) {
          recipient = process.env.NOTIFY_EMAIL || ""
          if (!recipient) throw new Error("NOTIFY_EMAIL ikke konfigurert — kan ikke sende sammenfattning")
        } else if (template.recipient_type === "company") {
          recipient = channel === "sms"
            ? process.env.NOTIFY_PHONE || ""
            : process.env.NOTIFY_EMAIL || ""
          if (!recipient) throw new Error(`Mangler ${channel === "sms" ? "NOTIFY_PHONE" : "NOTIFY_EMAIL"} i miljøvariabler`)
        } else {
          recipient = channel === "sms" ? (order.telefon as string) : (order.epost as string)
          if (!recipient) throw new Error(`Bestilling mangler ${channel === "sms" ? "telefon" : "e-post"}`)
        }

        const result = await sendMessageToOrder({
          orderId,
          channel,
          recipient,
          subject: renderedSubject,
          body: renderedBody,
          templateId: template.id,
          attachments,
        })

        if (!result.success) throw new Error(result.error)
      } else if (actionConfig.message) {
        const renderedBody = renderTemplate(actionConfig.message, vars)

        let recipient: string
        if (isSummary) {
          recipient = process.env.NOTIFY_EMAIL || ""
          if (!recipient) throw new Error("NOTIFY_EMAIL ikke konfigurert — kan ikke sende sammenfattning")
        } else {
          recipient = channel === "sms" ? (order.telefon as string) : (order.epost as string)
          if (!recipient) throw new Error(`Bestilling mangler ${channel === "sms" ? "telefon" : "e-post"}`)
        }

        const result = await sendMessageToOrder({
          orderId,
          channel,
          recipient,
          subject: actionConfig.subject ? renderTemplate(actionConfig.subject, vars) : undefined,
          body: renderedBody,
          attachments,
        })

        if (!result.success) throw new Error(result.error)
      }
      break
    }

    case "change_status": {
      if (!actionConfig.new_status) throw new Error("Ingen status angitt")
      if (!ORDER_STATUSES.includes(actionConfig.new_status as typeof ORDER_STATUSES[number])) {
        throw new Error("Ugyldig status")
      }
      await supabase
        .from("orders")
        .update({ status: actionConfig.new_status })
        .eq("id", orderId)
      break
    }

    case "webhook": {
      if (!actionConfig.webhook_url) throw new Error("Ingen webhook-URL angitt")
      if (!isAllowedWebhookUrl(actionConfig.webhook_url)) {
        throw new Error("Ugyldig webhook-URL. Bare HTTPS til offentlige domener er tillatt.")
      }
      const response = await fetch(actionConfig.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order, automation_type: "webhook" }),
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) throw new Error(`Webhook svarte ${response.status}`)
      break
    }
  }
}
