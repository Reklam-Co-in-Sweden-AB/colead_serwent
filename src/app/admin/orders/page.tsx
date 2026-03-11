import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { AdminPanel } from "@/components/order/AdminPanel"
import type { Order } from "@/types/database"

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div>
      <h1 className="text-dark text-2xl font-bold mb-6">Bestillinger</h1>
      <Card>
        <CardContent className="p-6">
          <AdminPanel initialOrders={(orders as Order[]) || []} />
        </CardContent>
      </Card>
    </div>
  )
}
