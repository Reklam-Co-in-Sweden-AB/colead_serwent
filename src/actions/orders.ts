"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { OrderStatus } from "@/types/database"

export async function getOrders() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getOrders] Error:", error)
    return []
  }

  return data || []
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)

  if (error) {
    console.error("[updateOrderStatus] Error:", error)
    return { error: "Kunne ikke oppdatere status" }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function deleteOrder(orderId: string) {
  const supabase = await createClient()

  // Ta bort relaterade meddelanden först
  await supabase.from("messages").delete().eq("order_id", orderId)

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)

  if (error) {
    console.error("[deleteOrder] Error:", error)
    return { error: "Kunne ikke slette bestillingen" }
  }

  revalidatePath("/admin/orders")
  return { success: true }
}

export async function getOrderStats() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("orders")
    .select("status")

  if (error) return { ny: 0, under_behandling: 0, utfort: 0, total: 0 }

  const stats = {
    ny: data.filter((o) => o.status === "ny").length,
    under_behandling: data.filter((o) => o.status === "under_behandling").length,
    utfort: data.filter((o) => o.status === "utfort").length,
    total: data.length,
  }

  return stats
}
