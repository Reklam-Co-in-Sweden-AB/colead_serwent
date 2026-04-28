"use server"

import { createClient } from "@/lib/supabase/server"
import { klassifiser, type Zone } from "@/lib/ressurs-benchmarks"

export interface RessursStats {
  navn: string
  antall: number
  totalVolum: number
  dager: number
  perDag: number
  kubikPerDag: number
  zone: Zone
  dagligt: Array<{ dato: string; antall: number; volum: number }>
  perKommune: Array<{ kommune: string; antall: number; volum: number }>
}

interface Query {
  kommuner?: string[]
  aar: number
  fra?: string // ISO-dato
  til?: string // ISO-dato
}

async function hentTomminger(q: Query) {
  const supabase = await createClient()
  let query = supabase
    .from("serwent_komtek_tomming")
    .select("tomme_dato, tomme_volum, tommer, bil, kommune, aar")
    .eq("aar", q.aar)

  if (q.kommuner && q.kommuner.length > 0) {
    query = query.in("kommune", q.kommuner)
  }
  if (q.fra) query = query.gte("tomme_dato", q.fra)
  if (q.til) query = query.lte("tomme_dato", q.til)

  const { data, error } = await query
  if (error) {
    console.error("[hentTomminger] Error:", error)
    return []
  }
  return (data || []) as Array<{
    tomme_dato: string
    tomme_volum: number | null
    tommer: string | null
    bil: string | null
    kommune: string
  }>
}

function aggreger(
  rader: Array<{
    tomme_dato: string
    tomme_volum: number | null
    tommer: string | null
    bil: string | null
    kommune: string
  }>,
  felt: "bil" | "tommer"
): RessursStats[] {
  const bucket = new Map<
    string,
    Map<string, { antall: number; volum: number }>
  >()
  // Parallell map för per-kommune-aggregat per navn
  const kommuneBucket = new Map<string, Map<string, { antall: number; volum: number }>>()

  for (const r of rader) {
    const navn = (r[felt] || "").trim()
    if (!navn) continue

    const d = new Date(r.tomme_dato)
    if (isNaN(d.getTime())) continue
    const dato = d.toISOString().slice(0, 10)

    if (!bucket.has(navn)) bucket.set(navn, new Map())
    const dagMap = bucket.get(navn)!

    // Aggregera per kommune också
    if (!kommuneBucket.has(navn)) kommuneBucket.set(navn, new Map())
    const kMap = kommuneBucket.get(navn)!
    const kommune = r.kommune || "(ukjent)"
    const kPrev = kMap.get(kommune) || { antall: 0, volum: 0 }
    kPrev.antall += 1
    kPrev.volum += r.tomme_volum || 0
    kMap.set(kommune, kPrev)
    const prev = dagMap.get(dato) || { antall: 0, volum: 0 }
    prev.antall += 1
    prev.volum += r.tomme_volum || 0
    dagMap.set(dato, prev)
  }

  const result: RessursStats[] = []
  for (const [navn, dagMap] of bucket) {
    const dagligt = Array.from(dagMap.entries())
      .map(([dato, v]) => ({ dato, ...v }))
      .sort((a, b) => a.dato.localeCompare(b.dato))

    const dager = dagligt.length
    const antall = dagligt.reduce((s, d) => s + d.antall, 0)
    const totalVolum = dagligt.reduce((s, d) => s + d.volum, 0)
    const perDag = dager > 0 ? antall / dager : 0
    const kubikPerDag = dager > 0 ? totalVolum / dager : 0

    const kMap = kommuneBucket.get(navn) || new Map()
    const perKommune = Array.from(kMap.entries())
      .map(([kommune, v]) => ({ kommune, ...v }))
      .sort((a, b) => b.antall - a.antall)

    result.push({
      navn,
      antall,
      totalVolum,
      dager,
      perDag,
      kubikPerDag,
      zone: klassifiser(perDag, kubikPerDag),
      dagligt,
      perKommune,
    })
  }

  // Sorter: grønn først, deretter gul, så rød; sekundært på antall fallende
  const zoneRank: Record<Zone, number> = { green: 0, yellow: 1, red: 2 }
  result.sort((a, b) => {
    if (a.zone !== b.zone) return zoneRank[a.zone] - zoneRank[b.zone]
    return b.antall - a.antall
  })

  return result
}

export async function getRessursStats(q: Query): Promise<{
  perBil: RessursStats[]
  perOperator: RessursStats[]
  periode: { fra: string | null; til: string | null; antallDager: number }
}> {
  const rader = await hentTomminger(q)

  // Periode-info for visning
  const datoer = rader
    .map((r) => new Date(r.tomme_dato))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  const fra = datoer.length > 0 ? datoer[0].toISOString().slice(0, 10) : null
  const til =
    datoer.length > 0
      ? datoer[datoer.length - 1].toISOString().slice(0, 10)
      : null
  const unikeDager = new Set(
    datoer.map((d) => d.toISOString().slice(0, 10))
  ).size

  return {
    perBil: aggreger(rader, "bil"),
    perOperator: aggreger(rader, "tommer"),
    periode: { fra, til, antallDager: unikeDager },
  }
}
