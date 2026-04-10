"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export type UserRole = "bruker" | "admin" | "super_admin"

// Hämta inloggad användares roll
export async function getUserRole(): Promise<UserRole> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return "bruker"

  // Använd admin-klient för att undvika RLS-problem
  const admin = createAdminClient()
  const { data } = await admin
    .from("serwent_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  return (data?.role as UserRole) || "bruker"
}

// Kontrollera om användaren har minst given roll
export async function hasRole(minRole: UserRole): Promise<boolean> {
  const role = await getUserRole()
  const hierarchy: UserRole[] = ["bruker", "admin", "super_admin"]
  return hierarchy.indexOf(role) >= hierarchy.indexOf(minRole)
}
