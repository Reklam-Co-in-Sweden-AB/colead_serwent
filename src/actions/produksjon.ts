"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type {
  Produksjon,
  ProduksjonStats,
  ProduksjonUpdate,
  Sone,
  WeekSummary,
  ZoneWeekData,
} from "@/types/produksjon"
import { getCurrentWeek, getISOWeekNumber } from "@/lib/week-utils"

// Normaliserer kommune-input til alltid array. Tom/undefined betyr "alle".
function toKommuneArray(input: string | string[]): string[] {
  return Array.isArray(input) ? input : [input]
}

// Henter utførte bestillinger per uke for gitt kommuner og år.
// Filtrerer bort ordrer som allerede er fanget opp i Comtech-import (matchet
// på gnr+bnr+kommune+uke) for å unngå dobbelt telling.
async function getUtfortBestillingerPerUke(
  kommuner: string[],
  aar: number
): Promise<Map<number, number>> {
  const supabase = await createClient()
  const result = new Map<number, number>()
  if (kommuner.length === 0) return result

  const aarStart = new Date(aar, 0, 1).toISOString()
  const aarSlutt = new Date(aar + 1, 0, 1).toISOString()

  // Hent utførte ordrer i kommunene for året
  const { data: ordrer } = await supabase
    .from("orders")
    .select("id, kommune, gnr, bnr, updated_at, planlagt_dato")
    .in("kommune", kommuner)
    .eq("status", "utfort")
    .gte("updated_at", aarStart)
    .lt("updated_at", aarSlutt)

  if (!ordrer || ordrer.length === 0) return result

  // Hent Comtech-registrerte tømminger i samme periode for overlapp-sjekk
  const { data: komtekRader } = await supabase
    .from("serwent_komtek_tomming")
    .select("kommune, eiendom, adresse, uke")
    .in("kommune", kommuner)
    .eq("aar", aar)

  // Nøkkel: kommune|gnr/bnr|uke — treffer også "eiendom"-feltet som vanligvis er "gnr/bnr"
  const komtekSet = new Set<string>()
  for (const k of komtekRader || []) {
    const row = k as { kommune: string; eiendom: string | null; adresse: string | null; uke: number }
    if (row.eiendom) {
      komtekSet.add(`${row.kommune}|${row.eiendom}|${row.uke}`)
    }
  }

  for (const ord of ordrer as Array<{
    kommune: string
    gnr: string | null
    bnr: string | null
    updated_at: string
    planlagt_dato: string | null
  }>) {
    // Bruk planlagt_dato hvis satt, ellers updated_at (som er når status endret seg)
    const refDato = ord.planlagt_dato || ord.updated_at
    const d = new Date(refDato)
    if (isNaN(d.getTime())) continue
    const uke = getISOWeekNumber(d)

    // Hopp over hvis Comtech allerede har registrert tømming på samme eiendom+uke
    if (ord.gnr && ord.bnr) {
      const key = `${ord.kommune}|${ord.gnr}/${ord.bnr}|${uke}`
      if (komtekSet.has(key)) continue
    }

    result.set(uke, (result.get(uke) || 0) + 1)
  }

  return result
}

export async function getProduksjon(
  kommune: string | string[],
  aar: number
): Promise<Produksjon[]> {
  const supabase = await createClient()
  const kommuner = toKommuneArray(kommune)

  const { data, error } = await supabase
    .from("serwent_produksjon")
    .select("*, serwent_soner!inner(kommune)")
    .in("serwent_soner.kommune", kommuner)
    .eq("aar", aar)

  if (error) {
    console.error("[getProduksjon] Error:", error)
    return []
  }

  return (data as Produksjon[]) || []
}

export async function getProduksjonStats(
  kommune: string | string[],
  aar: number
): Promise<ProduksjonStats> {
  const supabase = await createClient()
  const currentWeek = getCurrentWeek()
  const kommuner = toKommuneArray(kommune)

  // Hämta publicerad ruteplan (planerade tömningar)
  const { data: ruteplan } = await supabase
    .from("serwent_ruteplan")
    .select("uke, planlagt, serwent_soner!inner(kommune)")
    .in("serwent_soner.kommune", kommuner)
    .eq("aar", aar)

  // Hämta produksjonsdata (utförda tömningar)
  const { data: produksjon } = await supabase
    .from("serwent_produksjon")
    .select("uke, kjort_rute, kjort_best, serwent_soner!inner(kommune)")
    .in("serwent_soner.kommune", kommuner)
    .eq("aar", aar)

  const totalPlanlagt = (ruteplan || []).reduce(
    (sum: number, r: { planlagt: number }) => sum + r.planlagt,
    0
  )

  const planlagtTomUke = (ruteplan || [])
    .filter((r: { uke: number }) => r.uke <= currentWeek)
    .reduce((sum: number, r: { planlagt: number }) => sum + r.planlagt, 0)

  const totalKjort = (produksjon || []).reduce(
    (sum: number, p: { kjort_rute: number }) => sum + p.kjort_rute,
    0
  )

  const totalBestillingKomtek = (produksjon || []).reduce(
    (sum: number, p: { kjort_best: number }) => sum + p.kjort_best,
    0
  )

  // Legg til utførte ordrer som ikke allerede er i Comtech-importen
  const ordreBestilling = await getUtfortBestillingerPerUke(kommuner, aar)
  const totalBestillingOrdre = Array.from(ordreBestilling.values()).reduce(
    (sum, v) => sum + v,
    0
  )
  const totalBestilling = totalBestillingKomtek + totalBestillingOrdre

  const restanse = Math.max(0, planlagtTomUke - totalKjort)

  return { totalPlanlagt, totalKjort, totalBestilling, restanse }
}

export async function getWeekSummaries(
  kommune: string | string[],
  aar: number
): Promise<WeekSummary[]> {
  const supabase = await createClient()
  const kommuner = toKommuneArray(kommune)

  // Hämta ruteplan och produksjon för alla veckor
  const { data: ruteplan } = await supabase
    .from("serwent_ruteplan")
    .select("uke, planlagt, serwent_soner!inner(kommune)")
    .in("serwent_soner.kommune", kommuner)
    .eq("aar", aar)

  const { data: produksjon } = await supabase
    .from("serwent_produksjon")
    .select("uke, kjort_rute, kjort_best, serwent_soner!inner(kommune)")
    .in("serwent_soner.kommune", kommuner)
    .eq("aar", aar)

  // Aggregera per vecka
  const weekMap = new Map<number, WeekSummary>()

  for (const r of ruteplan || []) {
    const entry = weekMap.get(r.uke) || { uke: r.uke, planlagt: 0, kjort_rute: 0, kjort_best: 0, restanse: 0 }
    entry.planlagt += r.planlagt
    weekMap.set(r.uke, entry)
  }

  for (const p of produksjon || []) {
    const entry = weekMap.get(p.uke) || { uke: p.uke, planlagt: 0, kjort_rute: 0, kjort_best: 0, restanse: 0 }
    entry.kjort_rute += p.kjort_rute
    entry.kjort_best += p.kjort_best
    weekMap.set(p.uke, entry)
  }

  // Legg til utførte ordrer som ikke allerede er i Comtech-data
  const ordreBestilling = await getUtfortBestillingerPerUke(kommuner, aar)
  for (const [uke, antall] of ordreBestilling) {
    const entry = weekMap.get(uke) || { uke, planlagt: 0, kjort_rute: 0, kjort_best: 0, restanse: 0 }
    entry.kjort_best += antall
    weekMap.set(uke, entry)
  }

  // Beräkna restanse
  for (const entry of weekMap.values()) {
    entry.restanse = Math.max(0, entry.planlagt - entry.kjort_rute)
  }

  return Array.from(weekMap.values()).sort((a, b) => a.uke - b.uke)
}

export async function getZoneWeekData(
  kommune: string | string[],
  aar: number,
  uke: number
): Promise<ZoneWeekData[]> {
  const supabase = await createClient()
  const kommuner = toKommuneArray(kommune)

  // Hämta soner
  const { data: soner } = await supabase
    .from("serwent_soner")
    .select("*")
    .in("kommune", kommuner)
    .eq("aktiv", true)
    .order("kommune", { ascending: true })
    .order("sort_order", { ascending: true })

  if (!soner || soner.length === 0) return []

  const soneIds = soner.map((s: { id: string }) => s.id)

  // Hämta planerade data för denna vecka (både Utkast och Publisert — Gantt visar
  // dem likadant och kunden förväntar sig samma siffror i dashboard)
  const { data: plan } = await supabase
    .from("serwent_ruteplan")
    .select("sone_id, planlagt")
    .in("sone_id", soneIds)
    .eq("aar", aar)
    .eq("uke", uke)

  // Hämta produksjonsdata för denna vecka
  const { data: prod } = await supabase
    .from("serwent_produksjon")
    .select("sone_id, kjort_rute, kjort_best")
    .in("sone_id", soneIds)
    .eq("aar", aar)
    .eq("uke", uke)

  const planMap = new Map((plan || []).map((p: { sone_id: string; planlagt: number }) => [p.sone_id, p.planlagt]))
  const prodMap = new Map((prod || []).map((p: { sone_id: string; kjort_rute: number; kjort_best: number }) => [p.sone_id, p]))

  return (soner as Sone[]).map((sone) => {
    const prodEntry = prodMap.get(sone.id) as { kjort_rute: number; kjort_best: number } | undefined
    return {
      sone,
      planlagt: (planMap.get(sone.id) as number) || 0,
      kjort_rute: prodEntry?.kjort_rute || 0,
      kjort_best: prodEntry?.kjort_best || 0,
    }
  })
}

export async function saveProduksjon(updates: ProduksjonUpdate[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const rows = updates.map((u) => ({
    sone_id: u.sone_id,
    aar: u.aar,
    uke: u.uke,
    kjort_rute: u.kjort_rute,
    kjort_best: u.kjort_best,
    registrert_av: user?.email ?? null,
    oppdatert: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from("serwent_produksjon")
    .upsert(rows, { onConflict: "sone_id,aar,uke" })

  if (error) {
    console.error("[saveProduksjon] Error:", error)
    return { error: "Kunne ikke lagre produksjonsdata" }
  }

  revalidatePath("/admin/produksjon")
  return { success: true }
}

export async function getActiveWeeks(
  kommune: string | string[],
  aar: number
): Promise<{ uke: number; hasBestilling: boolean; totalBestilling: number }[]> {
  const supabase = await createClient()
  const kommuner = toKommuneArray(kommune)

  // Hämta alla veckor som har publicerad plan
  const { data: planWeeks } = await supabase
    .from("serwent_ruteplan")
    .select("uke, serwent_soner!inner(kommune)")
    .in("serwent_soner.kommune", kommuner)
    .eq("aar", aar)

  // Hämta bestillingstømminger per vecka
  const { data: bestWeeks } = await supabase
    .from("serwent_produksjon")
    .select("uke, kjort_best, serwent_soner!inner(kommune)")
    .in("serwent_soner.kommune", kommuner)
    .eq("aar", aar)

  const weekSet = new Set((planWeeks || []).map((w: { uke: number }) => w.uke))

  // Aggregera bestillingar och rute per vecka — inkludera veckor med produksjonsdata
  const bestMap = new Map<number, number>()
  for (const b of bestWeeks || []) {
    bestMap.set(b.uke, (bestMap.get(b.uke) || 0) + b.kjort_best)
    // Lägg till veckor som har produksjonsdata även utan plan
    weekSet.add(b.uke)
  }

  // Legg til utførte ordrer per uke (deduppet mot Comtech)
  const ordreBestilling = await getUtfortBestillingerPerUke(kommuner, aar)
  for (const [uke, antall] of ordreBestilling) {
    bestMap.set(uke, (bestMap.get(uke) || 0) + antall)
    weekSet.add(uke)
  }

  return Array.from(weekSet)
    .sort((a, b) => a - b)
    .map((uke) => ({
      uke,
      hasBestilling: (bestMap.get(uke) || 0) > 0,
      totalBestilling: bestMap.get(uke) || 0,
    }))
}
