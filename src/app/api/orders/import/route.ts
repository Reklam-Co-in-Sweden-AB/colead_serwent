import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Tillfällig import-route — ta bort efter användning
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-import-secret")
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { orders } = await request.json()
  const supabase = createAdminClient()

  let inserted = 0
  const errors: string[] = []

  for (const order of orders) {
    const { error } = await supabase.from("orders").insert(order)
    if (error) {
      errors.push(`${order.order_id} (${order.navn}): ${error.message}`)
    } else {
      inserted++
    }
  }

  return NextResponse.json({ inserted, errors, total: orders.length })
}
