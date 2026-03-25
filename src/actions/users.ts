"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface AdminUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

// Hämta alla användare via Supabase Auth Admin API
export async function getUsers(): Promise<AdminUser[]> {
  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.listUsers()

  if (error) {
    console.error("[getUsers] Error:", error)
    return []
  }

  return (data.users || []).map((u) => ({
    id: u.id,
    email: u.email || "",
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at || null,
  }))
}

// Bjud in ny användare med e-post och lösenord
export async function inviteUser(email: string, password: string) {
  // Kontrollera att anroparen är autentiserad
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Du må være innlogget for å legge til brukere" }
  }

  // Validera input
  if (!email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return { error: "Ugyldig e-postadresse" }
  }
  if (!password || password.length < 8) {
    return { error: "Passordet må være minst 8 tegn" }
  }

  const admin = createAdminClient()

  const { error } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  })

  if (error) {
    console.error("[inviteUser] Error:", error)
    return { error: "Kunne ikke opprette brukeren. Sjekk at e-postadressen er gyldig og prøv igjen." }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

// Ändra lösenord för en användare
export async function changeUserPassword(userId: string, newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Du må være innlogget" }
  }

  if (!newPassword || newPassword.length < 6) {
    return { error: "Passordet må være minst 6 tegn" }
  }

  const admin = createAdminClient()

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) {
    console.error("[changeUserPassword] Error:", error)
    return { error: error.message || "Kunne ikke endre passordet" }
  }

  return { success: true }
}

// Ta bort användare
export async function deleteUser(userId: string) {
  // Kontrollera att anroparen är autentiserad
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Du må være innlogget" }
  }

  // Förhindra att man tar bort sig själv
  if (user.id === userId) {
    return { error: "Du kan ikke slette din egen bruker" }
  }

  const admin = createAdminClient()

  const { error } = await admin.auth.admin.deleteUser(userId)

  if (error) {
    console.error("[deleteUser] Error:", error)
    return { error: error.message || "Kunne ikke slette brukeren" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}
