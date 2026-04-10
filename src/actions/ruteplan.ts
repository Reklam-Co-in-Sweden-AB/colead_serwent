"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Ruteplan } from "@/types/produksjon"

export async function getRuteplan(kommune: string, aar: number): Promise<Ruteplan[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("serwent_ruteplan")
    .select("*, serwent_soner!inner(kommune)")
    .eq("serwent_soner.kommune", kommune)
    .eq("aar", aar)
    .order("uke", { ascending: true })

  if (error) {
    console.error("[getRuteplan] Error:", error)
    return []
  }

  return (data as Ruteplan[]) || []
}

export async function getPublishedRuteplan(kommune: string, aar: number): Promise<Ruteplan[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("serwent_ruteplan")
    .select("*, serwent_soner!inner(kommune)")
    .eq("serwent_soner.kommune", kommune)
    .eq("aar", aar)
    .eq("status", "Publisert")
    .order("uke", { ascending: true })

  if (error) {
    console.error("[getPublishedRuteplan] Error:", error)
    return []
  }

  return (data as Ruteplan[]) || []
}

export async function upsertRuteplanWeek(
  soneId: string,
  aar: number,
  uke: number,
  planlagt: number
) {
  const supabase = await createClient()

  if (planlagt <= 0) {
    // Ta bort raden om planlagt = 0
    const { error } = await supabase
      .from("serwent_ruteplan")
      .delete()
      .eq("sone_id", soneId)
      .eq("aar", aar)
      .eq("uke", uke)

    if (error) {
      console.error("[upsertRuteplanWeek] Delete error:", error)
      return { error: "Kunne ikke fjerne planlagt uke" }
    }
  } else {
    const { error } = await supabase
      .from("serwent_ruteplan")
      .upsert(
        { sone_id: soneId, aar, uke, planlagt, status: "Utkast" },
        { onConflict: "sone_id,aar,uke" }
      )

    if (error) {
      console.error("[upsertRuteplanWeek] Upsert error:", error)
      return { error: "Kunne ikke oppdatere ruteplan" }
    }
  }

  revalidatePath("/admin/ruteplan")
  return { success: true }
}

export async function publishRuteplan(kommune: string, aar: number) {
  const supabase = await createClient()

  // Hämta alla sone-IDs för kommunen
  const { data: soner } = await supabase
    .from("serwent_soner")
    .select("id")
    .eq("kommune", kommune)
    .eq("aktiv", true)

  if (!soner || soner.length === 0) {
    return { error: "Ingen soner funnet for kommunen" }
  }

  const soneIds = soner.map((s: { id: string }) => s.id)

  const { error } = await supabase
    .from("serwent_ruteplan")
    .update({ status: "Publisert" })
    .in("sone_id", soneIds)
    .eq("aar", aar)

  if (error) {
    console.error("[publishRuteplan] Error:", error)
    return { error: "Kunne ikke publisere ruteplan" }
  }

  revalidatePath("/admin/ruteplan")
  revalidatePath("/admin/produksjon")
  return { success: true }
}

export async function copyPreviousYear(
  kommune: string,
  fromAar: number,
  toAar: number,
  kapasitet?: number
) {
  const supabase = await createClient()

  // Hämta föregående års plan
  const { data: prevPlan } = await supabase
    .from("serwent_ruteplan")
    .select("sone_id, uke, planlagt, serwent_soner!inner(kommune)")
    .eq("serwent_soner.kommune", kommune)
    .eq("aar", fromAar)

  if (!prevPlan || prevPlan.length === 0) {
    return { error: "Ingen plan funnet for forrige år" }
  }

  // Skapa nya rader för det nya året
  const newRows = prevPlan.map((row: { sone_id: string; uke: number; planlagt: number }) => ({
    sone_id: row.sone_id,
    aar: toAar,
    uke: row.uke,
    planlagt: kapasitet ?? row.planlagt,
    status: "Utkast" as const,
  }))

  const { error } = await supabase
    .from("serwent_ruteplan")
    .upsert(newRows, { onConflict: "sone_id,aar,uke" })

  if (error) {
    console.error("[copyPreviousYear] Error:", error)
    return { error: "Kunne ikke kopiere plan" }
  }

  revalidatePath("/admin/ruteplan")
  return { success: true }
}

export async function resetRuteplan(kommune: string, aar: number) {
  const supabase = await createClient()

  const { data: soner } = await supabase
    .from("serwent_soner")
    .select("id")
    .eq("kommune", kommune)
    .eq("aktiv", true)

  if (!soner || soner.length === 0) {
    return { error: "Ingen soner funnet" }
  }

  const soneIds = soner.map((s: { id: string }) => s.id)

  const { error } = await supabase
    .from("serwent_ruteplan")
    .delete()
    .in("sone_id", soneIds)
    .eq("aar", aar)
    .eq("status", "Utkast")

  if (error) {
    console.error("[resetRuteplan] Error:", error)
    return { error: "Kunne ikke nullstille plan" }
  }

  revalidatePath("/admin/ruteplan")
  return { success: true }
}
