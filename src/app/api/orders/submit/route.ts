import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { syncToCoLead } from "@/lib/colead"
import { rateLimit } from "@/lib/rate-limit"
import { runAutomations } from "@/lib/automations"
import { notifyNewOrder } from "@/lib/messaging"
import { trackConversion } from "@/lib/tracking"
import { normalizeAnleggsType } from "@/lib/anleggstype"

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

    // Detekter ekstratømming: hvis samme eiendom (gnr/bnr+kommune) OG SAMME
    // anleggstype har fått tømming tidligere samme år, markeres ordren automatisk
    // som ekstra. Matchningen tar hensyn til anleggstype for å unngå at f.eks.
    // en Lukket tank-bestilling felaktig markeres som ekstra etter en Slamavskiller-
    // tømming på samme adresse (det er to separate anlegg).
    let erEkstra = false
    let ekstraGrunn: string | null = null

    const trimmedType = (tomming_type || "").trim()
    const typeStr = trimmedType.toLowerCase()
    const nyAnleggsGruppe = normalizeAnleggsType(trimmedType)

    if (typeStr.includes("ekstra") || typeStr.includes("nødtømming")) {
      erEkstra = true
      ekstraGrunn = "Valgt type er ekstratømming"
    } else {
      const aarStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
      const trimmedKommune = kommune?.trim() || ""
      const trimmedGnr = gnr?.trim() || ""
      const trimmedBnr = bnr?.trim() || ""
      const trimmedAdresse = adresse?.trim() || ""

      if (trimmedGnr && trimmedBnr && trimmedKommune) {
        // Hent alle tidligere ordrer på samme eiendom samme år — filtrer på
        // anleggsgruppe i koden siden Postgres ikke kan normalisere fritekst
        const { data: tidligereOrdre } = await supabase
          .from("orders")
          .select("id, created_at, tomming_type")
          .eq("kommune", trimmedKommune)
          .eq("gnr", trimmedGnr)
          .eq("bnr", trimmedBnr)
          .gte("created_at", aarStart)

        const sammeGruppeOrdre = (tidligereOrdre || []).filter(
          (o: { tomming_type: string | null }) =>
            normalizeAnleggsType(o.tomming_type) === nyAnleggsGruppe
        )

        if (sammeGruppeOrdre.length > 0) {
          erEkstra = true
          ekstraGrunn = `Tidligere ${sammeGruppeOrdre.length} bestilling(er) på samme anlegg dette året`
        } else {
          // Sjekk Comtech-importerte tømminger på samme adresse + samme anleggstype
          const { data: tidligereKomtek } = await supabase
            .from("serwent_komtek_tomming")
            .select("id, anleggstype, type_tomming")
            .eq("kommune", trimmedKommune)
            .eq("aar", new Date().getFullYear())
            .or(
              trimmedAdresse
                ? `adresse.eq.${trimmedAdresse},eiendom.eq.${trimmedGnr}/${trimmedBnr}`
                : `eiendom.eq.${trimmedGnr}/${trimmedBnr}`
            )

          const sammeGruppeKomtek = (tidligereKomtek || []).filter(
            (k: { anleggstype: string | null; type_tomming: string | null }) => {
              const gruppe = normalizeAnleggsType(k.anleggstype || k.type_tomming)
              return gruppe === nyAnleggsGruppe
            }
          )

          if (sammeGruppeKomtek.length > 0) {
            erEkstra = true
            ekstraGrunn = "Tidligere registrert tømming på samme anlegg i Comtech"
          }
        }
      }
    }

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
      er_ekstra: erEkstra,
      ekstra_grunn: ekstraGrunn,
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
