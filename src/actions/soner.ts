"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Sone, SoneInsert } from "@/types/produksjon"

export async function getSoner(kommune?: string | string[]): Promise<Sone[]> {
  const supabase = await createClient()

  let query = supabase
    .from("serwent_soner")
    .select("*")
    .eq("aktiv", true)
    .order("kommune", { ascending: true })
    .order("sort_order", { ascending: true })

  if (kommune) {
    const kommuner = Array.isArray(kommune) ? kommune : [kommune]
    if (kommuner.length > 0) {
      query = query.in("kommune", kommuner)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error("[getSoner] Error:", error)
    return []
  }

  return (data as Sone[]) || []
}

export async function getAllSoner(kommune: string | string[]): Promise<Sone[]> {
  const supabase = await createClient()
  const kommuner = Array.isArray(kommune) ? kommune : [kommune]

  const { data, error } = await supabase
    .from("serwent_soner")
    .select("*")
    .in("kommune", kommuner)
    .order("kommune", { ascending: true })
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("[getAllSoner] Error:", error)
    return []
  }

  return (data as Sone[]) || []
}

export async function createSone(sone: SoneInsert) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("serwent_soner")
    .insert(sone)

  if (error) {
    console.error("[createSone] Error:", error)
    return { error: "Kunne ikke opprette sone" }
  }

  revalidatePath("/admin/ruteplan")
  revalidatePath("/admin/produksjon")
  return { success: true }
}

export async function updateSone(id: string, updates: Partial<SoneInsert & { aktiv: boolean }>) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("serwent_soner")
    .update(updates)
    .eq("id", id)

  if (error) {
    console.error("[updateSone] Error:", error)
    return { error: "Kunne ikke oppdatere sone" }
  }

  revalidatePath("/admin/ruteplan")
  revalidatePath("/admin/produksjon")
  return { success: true }
}

export async function deleteSone(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("serwent_soner")
    .update({ aktiv: false })
    .eq("id", id)

  if (error) {
    console.error("[deleteSone] Error:", error)
    return { error: "Kunne ikke slette sone" }
  }

  revalidatePath("/admin/ruteplan")
  revalidatePath("/admin/produksjon")
  return { success: true }
}

export async function getSoneNavnForKommune(kommune: string): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("serwent_soner")
    .select("navn")
    .eq("kommune", kommune)
    .eq("aktiv", true)

  if (error) {
    console.error("[getSoneNavnForKommune] Error:", error)
    return []
  }

  return (data || []).map((d: { navn: string }) => d.navn).sort()
}

export async function getKommunerWithSoner(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("serwent_soner")
    .select("kommune")
    .eq("aktiv", true)

  if (error) {
    console.error("[getKommunerWithSoner] Error:", error)
    return []
  }

  const unique = [...new Set((data || []).map((d: { kommune: string }) => d.kommune))]
  return unique.sort()
}
