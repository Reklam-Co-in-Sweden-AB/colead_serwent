/**
 * Engångsskript: rensar all ruteplan-data för Gjøvik 2025 (seed-testdata).
 * Kör: npx tsx scripts/clear-gjovik-2025.ts [--confirm]
 *
 * Utan --confirm visas bara antalet rader som skulle raderas.
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"

// Läs .env.local manuellt (slipper dotenv-dependency)
try {
  const env = readFileSync(".env.local", "utf-8")
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  }
} catch {
  // ignorera om filen saknas — env kan finnas i shell istället
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Saknar NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i .env.local")
  process.exit(1)
}

const KOMMUNE = "Gjøvik"
const AAR = 2025
const confirm = process.argv.includes("--confirm")

const supabase = createClient(url, key)

async function main() {
  const { data: soner, error: sonerErr } = await supabase
    .from("serwent_soner")
    .select("id, navn")
    .eq("kommune", KOMMUNE)

  if (sonerErr || !soner) {
    console.error("Kunde inte hämta soner:", sonerErr)
    process.exit(1)
  }

  const soneIds = soner.map((s) => s.id)
  console.log(`Hittade ${soner.length} soner för ${KOMMUNE}.`)

  const { count, error: countErr } = await supabase
    .from("serwent_ruteplan")
    .select("*", { count: "exact", head: true })
    .in("sone_id", soneIds)
    .eq("aar", AAR)

  if (countErr) {
    console.error("Kunde inte räkna rader:", countErr)
    process.exit(1)
  }

  console.log(`${count ?? 0} ruteplan-rader för ${KOMMUNE} ${AAR} skulle raderas.`)

  if (!confirm) {
    console.log("\nKör med --confirm för att radera dem.")
    return
  }

  const { error: delErr, count: delCount } = await supabase
    .from("serwent_ruteplan")
    .delete({ count: "exact" })
    .in("sone_id", soneIds)
    .eq("aar", AAR)

  if (delErr) {
    console.error("Sletting misslyckades:", delErr)
    process.exit(1)
  }

  console.log(`✓ Raderade ${delCount ?? 0} rader.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
