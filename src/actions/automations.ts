"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getAutomations() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("automations")
    .select(`
      *,
      automation_actions (*)
    `)
    .order("created_at", { ascending: false })

  return data ?? []
}

export async function getAutomationLogs() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("automation_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  return data ?? []
}

export async function createAutomation(data: {
  name: string
  trigger_type: string
  trigger_config: Record<string, unknown>
  actions: { action_type: string; action_config: Record<string, unknown> }[]
}) {
  const supabase = await createClient()

  // Beräkna next_run_at för schemalagda automationer
  let nextRunAt: string | null = null
  if (data.trigger_type === "scheduled") {
    const { calculateNextRunAt } = await import("@/lib/automations")
    nextRunAt = calculateNextRunAt(data.trigger_config)
    if (!nextRunAt) return { error: "Kunne ikke beregne neste kjøretidspunkt. Sjekk dato og klokkeslett." }
  }

  const { data: automation, error } = await supabase
    .from("automations")
    .insert({
      name: data.name,
      trigger_type: data.trigger_type,
      trigger_config: data.trigger_config,
      ...(nextRunAt ? { next_run_at: nextRunAt } : {}),
    })
    .select("id")
    .single()

  if (error || !automation) return { error: "Kunne ikke opprette automation" }

  if (data.actions.length > 0) {
    const actions = data.actions.map((a, i) => ({
      automation_id: automation.id,
      action_type: a.action_type,
      action_config: a.action_config,
      position: i,
    }))

    const { error: actionsError } = await supabase
      .from("automation_actions")
      .insert(actions)

    if (actionsError) return { error: "Kunne ikke opprette handlinger" }
  }

  revalidatePath("/admin/automations")
  return { success: true }
}

export async function toggleAutomation(id: string, enabled: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("automations")
    .update({ enabled })
    .eq("id", id)

  if (error) return { error: "Kunne ikke oppdatere" }

  revalidatePath("/admin/automations")
  return { success: true }
}

export async function deleteAutomation(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("automations")
    .delete()
    .eq("id", id)

  if (error) return { error: "Kunne ikke slette" }

  revalidatePath("/admin/automations")
  return { success: true }
}

// Kör en automation manuellt
export async function runAutomationManually(id: string) {
  const supabase = await createClient()

  // Hämta automationen med actions
  const { data: automation, error } = await supabase
    .from("automations")
    .select(`
      *,
      automation_actions (*)
    `)
    .eq("id", id)
    .single()

  if (error || !automation) return { error: "Automation ikke funnet" }

  const { runAutomations, runScheduledAutomation } = await import("@/lib/automations")

  try {
    if (automation.trigger_type === "scheduled") {
      // Schemalagda automationer körs mot matchande ordrar
      await runScheduledAutomation(automation)
    } else {
      // Event-baserade automationer: kör mot alla ordrar med status "ny"
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("status", "ny")
        .order("created_at", { ascending: false })

      if (!orders || orders.length === 0) {
        return { error: "Ingen nye bestillinger å kjøre automationen mot" }
      }

      for (const order of orders) {
        await runAutomations(automation.trigger_type, order.id)
      }
    }

    // Logga manuell körning
    await supabase.from("automation_logs").insert({
      automation_id: id,
      status: "success",
      details: "Manuell kjøring utført",
    })

    revalidatePath("/admin/automations")
    return { success: true }
  } catch (err) {
    await supabase.from("automation_logs").insert({
      automation_id: id,
      status: "failed",
      details: `Manuell kjøring feilet: ${(err as Error).message}`,
    })

    revalidatePath("/admin/automations")
    return { error: (err as Error).message }
  }
}
