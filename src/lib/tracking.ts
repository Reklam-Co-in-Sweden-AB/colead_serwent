import { createAdminClient } from "@/lib/supabase/admin"
import crypto from "crypto"

// ===== META CONVERSIONS API (Server-side) =====

function hashForMeta(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

interface MetaConversionData {
  event_name: "Lead" | "ViewContent"
  email?: string | null
  phone?: string | null
  fbclid?: string | null
  event_source_url?: string
}

export async function sendMetaConversion(data: MetaConversionData) {
  const pixelId = process.env.META_PIXEL_ID
  const accessToken = process.env.META_ACCESS_TOKEN
  if (!pixelId || !accessToken) return

  const userData: Record<string, unknown> = {}
  if (data.email) userData.em = [hashForMeta(data.email)]
  if (data.phone) userData.ph = [hashForMeta(data.phone.replace(/\D/g, ""))]
  if (data.fbclid) userData.fbc = `fb.1.${Date.now()}.${data.fbclid}`

  const eventData: Record<string, unknown> = {
    event_name: data.event_name,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    user_data: userData,
  }

  if (data.event_source_url) {
    eventData.event_source_url = data.event_source_url
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [eventData] }),
      }
    )
    if (!res.ok) {
      console.error("[Meta CAPI]", await res.text())
    }
  } catch (err) {
    console.error("[Meta CAPI] Fetch error:", err)
  }
}

// ===== GOOGLE ADS OFFLINE CONVERSIONS =====

export async function sendGoogleConversion(gclid: string) {
  // Stödjer flera konton: GOOGLE_CONVERSION_ID=AW-111,AW-222
  const ids = (process.env.GOOGLE_CONVERSION_ID || "").split(",").map(s => s.trim()).filter(Boolean)
  const labels = (process.env.GOOGLE_CONVERSION_LABEL || "").split(",").map(s => s.trim()).filter(Boolean)
  if (ids.length === 0 || labels.length === 0 || !gclid) return

  for (let i = 0; i < ids.length; i++) {
    const conversionId = ids[i]
    const conversionLabel = labels[i] || labels[0] // Fallback till första label
    try {
      const params = new URLSearchParams({
        v: "1",
        tid: conversionId,
        cid: "server",
        t: "event",
        ec: "conversion",
        ea: conversionLabel,
        el: gclid,
      })
      await fetch(`https://www.google-analytics.com/collect?${params.toString()}`)
    } catch (err) {
      console.error(`[Google Ads ${conversionId}]`, err)
    }
  }
}

// ===== SPÅRA FORMULÄRVISNING =====

export async function trackFormView(opts: {
  formId?: string
  sessionId?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
  fbclid?: string
  gclid?: string
  userAgent?: string
  ip?: string
}) {
  const supabase = createAdminClient()

  // Hasha IP för integritet
  const ipHash = opts.ip
    ? crypto.createHash("sha256").update(opts.ip).digest("hex").slice(0, 16)
    : null

  await supabase.from("serwent_form_views").insert({
    form_id: opts.formId || null,
    session_id: opts.sessionId || null,
    utm_source: opts.utmSource || null,
    utm_medium: opts.utmMedium || null,
    utm_campaign: opts.utmCampaign || null,
    referrer: opts.referrer || null,
    fbclid: opts.fbclid || null,
    gclid: opts.gclid || null,
    user_agent: opts.userAgent || null,
    ip_hash: ipHash,
  })
}

// ===== SPÅRA KONVERTERING (vid inskickat formulär) =====

export async function trackConversion(opts: {
  orderId: string
  sessionId?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
  fbclid?: string
  gclid?: string
  email?: string
  phone?: string
}) {
  const supabase = createAdminClient()

  // Server-side Meta CAPI
  let metaSent = false
  if (process.env.META_PIXEL_ID) {
    await sendMetaConversion({
      event_name: "Lead",
      email: opts.email,
      phone: opts.phone,
      fbclid: opts.fbclid,
    })
    metaSent = true
  }

  // Google Ads offline conversion
  let googleSent = false
  if (opts.gclid && process.env.GOOGLE_CONVERSION_ID) {
    await sendGoogleConversion(opts.gclid)
    googleSent = true
  }

  // Spara i databasen
  await supabase.from("serwent_conversions").insert({
    order_id: opts.orderId,
    session_id: opts.sessionId || null,
    utm_source: opts.utmSource || null,
    utm_medium: opts.utmMedium || null,
    utm_campaign: opts.utmCampaign || null,
    referrer: opts.referrer || null,
    fbclid: opts.fbclid || null,
    gclid: opts.gclid || null,
    meta_sent: metaSent,
    google_sent: googleSent,
  })
}
