import { createAdminClient } from "@/lib/supabase/admin"
import ExcelJS from "exceljs"

// Mallvariabler för Serwent-bestillinger
export type TemplateVars = {
  navn?: string
  epost?: string
  telefon?: string
  kommune?: string
  adresse?: string
  tomming_type?: string
  order_id?: string
}

// Sanitera värde för att förhindra injection
function sanitizeValue(value: string): string {
  return value
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
}

// Ersätt {{variabel}} med faktiska värden
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = (vars as Record<string, string | undefined>)[key]
    return value ? sanitizeValue(value) : match
  })
}

// Tillgängliga variabler för mallredigeraren
export const TEMPLATE_VARIABLES = [
  { key: "navn", label: "Kundens namn", example: "Ola Nordmann" },
  { key: "epost", label: "E-post", example: "ola@example.no" },
  { key: "telefon", label: "Telefon", example: "12345678" },
  { key: "kommune", label: "Kommune", example: "Gjøvik" },
  { key: "adresse", label: "Adresse", example: "Storgata 1, 2815 Gjøvik" },
  { key: "tomming_type", label: "Type tømming", example: "Lukket tank" },
  { key: "order_id", label: "Bestillings-ID", example: "BES-MMJ0YOA4-AGV" },
]

// Skicka SMS via 46elks
export async function sendSMS(
  to: string,
  message: string,
  apiUser: string,
  apiPassword: string,
  from?: string
): Promise<{ success: boolean; error?: string }> {
  // Formatera norskt telefonnummer till E.164
  let phone = to.replace(/[\s()-]/g, "")
  if (phone.startsWith("0")) {
    phone = "+47" + phone.substring(1)
  }
  if (!phone.startsWith("+")) {
    phone = "+47" + phone
  }

  try {
    const response = await fetch("https://api.46elks.com/a1/sms", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${apiUser}:${apiPassword}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        from: (from || "Serwent").replace(/[^A-Za-z0-9]/g, "").substring(0, 11) || "Serwent",
        to: phone,
        message,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `46elks error: ${text}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: `SMS-feil: ${(err as Error).message}` }
  }
}

// Bilagstyp för e-post
export type EmailAttachment = {
  filename: string
  content: string // Base64-kodat innehåll
}

// Skicka email via Resend
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  apiKey: string,
  fromEmail?: string,
  attachments?: EmailAttachment[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: Record<string, unknown> = {
      from: fromEmail || process.env.EMAIL_FROM || "Serwent <noreply@serwent.no>",
      to: [to],
      subject,
      text: body,
    }

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
      }))
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: `Resend error: ${data.message || response.statusText}` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: `E-postfeil: ${(err as Error).message}` }
  }
}

// Skicka meddelande och logga i messages-tabellen
export async function sendMessageToOrder(opts: {
  orderId: string
  channel: "sms" | "email"
  recipient: string
  subject?: string
  body: string
  templateId?: string
  attachments?: EmailAttachment[]
}) {
  const supabase = createAdminClient()

  let sendResult: { success: boolean; error?: string }

  if (opts.channel === "sms") {
    const apiUser = process.env.ELKS_API_USER
    const apiPassword = process.env.ELKS_API_PASSWORD
    if (!apiUser || !apiPassword) {
      return { success: false, error: "46elks ikke konfigurert. Legg til ELKS_API_USER og ELKS_API_PASSWORD i miljøvariabler." }
    }
    sendResult = await sendSMS(opts.recipient, opts.body, apiUser, apiPassword)
  } else {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return { success: false, error: "Resend ikke konfigurert. Legg til RESEND_API_KEY i miljøvariabler." }
    }
    sendResult = await sendEmail(opts.recipient, opts.subject || "Melding fra Serwent", opts.body, apiKey, undefined, opts.attachments)
  }

  // Logg meddelandet uansett resultat
  await supabase.from("messages").insert({
    order_id: opts.orderId,
    template_id: opts.templateId || null,
    channel: opts.channel,
    recipient: opts.recipient,
    subject: opts.subject || null,
    body: opts.body,
    status: sendResult.success ? "sent" : "failed",
  })

  return sendResult
}

// Notifiser admin ved ny bestilling
export async function notifyNewOrder(orderId: string) {
  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single()

  if (!order) return

  const notifyPhone = process.env.NOTIFY_PHONE
  const notifyEmail = process.env.NOTIFY_EMAIL

  // SMS-notis
  const smsApiUser = process.env.ELKS_API_USER
  const smsApiPassword = process.env.ELKS_API_PASSWORD
  if (notifyPhone && smsApiUser && smsApiPassword) {
    const message = `Ny bestilling: ${order.navn}\nKommune: ${order.kommune}\nTel: ${order.telefon}\nType: ${order.tomming_type}`
    await sendSMS(notifyPhone, message, smsApiUser, smsApiPassword)
  }

  // E-postnotis
  const emailApiKey = process.env.RESEND_API_KEY
  if (notifyEmail && emailApiKey) {
    const subject = `Ny bestilling: ${order.navn} — ${order.kommune}`
    const body = `Ny bestilling mottatt.\n\nNavn: ${order.navn}\nTelefon: ${order.telefon}\nE-post: ${order.epost}\nKommune: ${order.kommune}\nType: ${order.tomming_type}\nAdresse: ${order.adresse}\n\nLogg inn på admin for å håndtere bestillingen.`
    await sendEmail(notifyEmail, subject, body, emailApiKey)
  }
}

// Generera Excel-fil med ordrar och returnera som base64
export async function generateOrdersExcel(
  orders: Record<string, unknown>[]
): Promise<EmailAttachment> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Serwent"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet("Bestillinger")

  // Kolumndefinitioner
  sheet.columns = [
    { header: "Bestillings-ID", key: "order_id", width: 20 },
    { header: "Status", key: "status", width: 16 },
    { header: "Navn", key: "navn", width: 22 },
    { header: "Telefon", key: "telefon", width: 14 },
    { header: "E-post", key: "epost", width: 26 },
    { header: "Kommune", key: "kommune", width: 18 },
    { header: "Type tømming", key: "tomming_type", width: 30 },
    { header: "Adresse", key: "adresse", width: 30 },
    { header: "Gnr", key: "gnr", width: 8 },
    { header: "Bnr", key: "bnr", width: 8 },
    { header: "Kommentar", key: "kommentar", width: 30 },
    { header: "Opprettet", key: "created_at", width: 20 },
  ]

  // Stil på headerraden
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B3A6B" },
  }
  headerRow.alignment = { vertical: "middle" }

  // Statusetiketter
  const statusLabels: Record<string, string> = {
    ny: "Ny",
    under_behandling: "Under behandling",
    utfort: "Utført",
  }

  // Lägg till rader
  for (const order of orders) {
    sheet.addRow({
      order_id: order.order_id,
      status: statusLabels[(order.status as string) || ""] || order.status,
      navn: order.navn,
      telefon: order.telefon,
      epost: order.epost,
      kommune: order.kommune,
      tomming_type: order.tomming_type,
      adresse: order.adresse,
      gnr: order.gnr,
      bnr: order.bnr,
      kommentar: order.kommentar || "",
      created_at: order.created_at
        ? new Date(order.created_at as string).toLocaleString("nb-NO")
        : "",
    })
  }

  // Autofilter på headern
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 12 },
  }

  // Generera buffer och konvertera till base64
  const buffer = await workbook.xlsx.writeBuffer()
  const base64 = Buffer.from(buffer).toString("base64")

  const date = new Date().toISOString().slice(0, 10)
  return {
    filename: `Serwent_Bestillinger_${date}.xlsx`,
    content: base64,
  }
}
