"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type {
  Produksjon,
  ProduksjonStats,
  ProduksjonUpdate,
  WeekSummary,
  ZoneWeekData,
} from "@/types/produksjon"
import { getCurrentWeek } from "@/lib/week-utils"

export async function getProduksjon(kommune: string, aar: number): Promise<Produksjon[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("serwent_produksjon")
    .select("*, serwent_soner!inner(kommune)")
    .eq("serwent_soner.kommune", kommune)
    .eq("aar", aar)

  if (error) {
    console.error("[getProduksjon] Error:", error)
    return []
  }

  return (data as Produksjon[]) || []
}

export async function getProduksjonStats(
  kommune: string,
  aar: number
): Promise<ProduksjonStats> {
  const supabase = await createClient()
  const currentWeek = getCurrentWeek()

  // Hämta publicerad ruteplan (planerade tömningar)
  const { data: ruteplan } = await supabase
    .from("serwent_ruteplan")
    .select("uke, planlagt, serwent_soner!inner(kommune)")
    .eq("serwent_soner.kommune", kommune)
    .eq("aar", aar)

  // Hämta produksjonsdata (utförda tömningar)
  const { data: produksjon } = await supabase
    .from("serwent_produksjon")
    .select("uke, kjort_rute, kjort_best, serwent_soner!inner(kommune)")
    .eq("serwent_soner.kommune", kommune)
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

  const totalBestilling = (produksjon || []).reduce(
    (sum: number, p: { kjort_best: number }) => sum + p.kjort_best,
    0
  )

  const restanse = Math.max(0, planlagtTomUke - totalKjort)

  return { totalPlanlagt, totalKjort, totalBestilling, restanse }
}

export async function getWeekSummaries(
  kommune: string,
  aar: number
): Promise<WeekSummary[]> {
  const supabase = await createClient()

  // Hämta ruteplan och produksjon för alla veckor
  const { data: ruteplan } = await supabase
    .from("serwent_ruteplan")
    .select("uke, planlagt, serwent_soner!inner(kommune)")
    .eq("serwent_soner.kommune", kommune)
    .eq("aar", aar)

  const { data: produksjon } = await supabase
    .from("serwent_produksjon")
    .select("uke, kjort_rute, kjort_best, serwent_soner!inner(kommune)")
    .eq("serwent_soner.kommune", kommune)
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

  // Beräkna restanse
  for (const entry of weekMap.values()) {
    entry.restanse = Math.max(0, entry.planlagt - entry.kjort_rute)
  }

  return Array.from(weekMap.values()).sort((a, b) => a.uke - b.uke)
}

export async function getZoneWeekData(
  kommune: string,
  aar: number,
  uke: number
): Promise<ZoneWeekData[]> {
  const supabase = await createClient()

  // Hämta soner
  const { data: soner } = await supabase
    .from("serwent_soner")
    .select("*")
    .eq("kommune", kommune)
    .eq("aktiv", true)
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

  return soner.map((sone: { id: string; kommune: string; navn: string; farge: string; sort_order: number; aktiv: boolean; created_at: string }) => {
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
  kommune: string,
  aar: number
): Promise<{ uke: number; hasBestilling: boolean; totalBestilling: number }[]> {
  const supabase = await createClient()

  // Hämta alla veckor som har publicerad plan
  const { data: planWeeks } = await supabase
    .from("serwent_ruteplan")
    .select("uke, serwent_soner!inner(kommune)")
    .eq("serwent_soner.kommune", kommune)
    .eq("aar", aar)

  // Hämta bestillingstømminger per vecka
  const { data: bestWeeks } = await supabase
    .from("serwent_produksjon")
    .select("uke, kjort_best, serwent_soner!inner(kommune)")
    .eq("serwent_soner.kommune", kommune)
    .eq("aar", aar)

  const weekSet = new Set((planWeeks || []).map((w: { uke: number }) => w.uke))

  // Aggregera bestillingar och rute per vecka — inkludera veckor med produksjonsdata
  const bestMap = new Map<number, number>()
  for (const b of bestWeeks || []) {
    bestMap.set(b.uke, (bestMap.get(b.uke) || 0) + b.kjort_best)
    // Lägg till veckor som har produksjonsdata även utan plan
    weekSet.add(b.uke)
  }

  return Array.from(weekSet)
    .sort((a, b) => a - b)
    .map((uke) => ({
      uke,
      hasBestilling: (bestMap.get(uke) || 0) > 0,
      totalBestilling: bestMap.get(uke) || 0,
    }))
}
