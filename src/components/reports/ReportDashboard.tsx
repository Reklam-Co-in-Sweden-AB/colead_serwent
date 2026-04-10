"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ReportData } from "@/actions/reports"
import dynamic from "next/dynamic"

// Lazy-load karta (leaflet kräver window)
const OrderMap = dynamic(() => import("./OrderMap").then(m => m.OrderMap), { ssr: false })

// Klocka med live-uppdatering
function LiveClock() {
  const [time, setTime] = useState("")
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("no-NO"))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])
  return <span className="text-xs text-muted font-mono">{time}</span>
}

// Mini-sparkline
function Sparkline({ data, color = "#45b7a9" }: { data: number[]; color?: string }) {
  if (data.length === 0) return null
  const max = Math.max(...data, 1)
  const w = 120
  const h = 32
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ")
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  )
}

// Daglig graf (visningar + bestillingar)
function DailyChart({ data }: { data: ReportData["dailyStats"] }) {
  if (data.length === 0) return <p className="text-sm text-muted">Ingen data ennå.</p>

  const maxVal = Math.max(...data.map(d => Math.max(d.views, d.orders)), 1)

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-0.5 h-48 min-w-[500px]">
        {data.map((d) => {
          const viewH = (d.views / maxVal) * 100
          const orderH = (d.orders / maxVal) * 100
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative"
            >
              {/* Tooltip */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 hidden group-hover:block bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs z-10 whitespace-nowrap shadow-lg">
                <p className="font-semibold text-dark">{d.label}</p>
                <p style={{ color: "var(--color-info)" }}>{d.views} visninger</p>
                <p className="text-teal font-semibold">{d.orders} bestillinger</p>
              </div>
              <div className="w-full flex gap-px justify-center">
                <div
                  className="w-1/3 rounded-t transition-all"
                  style={{ height: `${Math.max(viewH, 1)}%`, background: "rgba(29,78,216,0.3)" }}
                />
                <div
                  className="w-1/3 rounded-t transition-all bg-teal"
                  style={{ height: `${Math.max(orderH, 1)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-1.5 min-w-[500px]">
        <span className="text-[10px] text-muted">{data[0]?.label}</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(29,78,216,0.3)" }} /> Visninger
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal" /> Bestillinger
          </span>
        </div>
        <span className="text-[10px] text-muted">{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

// Snabbval + datumväljare
function DateFilter({ fra, til }: { fra: string; til: string }) {
  const navigate = (from: string, to: string) => {
    window.location.href = `/admin/rapporter?fra=${from}&til=${to}`
  }

  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split("T")[0]

  const presets = [
    { label: "7d", days: 7 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "1 år", days: 365 },
    { label: "Alt", days: 3650 },
  ]

  const currentSpan = Math.round((new Date(til).getTime() - new Date(fra).getTime()) / 86400000)

  return (
    <div className="flex items-center gap-1.5 bg-background rounded-lg p-1">
      {presets.map((p) => (
        <button
          key={p.label}
          onClick={() => navigate(fmt(new Date(today.getTime() - p.days * 86400000)), fmt(today))}
          className="px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all"
          style={{
            background: Math.abs(currentSpan - p.days) < 2 ? "var(--color-navy)" : "transparent",
            color: Math.abs(currentSpan - p.days) < 2 ? "white" : "var(--color-muted)",
          }}
        >
          {p.label}
        </button>
      ))}
      <span className="w-px h-5 bg-border mx-1" />
      <input
        type="date"
        defaultValue={fra}
        onChange={(e) => e.target.value && navigate(e.target.value, til)}
        className="text-xs font-mono border border-border rounded-md px-2 py-1.5 bg-white cursor-pointer"
        style={{ color: "var(--color-navy)" }}
      />
      <span className="text-xs text-muted">—</span>
      <input
        type="date"
        defaultValue={til}
        onChange={(e) => e.target.value && navigate(fra, e.target.value)}
        className="text-xs font-mono border border-border rounded-md px-2 py-1.5 bg-white cursor-pointer"
        style={{ color: "var(--color-navy)" }}
      />
    </div>
  )
}

export function ReportDashboard({ data, fra, til }: { data: ReportData; fra: string; til: string }) {
  const maxFunnel = Math.max(...data.funnel.map(s => s.count), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-dark text-2xl font-bold">Rapporter</h1>
          <p className="text-sm text-muted mt-0.5">
            {new Date(fra).toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" })}
            {" — "}
            {new Date(til).toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Datumfilter */}
          <DateFilter fra={fra} til={til} />
          <a
            href="/api/orders/export"
            className="px-3 py-1.5 text-xs font-semibold text-muted border border-border rounded-lg hover:text-dark hover:border-dark transition-colors no-underline"
          >
            Eksporter (CSV)
          </a>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <LiveClock />
          </div>
        </div>
      </div>

      {/* KPI-kort med sparklines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted font-semibold uppercase tracking-wider">Totalt bestillinger</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-2xl font-bold text-dark">{data.totalOrders}</p>
              <Sparkline data={data.dailyStats.map(d => d.orders)} color="#45b7a9" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted font-semibold uppercase tracking-wider">Utført</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-2xl font-bold text-success">{data.totalUtfort}</p>
              <Sparkline data={data.dailyStats.map(d => d.orders)} color="#22c55e" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted font-semibold uppercase tracking-wider">Konvertering</p>
            <p className="text-2xl font-bold text-dark mt-2">{data.convRate}%</p>
            <p className="text-[10px] text-muted mt-0.5">visning → bestilling</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted font-semibold uppercase tracking-wider">Denne uken</p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-2xl font-bold text-dark">{data.weekOrders}</p>
              <p className="text-xs text-muted">best.</p>
              <p className="text-sm font-semibold text-teal ml-auto">{data.weekConvRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daglig graf */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-dark text-lg font-bold mb-4">Visninger & bestillinger per dag</h3>
          <DailyChart data={data.dailyStats} />
        </CardContent>
      </Card>

      {/* Ny vs Återkommande */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted font-semibold uppercase tracking-wider">Nye adresser</p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-2xl font-bold text-dark">{data.newVsReturn.newOrders}</p>
              {data.totalOrders > 0 && (
                <p className="text-sm text-muted">
                  ({Math.round((data.newVsReturn.newOrders / data.totalOrders) * 100)}%)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted font-semibold uppercase tracking-wider">Gjentakende adresser</p>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-2xl font-bold" style={{ color: "var(--color-info)" }}>{data.newVsReturn.returnOrders}</p>
              {data.totalOrders > 0 && (
                <p className="text-sm text-muted">
                  ({Math.round((data.newVsReturn.returnOrders / data.totalOrders) * 100)}%)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-3">Topp gjentakende</p>
            {data.newVsReturn.returnAddresses.length > 0 ? (
              <div className="space-y-0">
                {data.newVsReturn.returnAddresses.slice(0, 5).map((a) => (
                  <div key={a.address} className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0">
                    <span className="text-xs text-dark truncate mr-2">{a.address}</span>
                    <Badge variant="info">{a.count}x</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">Ingen gjentakende bestillinger</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Karta */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-dark text-lg font-bold mb-4">Geografisk fordeling</h3>
          <div className="h-[400px] rounded-lg overflow-hidden">
            <OrderMap points={data.geoPoints} />
          </div>
          {data.geoPoints.length === 0 && (
            <p className="text-xs text-muted mt-3">
              Kartdata vises når bestillinger med adresse fra Kartverket kommer inn.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tratt + Källor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Konverteringstratt */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-dark text-lg font-bold mb-4">Konverteringstrakt</h3>
            <div className="space-y-3">
              {data.funnel.map((step, i) => {
                const prevCount = i > 0 ? data.funnel[i - 1].count : step.count
                const rate = prevCount > 0 ? Math.round((step.count / prevCount) * 100) : 0
                const width = maxFunnel > 0 ? Math.max((step.count / maxFunnel) * 100, 2) : 2
                const colors = ["#1d4ed8", "#45b7a9", "#f59e0b", "#22c55e"]

                return (
                  <div key={step.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-dark">{step.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-dark">{step.count}</span>
                        {i > 0 && (
                          <Badge variant={rate >= 50 ? "success" : rate >= 20 ? "warning" : "error"}>
                            {rate}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="w-full h-5 bg-background rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all"
                        style={{ width: `${width}%`, backgroundColor: colors[i] || "#45b7a9" }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Trafikkkilder */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-dark text-lg font-bold mb-4">Trafikkkilder</h3>
            {data.sources.length === 0 ? (
              <p className="text-sm text-muted">Ingen data med UTM-parametrar ennå.</p>
            ) : (
              <div className="space-y-3">
                {data.sources.map((s) => (
                  <div key={s.source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-dark capitalize">{s.source}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted">{s.orders} best.</span>
                        <Badge variant="default">{s.rate}%</Badge>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-border/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal transition-all"
                        style={{ width: `${s.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referrerare + Visningsdata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topp-referrerare */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-dark text-lg font-bold mb-4">Topp-referanser</h3>
            {data.topReferrers.length === 0 ? (
              <p className="text-sm text-muted">Ingen referansedata ennå.</p>
            ) : (
              <div className="space-y-0">
                {data.topReferrers.map((r) => (
                  <div key={r.referrer} className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
                    <span className="text-sm text-dark font-medium">{r.referrer}</span>
                    <span className="text-xs font-mono text-muted">{r.count} visninger</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Topp-steder */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-dark text-lg font-bold mb-4">Topp-steder</h3>
            {data.topCities.length === 0 ? (
              <p className="text-sm text-muted">Ingen stedsdata ennå.</p>
            ) : (
              <div className="space-y-0">
                {data.topCities.map((c, i) => (
                  <div key={c.city} className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono text-muted w-5">{i + 1}.</span>
                      <span className="text-sm text-dark font-medium">{c.city}</span>
                    </div>
                    <Badge variant="default">{c.count} best.</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visningsdata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visningsstatistikk */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-dark text-lg font-bold mb-4">Visningsstatistikk</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-dark">{data.totalViews}</div>
                <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">Totalt 30d</div>
              </div>
              <div className="bg-background rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-dark">{data.weekViews}</div>
                <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">Denne uken</div>
              </div>
              <div className="bg-background rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-teal">{data.convRate}%</div>
                <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">Konv. 30d</div>
              </div>
              <div className="bg-background rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-teal">{data.weekConvRate}%</div>
                <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">Konv. 7d</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
