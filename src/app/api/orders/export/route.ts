import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { STATUS_LABELS } from "@/lib/constants"
import type { Order, OrderStatus } from "@/types/database"

function getOrderType(order: Order, allOrders: Order[]): string {
  const year = new Date(order.created_at).getFullYear()
  if (!order.gnr || !order.bnr) return "Ordinaer"

  const earlier = allOrders.filter(
    (o) =>
      o.id !== order.id &&
      o.gnr === order.gnr &&
      o.bnr === order.bnr &&
      o.kommune === order.kommune &&
      new Date(o.created_at).getFullYear() === year &&
      o.created_at < order.created_at
  )

  if (earlier.length === 0) return "Ordinaer"
  return `Ekstrabestilling (${earlier.length})`
}

function toCSV(orders: Order[]): string {
  const headers = [
    "ID",
    "Dato",
    "Type bestilling",
    "Kommune",
    "Type toemming",
    "Navn",
    "E-post",
    "Telefon",
    "Adresse",
    "Gnr",
    "Bnr",
    "Kommentar",
    "Tankstorrelse (m3)",
    "Status",
  ]

  const rows = orders.map((o) =>
    [
      o.order_id,
      new Date(o.created_at).toLocaleString("nb-NO"),
      getOrderType(o, orders),
      o.kommune,
      o.tomming_type,
      o.navn,
      o.epost,
      o.telefon,
      o.adresse,
      o.gnr,
      o.bnr,
      o.kommentar || "",
      o.tank_storrelse_m3 != null ? String(o.tank_storrelse_m3) : "",
      STATUS_LABELS[o.status as OrderStatus] || o.status,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";")
  )

  return "\uFEFF" + [headers.join(";"), ...rows].join("\n")
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Hämta eventuellt kommunefilter från query-parametrar
    const kommune = request.nextUrl.searchParams.get("kommune")

    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (kommune) {
      query = query.eq("kommune", kommune)
    }

    const { data: orders, error } = await query

    if (error) {
      return NextResponse.json({ error: "Kunne ikke hente bestillinger" }, { status: 500 })
    }

    const csv = toCSV(orders || [])
    const suffix = kommune ? `_${kommune.replace(/\s+/g, "_")}` : ""
    const filename = `Serwent_Bestillinger${suffix}_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[Export] Error:", error)
    return NextResponse.json({ error: "Eksportfeil" }, { status: 500 })
  }
}
