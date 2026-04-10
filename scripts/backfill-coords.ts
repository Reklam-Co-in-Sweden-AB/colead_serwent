/**
 * Backfill-script — geocodar gamla orders via Kartverket.
 * Kör: npx tsx scripts/backfill-coords.ts
 */

import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL("https://ws.geonorge.no/adresser/v1/sok")
    url.searchParams.set("sok", address)
    url.searchParams.set("treffPerSide", "1")
    url.searchParams.set("utkoordsys", "4258")

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null
    const data = await res.json()
    const hit = data.adresser?.[0]
    if (!hit?.representasjonspunkt) return null

    return {
      lat: hit.representasjonspunkt.lat,
      lng: hit.representasjonspunkt.lon,
    }
  } catch {
    return null
  }
}

async function main() {
  // Hämta alla orders utan koordinater som har adress
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, adresse")
    .is("lat", null)
    .not("adresse", "is", null)
    .not("adresse", "eq", "")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Fel vid hämtning:", error.message)
    process.exit(1)
  }

  console.log(`${orders.length} orders att geocoda\n`)

  let updated = 0
  let failed = 0

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i]

    // Rate limit — max 10 req/s mot Kartverket
    if (i > 0 && i % 10 === 0) {
      await new Promise(r => setTimeout(r, 1100))
    }

    const coords = await geocode(order.adresse)

    if (coords) {
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("id", order.id)

      if (updateErr) {
        failed++
      } else {
        updated++
      }
    } else {
      failed++
    }

    // Visa progress var 50:e
    if ((i + 1) % 50 === 0 || i === orders.length - 1) {
      console.log(`  ${i + 1}/${orders.length} — ${updated} uppdaterade, ${failed} missade`)
    }
  }

  console.log(`\nKlart! ${updated} geocodade, ${failed} missade av ${orders.length} totalt.`)
}

main()
