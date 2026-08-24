import { createClient } from "@/lib/supabase/server"
import { fetchAllRows } from "@/lib/supabase/fetch-all"
import { Card, CardContent } from "@/components/ui/card"
import { AdminPanel } from "@/components/order/AdminPanel"
import { getKommuner } from "@/actions/settings"
import type { Order } from "@/types/database"

export default async function OrdersPage() {
  const supabase = await createClient()

  const [{ data: orders }, kommuner] = await Promise.all([
    fetchAllRows<Order>(() =>
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
    ),
    getKommuner(),
  ])

  return (
    <div>
      <h1 className="text-dark text-2xl font-bold mb-6">Bestillinger</h1>
      <Card>
        <CardContent className="p-6">
          <AdminPanel initialOrders={orders} kommuner={kommuner} />
        </CardContent>
      </Card>
    </div>
  )
}
