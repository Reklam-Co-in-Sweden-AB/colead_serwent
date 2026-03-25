"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect("/login?error=invalid")
  }

  redirect("/admin")
}

export async function changePassword(newPassword: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

// Admin: hämta alla användare
export async function getUsers() {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const supabase = createAdminClient()

  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) {
    return { error: error.message }
  }

  return {
    users: data.users.map((u) => ({
      id: u.id,
      email: u.email || "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    })),
  }
}

// Admin: ändra lösenord för en annan användare
export async function adminChangePassword(userId: string, newPassword: string) {
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const supabase = createAdminClient()

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
