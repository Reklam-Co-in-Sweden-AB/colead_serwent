"use server"

import { createClient } from "@/lib/supabase/server"

export interface GeoPoint {
  lat: number
  lng: number
  label: string
  status: string
}

export interface ReportData {
  funnel: { label: string; count: number }[]
  sources: { source: string; orders: number; rate: number }[]
  dailyStats: { date: string; label: string; views: number; orders: number }[]
  topReferrers: { referrer: string; count: number }[]
  geoPoints: GeoPoint[]
  topCities: { city: string; count: number }[]
  newVsReturn: { newOrders: number; returnOrders: number; returnAddresses: { address: string; count: number }[] }
  totalViews: number
  totalOrders: number
  totalUtfort: number
  weekViews: number
  weekOrders: number
  convRate: number
  weekConvRate: number
}

export async function getReportData(fra?: string, til?: string): Promise<ReportData> {
  const supabase = await createClient()

  const now = new Date()
  const fromDate = fra ? new Date(fra) : new Date(now.getTime() - 30 * 86400000)
  const toDate = til ? new Date(new Date(til).getTime() + 86400000) : now // +1 dag för att inkludera hela sista dagen

  const fromISO = fromDate.toISOString()
  const toISO = toDate.toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  // Antal dagar i valt intervall
  const daySpan = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000))

  const [
    { data: views },
    { data: weekViewsData },
    { data: conversions },
    { data: orders },
    { data: allTimeOrders },
  ] = await Promise.all([
    supabase
      .from("serwent_form_views")
      .select("id, utm_source, utm_medium, utm_campaign, referrer, created_at")
      .gte("created_at", fromISO)
      .lte("created_at", toISO),
    supabase
      .from("serwent_form_views")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("serwent_conversions")
      .select("id, order_id, utm_source, utm_medium, utm_campaign, referrer, created_at")
      .gte("created_at", fromISO)
      .lte("created_at", toISO),
    supabase
      .from("orders")
      .select("id, order_id, status, adresse, created_at, lat, lng")
      .gte("created_at", fromISO)
      .lte("created_at", toISO),
    // Alla orders genom tiderna — för ny/återkommande-analys
    supabase
      .from("orders")
      .select("adresse, created_at")
      .not("adresse", "eq", "")
      .order("created_at", { ascending: true }),
  ])

  const allViews = views || []
  const allConversions = conversions || []
  const allOrders = orders || []
  const allOrdersEver = allTimeOrders || []

  const totalViews = allViews.length
  const weekViews = weekViewsData?.length ?? 0
  const totalOrders = allOrders.length
  const totalUtfort = allOrders.filter(o => o.status === "utfort").length

  // Bestillingar senaste 7 dagar
  const weekOrders = allOrders.filter(o => new Date(o.created_at) >= new Date(sevenDaysAgo)).length
  const weekConversions30 = allConversions.filter(c => new Date(c.created_at) >= new Date(sevenDaysAgo)).length

  // Konverteringsgrad
  const convRate = totalViews > 0 ? Math.round((allConversions.length / totalViews) * 1000) / 10 : 0
  const weekConvRate = weekViews > 0 ? Math.round((weekConversions30 / weekViews) * 1000) / 10 : 0

  // === Konverteringstratt ===
  const statusCounts: Record<string, number> = {}
  for (const o of allOrders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  }

  const funnel = [
    { label: "Visninger", count: totalViews },
    { label: "Bestillinger", count: allConversions.length },
    { label: "Under behandling", count: statusCounts["under_behandling"] || 0 },
    { label: "Utført", count: totalUtfort },
  ]

  // === Käll-attribution ===
  const sourceMap: Record<string, { orders: number }> = {}
  for (const c of allConversions) {
    const src = c.utm_source || "direkt"
    if (!sourceMap[src]) sourceMap[src] = { orders: 0 }
    sourceMap[src].orders++
  }
  const sources = Object.entries(sourceMap)
    .map(([source, data]) => ({
      source,
      orders: data.orders,
      rate: allConversions.length > 0 ? Math.round((data.orders / allConversions.length) * 100) : 0,
    }))
    .sort((a, b) => b.orders - a.orders)

  // === Topprefererare ===
  const refMap: Record<string, number> = {}
  for (const v of allViews) {
    if (v.referrer) {
      try {
        const host = new URL(v.referrer).hostname.replace("www.", "")
        refMap[host] = (refMap[host] || 0) + 1
      } catch {
        refMap[v.referrer] = (refMap[v.referrer] || 0) + 1
      }
    }
  }
  const topReferrers = Object.entries(refMap)
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // === Daglig tidsserie (valt intervall) ===
  const dailyMap: Record<string, { views: number; orders: number }> = {}
  for (let i = daySpan - 1; i >= 0; i--) {
    const d = new Date(toDate.getTime() - (i + 1) * 86400000)
    dailyMap[d.toISOString().split("T")[0]] = { views: 0, orders: 0 }
  }
  for (const v of allViews) {
    const key = v.created_at.split("T")[0]
    if (dailyMap[key]) dailyMap[key].views++
  }
  for (const c of allConversions) {
    const key = c.created_at.split("T")[0]
    if (dailyMap[key]) dailyMap[key].orders++
  }
  const dailyStats = Object.entries(dailyMap).map(([date, data]) => ({
    date,
    label: new Date(date).toLocaleDateString("no-NO", { day: "numeric", month: "short" }),
    ...data,
  }))

  // === Geo-punkter från orders med koordinater ===
  const geoPoints: GeoPoint[] = []
  const cityMap: Record<string, number> = {}

  for (const o of allOrders) {
    if (o.lat && o.lng) {
      geoPoints.push({
        lat: o.lat,
        lng: o.lng,
        label: o.adresse || o.order_id,
        status: o.status,
      })
      // Aggregera per poststed (extrahera från adress)
      const parts = (o.adresse || "").split(/\s+/)
      const city = parts.length >= 2 ? parts[parts.length - 1] : "Ukjent"
      cityMap[city] = (cityMap[city] || 0) + 1
    }
  }

  const topCities = Object.entries(cityMap)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // === Ny vs återkommande (baserat på adress) ===
  // Bygg map: adress → första bestillingsdatum (från all historik)
  const firstOrderByAddress = new Map<string, string>()
  for (const o of allOrdersEver) {
    const addr = o.adresse?.trim().toLowerCase()
    if (addr && !firstOrderByAddress.has(addr)) {
      firstOrderByAddress.set(addr, o.created_at)
    }
  }

  // Klassificera bestillingar i valt intervall
  let newOrders = 0
  let returnOrders = 0
  const returnAddrMap = new Map<string, number>()

  for (const o of allOrders) {
    const addr = o.adresse?.trim().toLowerCase()
    if (!addr) {
      newOrders++
      continue
    }
    const firstDate = firstOrderByAddress.get(addr)
    if (firstDate && firstDate < o.created_at) {
      // Adressen har en tidigare bestilling
      returnOrders++
      const displayAddr = o.adresse || ""
      returnAddrMap.set(displayAddr, (returnAddrMap.get(displayAddr) || 0) + 1)
    } else {
      newOrders++
    }
  }

  const returnAddresses = Array.from(returnAddrMap.entries())
    .map(([address, count]) => ({ address, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const newVsReturn = { newOrders, returnOrders, returnAddresses }

  return {
    funnel,
    sources,
    dailyStats,
    topReferrers,
    geoPoints,
    topCities,
    newVsReturn,
    totalViews,
    totalOrders,
    totalUtfort,
    weekViews,
    weekOrders,
    convRate,
    weekConvRate,
  }
}
