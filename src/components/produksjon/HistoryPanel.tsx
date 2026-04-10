"use client"

import { useEffect, useState } from "react"
import type { Sone } from "@/types/produksjon"

interface HistoryEntry {
  uke: number
  planlagt: number
  kjort: number
  pct: number
}

interface Props {
  sone: Sone | null
  aar: number
  onClose: () => void
}

export function HistoryPanel({ sone, aar, onClose }: Props) {
  const [data, setData] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sone) return

    setLoading(true)
    // Hämta historik via fetch (server action via form action funkar inte bra i paneler)
    // Vi simulerar med tomma data — dessa fylls via actions i verklig drift
    setData([])
    setLoading(false)
  }, [sone, aar])

  if (!sone) return null

  const prevYear = aar - 1
  const totalKjort = data.reduce((s, d) => s + d.kjort, 0)
  const totalPlanlagt = data.reduce((s, d) => s + d.planlagt, 0)
  const avgPerWeek = data.length > 0 ? Math.round(totalKjort / data.length) : 0
  const avgPct = totalPlanlagt > 0 ? Math.round((totalKjort / totalPlanlagt) * 100) : 0

  const getBarColor = (pct: number) => {
    if (pct >= 95) return "#22c55e"
    if (pct >= 75) return "#f59e0b"
    return "#E8321E"
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-border z-50 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: sone.farge }}
            />
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-serif)", color: "var(--color-navy)" }}
            >
              {sone.navn}
            </span>
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            Historikk {prevYear}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-navy hover:border-navy transition-colors cursor-pointer bg-white"
        >
          ✕
        </button>
      </div>

      {/* Sammandrag */}
      <div className="px-5 py-4 border-b border-border grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Totalt kjørt</div>
          <div className="text-lg font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-navy)" }}>
            {totalKjort}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Snitt/uke</div>
          <div className="text-lg font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-navy)" }}>
            {avgPerWeek}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Fullføring</div>
          <div className="text-lg font-bold" style={{ fontFamily: "var(--font-serif)", color: getBarColor(avgPct) }}>
            {avgPct}%
          </div>
        </div>
      </div>

      {/* Veckolista */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {loading ? (
          <div className="text-center text-sm text-muted py-8">Laster...</div>
        ) : data.length === 0 ? (
          <div className="text-center text-sm text-muted py-8">
            Ingen historikk for {prevYear}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data.map((d) => (
              <div key={d.uke} className="flex items-center gap-3">
                <span className="text-[10px] font-mono font-semibold text-muted w-8">
                  V{d.uke}
                </span>
                <div className="flex-1 h-1.5 bg-border/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, d.pct)}%`,
                      background: getBarColor(d.pct),
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-mono font-bold w-10 text-right"
                  style={{ color: getBarColor(d.pct) }}
                >
                  {d.pct}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:border-navy transition-colors cursor-pointer bg-white"
          style={{ color: "var(--color-navy)" }}
        >
          Lukk
        </button>
      </div>
    </div>
  )
}
