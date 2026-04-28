"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { RodeNotat } from "@/types/produksjon"

// Hämtar alla notater för en specifik sone (alla år)
export async function getNotaterForSone(soneId: string): Promise<RodeNotat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("serwent_rode_notat")
    .select("*")
    .eq("sone_id", soneId)
    .order("aar", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getNotaterForSone] Error:", error)
    return []
  }
  return (data as RodeNotat[]) || []
}

// Hämtar notater för en specifik sone + år (för Sonerapport-vyn)
export async function getNotaterForSoneOgAar(
  soneId: string,
  aar: number
): Promise<RodeNotat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("serwent_rode_notat")
    .select("*")
    .eq("sone_id", soneId)
    .eq("aar", aar)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getNotaterForSoneOgAar] Error:", error)
    return []
  }
  return (data as RodeNotat[]) || []
}

// Hämtar alla notater för soner i en kommune (för Ruteplanleggeren)
export async function getNotaterForKommune(kommune: string): Promise<RodeNotat[]> {
  const supabase = await createClient()

  // Hitta först alla sone_id för kommunen
  const { data: soner } = await supabase
    .from("serwent_soner")
    .select("id")
    .eq("kommune", kommune)

  if (!soner || soner.length === 0) return []

  const soneIds = soner.map((s: { id: string }) => s.id)

  const { data, error } = await supabase
    .from("serwent_rode_notat")
    .select("*")
    .in("sone_id", soneIds)
    .order("aar", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getNotaterForKommune] Error:", error)
    return []
  }
  return (data as RodeNotat[]) || []
}

export async function createNotat(soneId: string, aar: number, notat: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Du må være innlogget for å skrive notat" }
  }

  const trimmed = notat.trim()
  if (!trimmed) {
    return { error: "Notat kan ikke være tomt" }
  }

  const { error } = await supabase.from("serwent_rode_notat").insert({
    sone_id: soneId,
    aar,
    notat: trimmed,
    forfatter: user.email || null,
  })

  if (error) {
    console.error("[createNotat] Error:", error)
    return { error: `Kunne ikke lagre notat: ${error.message}` }
  }

  revalidatePath("/admin/ruteplan")
  return { success: true }
}

export async function updateNotat(id: string, notat: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Du må være innlogget" }
  }

  const trimmed = notat.trim()
  if (!trimmed) {
    return { error: "Notat kan ikke være tomt" }
  }

  // Bara forfattaren får uppdatera (eller om forfatter saknas)
  const { data: existing } = await supabase
    .from("serwent_rode_notat")
    .select("forfatter")
    .eq("id", id)
    .single()

  if (existing?.forfatter && existing.forfatter !== user.email) {
    return { error: "Du kan bare redigere dine egne notater" }
  }

  const { error } = await supabase
    .from("serwent_rode_notat")
    .update({ notat: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("[updateNotat] Error:", error)
    return { error: `Kunne ikke oppdatere: ${error.message}` }
  }

  revalidatePath("/admin/ruteplan")
  return { success: true }
}

export async function deleteNotat(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Du må være innlogget" }
  }

  const { data: existing } = await supabase
    .from("serwent_rode_notat")
    .select("forfatter")
    .eq("id", id)
    .single()

  if (existing?.forfatter && existing.forfatter !== user.email) {
    return { error: "Du kan bare slette dine egne notater" }
  }

  const { error } = await supabase.from("serwent_rode_notat").delete().eq("id", id)

  if (error) {
    console.error("[deleteNotat] Error:", error)
    return { error: `Kunne ikke slette: ${error.message}` }
  }

  revalidatePath("/admin/ruteplan")
  return { success: true }
}
