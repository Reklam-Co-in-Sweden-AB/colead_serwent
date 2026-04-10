import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const kommune = searchParams.get("kommune")
  const aar = searchParams.get("aar")

  if (!kommune || !aar) {
    return NextResponse.json(
      { error: "Mangler kommune eller aar parameter" },
      { status: 400 }
    )
  }

  const year = parseInt(aar, 10)
  const supabase = createAdminClient()

  // Hämta soner för kommunen
  const { data: soner } = await supabase
    .from("serwent_soner")
    .select("*")
    .eq("kommune", kommune)
    .eq("aktiv", true)
    .order("sort_order", { ascending: true })

  if (!soner || soner.length === 0) {
    return NextResponse.json({ error: "Ingen soner funnet" }, { status: 404 })
  }

  const soneIds = soner.map((s: { id: string }) => s.id)
  const soneMap = new Map(soner.map((s: { id: string; navn: string }) => [s.id, s.navn]))

  // Hämta ruteplan och produksjon
  const { data: ruteplan } = await supabase
    .from("serwent_ruteplan")
    .select("sone_id, uke, planlagt")
    .in("sone_id", soneIds)
    .eq("aar", year)
    .eq("status", "Publisert")

  const { data: produksjon } = await supabase
    .from("serwent_produksjon")
    .select("sone_id, uke, kjort_rute, kjort_best")
    .in("sone_id", soneIds)
    .eq("aar", year)

  // Bygg CSV-rader
  const headers = [
    "Uke",
    "Sone",
    "Planlagt",
    "Kjort rute",
    "Bestillingstomminger",
    "Fullforingsgrad (%)",
    "Restanse",
  ]

  // Skapa en map med all data: key = "sone_id:uke"
  const dataMap = new Map<string, { planlagt: number; kjort_rute: number; kjort_best: number }>()

  for (const r of ruteplan || []) {
    const key = `${r.sone_id}:${r.uke}`
    const entry = dataMap.get(key) || { planlagt: 0, kjort_rute: 0, kjort_best: 0 }
    entry.planlagt = r.planlagt
    dataMap.set(key, entry)
  }

  for (const p of produksjon || []) {
    const key = `${p.sone_id}:${p.uke}`
    const entry = dataMap.get(key) || { planlagt: 0, kjort_rute: 0, kjort_best: 0 }
    entry.kjort_rute = p.kjort_rute
    entry.kjort_best = p.kjort_best
    dataMap.set(key, entry)
  }

  // Sortera efter vecka och sone
  const rows: string[][] = []
  const allWeeks = [...new Set(Array.from(dataMap.keys()).map((k) => parseInt(k.split(":")[1])))].sort((a, b) => a - b)

  for (const uke of allWeeks) {
    for (const soneId of soneIds) {
      const key = `${soneId}:${uke}`
      const entry = dataMap.get(key)
      if (!entry) continue

      const fullforingsgrad = entry.planlagt > 0
        ? Math.round((entry.kjort_rute / entry.planlagt) * 100)
        : entry.kjort_rute > 0
          ? 100
          : 0

      const restanse = Math.max(0, entry.planlagt - entry.kjort_rute)

      rows.push([
        String(uke),
        soneMap.get(soneId) as string || "Ukjent",
        String(entry.planlagt),
        String(entry.kjort_rute),
        String(entry.kjort_best),
        String(fullforingsgrad),
        String(restanse),
      ])
    }
  }

  // Bygg CSV-sträng
  const escapeCSV = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const csvLines = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ]
  const csv = csvLines.join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produksjon_${kommune}_${year}.csv"`,
    },
  })
}
