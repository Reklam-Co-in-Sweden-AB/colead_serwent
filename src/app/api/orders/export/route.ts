import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { STATUS_LABELS, ORDER_STATUSES } from "@/lib/constants"
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

function toCSV(orders: Order[], allOrders: Order[]): string {
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
      getOrderType(o, allOrders),
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

  return "﻿" + [headers.join(";"), ...rows].join("\n")
}

// Bygger månadsspann (UTC) från "YYYY-MM" → [från, till)
function monthRange(manad: string): { from: Date; to: Date } | null {
  const m = manad.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  if (month < 1 || month > 12) return null
  const from = new Date(Date.UTC(year, month - 1, 1))
  const to = new Date(Date.UTC(year, month, 1))
  return { from, to }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const params = request.nextUrl.searchParams

    const kommune = params.get("kommune") || ""
    const manad = params.get("manad") || ""
    const status = params.get("status") || ""
    const type = params.get("type") || "" // "ordinaer" | "ekstra"
    const search = params.get("search") || ""

    // Hämta alla bestillinger (ev. filtrerat på kommune) så getOrderType
    // kan räkna mot hela årets bestillinger på samma gnr/bnr.
    let baseQuery = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (kommune) {
      baseQuery = baseQuery.eq("kommune", kommune)
    }

    const { data: allOrders, error } = await baseQuery
    if (error) {
      return NextResponse.json(
        { error: "Kunne ikke hente bestillinger" },
        { status: 500 }
      )
    }
    const all: Order[] = allOrders || []

    // Tillämpa övriga filter i minnet
    let filtered: Order[] = all

    if (manad) {
      const range = monthRange(manad)
      if (range) {
        filtered = filtered.filter((o) => {
          const d = new Date(o.created_at)
          return d >= range.from && d < range.to
        })
      }
    }

    if (status && (ORDER_STATUSES as readonly string[]).includes(status)) {
      filtered = filtered.filter((o) => o.status === status)
    }

    if (type === "ordinaer" || type === "ekstra") {
      filtered = filtered.filter((o) => {
        const t = getOrderType(o, all)
        return type === "ordinaer"
          ? t === "Ordinaer"
          : t.startsWith("Ekstrabestilling")
      })
    }

    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter((o) =>
        [o.navn, o.kommune, o.adresse, o.order_id, o.epost].some((v) =>
          v?.toLowerCase().includes(s)
        )
      )
    }

    const csv = toCSV(filtered, all)

    // Bygg filnamn med aktiva filter
    const parts: string[] = ["Serwent_Bestillinger"]
    if (kommune) parts.push(kommune.replace(/\s+/g, "_"))
    if (manad) parts.push(manad)
    if (status) parts.push(status)
    if (type) parts.push(type)
    parts.push(new Date().toISOString().slice(0, 10))
    const filename = parts.join("_") + ".csv"

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
