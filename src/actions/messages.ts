"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { renderTemplate, sendMessageToOrder, type TemplateVars } from "@/lib/messaging"

// === MALLAR ===

export async function getTemplates() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return { error: "Kunne ikke hente maler" }
  return { data: data ?? [] }
}

export async function createTemplate(formData: FormData) {
  const supabase = await createClient()

  const name = (formData.get("name") as string)?.trim()
  const channel = formData.get("channel") as string
  const recipientType = (formData.get("recipient_type") as string) || "customer"
  const subject = (formData.get("subject") as string)?.trim() || null
  const body = (formData.get("body") as string)?.trim()

  if (!name || !channel || !body) {
    return { error: "Navn, kanal og melding er påkrevd" }
  }

  const { error } = await supabase
    .from("message_templates")
    .insert({ name, channel, recipient_type: recipientType, subject, body })

  if (error) return { error: "Kunne ikke opprette mal" }

  revalidatePath("/admin/messages")
  return { success: true }
}

export async function updateTemplate(id: string, updates: {
  name?: string
  channel?: string
  recipient_type?: string
  subject?: string | null
  body?: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("message_templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()

  if (error) return { error: "Kunne ikke oppdatere mal: " + error.message }
  if (!data || data.length === 0) return { error: "Malen ble ikke funnet" }

  revalidatePath("/admin/messages")
  return { success: true }
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", id)

  if (error) return { error: "Kunne ikke slette mal" }

  revalidatePath("/admin/messages")
  return { success: true }
}

// === SKICKA MEDDELANDE ===

export async function sendMessageFromTemplate(opts: {
  templateId: string
  orderId: string
}) {
  const supabase = await createClient()

  const { data: template } = await supabase
    .from("message_templates")
    .select("*")
    .eq("id", opts.templateId)
    .single()

  if (!template) return { error: "Mal ikke funnet" }

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", opts.orderId)
    .single()

  if (!order) return { error: "Bestilling ikke funnet" }

  const vars: TemplateVars = {
    navn: order.navn || "Kunde",
    epost: order.epost || "",
    telefon: order.telefon || "",
    kommune: order.kommune || "",
    adresse: order.adresse || "",
    tomming_type: order.tomming_type || "",
    order_id: order.order_id || "",
  }

  const renderedBody = renderTemplate(template.body, vars)
  const renderedSubject = template.subject
    ? renderTemplate(template.subject, vars)
    : undefined

  // Bestem mottagare basert på recipient_type
  const isCompany = template.recipient_type === "company"
  let recipient: string | null

  if (isCompany) {
    recipient = template.channel === "sms"
      ? process.env.NOTIFY_PHONE ?? null
      : process.env.NOTIFY_EMAIL ?? null
    if (!recipient) {
      return { error: `Mangler ${template.channel === "sms" ? "NOTIFY_PHONE" : "NOTIFY_EMAIL"} i miljøvariabler` }
    }
  } else {
    recipient = template.channel === "sms" ? order.telefon : order.epost
    if (!recipient) {
      return { error: `Bestilling mangler ${template.channel === "sms" ? "telefonnummer" : "e-post"}` }
    }
  }

  const result = await sendMessageToOrder({
    orderId: opts.orderId,
    channel: template.channel as "sms" | "email",
    recipient,
    subject: renderedSubject,
    body: renderedBody,
    templateId: opts.templateId,
  })

  revalidatePath("/admin/orders")
  return result
}

// Skicka fritt meddelande
export async function sendDirectMessage(opts: {
  orderId: string
  channel: "sms" | "email"
  subject?: string
  body: string
}) {
  const supabase = await createClient()

  const { data: order } = await supabase
    .from("orders")
    .select("telefon, epost")
    .eq("id", opts.orderId)
    .single()

  if (!order) return { error: "Bestilling ikke funnet" }

  const recipient = opts.channel === "sms" ? order.telefon : order.epost
  if (!recipient) {
    return { error: `Bestilling mangler ${opts.channel === "sms" ? "telefonnummer" : "e-post"}` }
  }

  const result = await sendMessageToOrder({
    orderId: opts.orderId,
    channel: opts.channel,
    recipient,
    subject: opts.subject,
    body: opts.body,
  })

  revalidatePath("/admin/orders")
  return result
}

// Kör om automationer och admin-notis för en bestilling
export async function resendOrderNotifications(orderId: string) {
  const { runAutomations } = await import("@/lib/automations")
  const { notifyNewOrder } = await import("@/lib/messaging")

  const results: string[] = []

  try {
    await runAutomations("new_order", orderId)
    results.push("Automasjoner kjørt")
  } catch (err) {
    results.push(`Automasjonsfeil: ${(err as Error).message}`)
  }

  try {
    await notifyNewOrder(orderId)
    results.push("Admin-varsel sendt")
  } catch (err) {
    results.push(`Admin-varselfeil: ${(err as Error).message}`)
  }

  revalidatePath("/admin/orders")
  return { success: true, details: results.join(". ") }
}

// Hent meldingshistorikk for en bestilling
export async function getOrderMessages(orderId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("messages")
    .select("*, message_templates:template_id (name)")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })

  if (error) return { error: "Kunne ikke hente meldinger" }
  return { data: data ?? [] }
}
