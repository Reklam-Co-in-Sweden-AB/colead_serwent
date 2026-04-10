import { NextRequest, NextResponse } from "next/server"
import { trackFormView } from "@/lib/tracking"
import { rateLimit } from "@/lib/rate-limit"

// Spårar formulärvisningar — anropas från klienten vid laddning
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

  // Rate limit: 30 visningar per IP per minut
  const { success } = rateLimit(`view:${ip}`, 30)
  if (!success) {
    return NextResponse.json({ ok: true }) // Tyst ignorera
  }

  try {
    const body = await request.json()

    await trackFormView({
      formId: body.form_id,
      sessionId: body.session_id,
      utmSource: body.utm_source,
      utmMedium: body.utm_medium,
      utmCampaign: body.utm_campaign,
      referrer: body.referrer,
      fbclid: body.fbclid,
      gclid: body.gclid,
      userAgent: request.headers.get("user-agent") || undefined,
      ip,
    })
  } catch {
    // Ignorera fel — spårning ska aldrig blockera användaren
  }

  return NextResponse.json({ ok: true })
}
