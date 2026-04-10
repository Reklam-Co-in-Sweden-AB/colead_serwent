import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { syncToCoLead } from "@/lib/colead"
import { rateLimit } from "@/lib/rate-limit"
import { runAutomations } from "@/lib/automations"
import { notifyNewOrder } from "@/lib/messaging"
import { trackConversion } from "@/lib/tracking"

function generateOrderId(): string {
  return (
    "BES-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).substring(2, 5).toUpperCase()
  )
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 orders per IP per minute
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const { success: withinLimit } = rateLimit(`order:${ip}`, 10)
    if (!withinLimit) {
      return NextResponse.json(
        { error: "For mange bestillinger. Prøv igjen om litt." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const {
      kommune, tomming_type, navn, epost, telefon,
      adresse, gnr, bnr, kommentar, tank_storrelse_m3,
      form_id,
      // Koordinater
      lat, lng,
      // Tracking-data
      session_id, utm_source, utm_medium, utm_campaign,
      referrer, fbclid, gclid,
    } = body

    // Validate core fields (mapped from dynamic form or hardcoded)
    const errors: Record<string, string> = {}
    if (!navn?.trim()) errors.navn = "Navn er påkrevd"
    if (!epost?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.epost = "Ugyldig e-post"
    if (!telefon?.trim()) errors.telefon = "Telefon er påkrevd"

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Valideringsfeil", errors }, { status: 400 })
    }

    const orderId = generateOrderId()
    const supabase = createAdminClient()

    // Insert order
    const insertData: Record<string, unknown> = {
      order_id: orderId,
      kommune: kommune?.trim() || "",
      tomming_type: tomming_type?.trim() || "",
      navn: navn.trim(),
      epost: epost.trim().toLowerCase(),
      telefon: telefon.trim(),
      adresse: adresse?.trim() || "",
      gnr: gnr?.trim() || "",
      bnr: bnr?.trim() || "",
      kommentar: kommentar?.trim() || null,
      tank_storrelse_m3: tank_storrelse_m3 ? parseFloat(tank_storrelse_m3) : null,
      status: "ny",
      lat: lat || null,
      lng: lng || null,
    }

    if (form_id) {
      insertData.form_id = form_id
    }

    const { data: order, error: insertError } = await supabase
      .from("orders")
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error("[Submit] Insert error:", insertError)
      return NextResponse.json(
        { error: "Kunne ikke lagre bestillingen" },
        { status: 500 }
      )
    }

    // Vänta på sidoeffekter innan svaret skickas (krävs på Vercel serverless)
    await Promise.allSettled([
      trackConversion({
        orderId,
        sessionId: session_id,
        utmSource: utm_source,
        utmMedium: utm_medium,
        utmCampaign: utm_campaign,
        referrer,
        fbclid,
        gclid,
        email: epost?.trim()?.toLowerCase(),
        phone: telefon?.trim(),
      }),
      syncToCoLead({
        kommune: kommune?.trim() || "",
        tomming_type: tomming_type?.trim() || "",
        navn: navn.trim(),
        epost: epost.trim().toLowerCase(),
        telefon: telefon.trim(),
        adresse: adresse?.trim() || "",
        gnr: gnr?.trim() || "",
        bnr: bnr?.trim() || "",
        kommentar: kommentar?.trim() || null,
        tank_storrelse_m3: tank_storrelse_m3 ? parseFloat(tank_storrelse_m3) : null,
        order_id: orderId,
      }).then(async (result) => {
        if (result.success && result.lead_id) {
          await supabase
            .from("orders")
            .update({ colead_synced: true, colead_lead_id: result.lead_id })
            .eq("id", order.id)
        }
      }),
      runAutomations("new_order", order.id),
      notifyNewOrder(order.id),
    ]).then((results) => {
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          const labels = ["Konvertering", "CoLead", "Automationer", "Admin-varsel"]
          console.error(`[Submit] ${labels[i]} feilet:`, r.reason)
        }
      })
    })

    return NextResponse.json({
      success: true,
      order_id: orderId,
      epost: epost.trim().toLowerCase(),
    })
  } catch (error) {
    console.error("[Submit] Unexpected error:", error)
    return NextResponse.json(
      { error: "En uventet feil oppstod" },
      { status: 500 }
    )
  }
}
