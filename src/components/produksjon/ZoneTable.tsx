"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { saveProduksjon } from "@/actions/produksjon"
import type { ZoneWeekData } from "@/types/produksjon"

interface Props {
  data: ZoneWeekData[]
  aar: number
  uke: number
  totalBestilling: number
}

export function ZoneTable({ data, aar, uke, totalBestilling }: Props) {
  const activeData = data.filter((d) => d.planlagt > 0)

  const [values, setValues] = useState(() => buildValues(activeData, totalBestilling))
  const [isPending, startTransition] = useTransition()
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const valuesRef = useRef(values)
  valuesRef.current = values

  // Synka state vid vecko-/årsändring
  useEffect(() => {
    setValues(buildValues(activeData, totalBestilling))
    setSaveStatus("idle")
  }, [uke, aar])

  // Autospar med 500ms debounce
  const triggerAutoSave = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSaveStatus("saving")
      startTransition(async () => {
        const currentValues = valuesRef.current
        const updates = activeData.map((d) => ({
          sone_id: d.sone.id,
          aar,
          uke,
          kjort_rute: currentValues[d.sone.id]?.kjort_rute ?? 0,
          kjort_best: currentValues[d.sone.id]?.kjort_best ?? 0,
        }))
        const result = await saveProduksjon(updates)
        if (result.success) {
          setSaveStatus("saved")
          setTimeout(() => setSaveStatus("idle"), 1500)
        }
      })
    }, 500)
  }

  const updateValue = (soneId: string, field: "kjort_rute" | "kjort_best", val: number) => {
    setValues((prev) => ({
      ...prev,
      [soneId]: { ...prev[soneId], [field]: val },
    }))
    triggerAutoSave()
  }

  // Beräkna totaler
  const totalPlanlagt = activeData.reduce((sum, d) => sum + d.planlagt, 0)
  const totalKjort = activeData.reduce((sum, d) => sum + (values[d.sone.id]?.kjort_rute ?? 0), 0)
  const totalPercent = totalPlanlagt > 0 ? Math.round((totalKjort / totalPlanlagt) * 100) : 0

  const getPercent = (planned: number, done: number) =>
    planned > 0 ? Math.round((done / planned) * 100) : done > 0 ? 100 : 0

  const getStatusBadge = (planned: number, done: number) => {
    if (planned === 0) return null
    const pct = getPercent(planned, done)
    if (pct >= 100)
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono" style={{ background: "rgba(34,197,94,0.12)", color: "#15803d", border: "1px solid rgba(34,197,94,0.3)" }}>
          ✓ Fullført
        </span>
      )
    if (pct >= 75)
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono" style={{ background: "rgba(245,158,11,0.1)", color: "#92400e", border: "1px solid rgba(245,158,11,0.3)" }}>
          {pct}%
        </span>
      )
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono" style={{ background: "rgba(232,50,30,0.08)", color: "#E8321E", border: "1px solid rgba(232,50,30,0.3)" }}>
        {pct}%
      </span>
    )
  }

  const getBarColor = (pct: number) => {
    if (pct >= 100) return "#22c55e"
    if (pct >= 75) return "#f59e0b"
    return "#E8321E"
  }

  return (
    <div>
      {/* Autospar-indikator */}
      <div className="flex items-center justify-end mb-2 h-5">
        {saveStatus === "saving" && (
          <span className="text-[11px] text-muted animate-pulse">Lagrer...</span>
        )}
        {saveStatus === "saved" && (
          <span className="text-[11px]" style={{ color: "#22c55e" }}>✓ Lagret</span>
        )}
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr style={{ background: "var(--color-navy)" }}>
            <th className="text-left text-[10px] font-bold text-white/70 uppercase tracking-wider px-3.5 py-2.5">
              Sone
            </th>
            <th className="text-right text-[10px] font-bold text-white/70 uppercase tracking-wider px-3.5 py-2.5">
              Planlagt
            </th>
            <th className="text-center text-[10px] font-bold text-white/70 uppercase tracking-wider px-3.5 py-2.5">
              Kjørt
            </th>
            <th className="text-[10px] font-bold text-white/70 uppercase tracking-wider px-3.5 py-2.5">
              Fremdrift
            </th>
            <th className="text-[10px] font-bold text-white/70 uppercase tracking-wider px-3.5 py-2.5">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {activeData.map((d) => {
            const kjort = values[d.sone.id]?.kjort_rute ?? 0
            const pct = getPercent(d.planlagt, kjort)
            return (
              <tr key={d.sone.id} className="border-b border-border hover:bg-navy-soft/50">
                <td className="px-3.5 py-2.5 text-xs">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: d.sone.farge }}
                    />
                    {d.sone.navn}
                  </span>
                </td>
                <td className="text-right px-3.5 py-2.5 text-xs font-mono font-semibold" style={{ color: "var(--color-navy)" }}>
                  {d.planlagt}
                </td>
                <td className="text-center px-3.5 py-2.5">
                  <div className="inline-flex items-center gap-0">
                    <button
                      onClick={() => updateValue(d.sone.id, "kjort_rute", Math.max(0, kjort - 1))}
                      disabled={kjort <= 0}
                      className="w-7 h-7 rounded-l-md border border-r-0 border-border text-xs font-bold cursor-pointer transition-colors hover:bg-border/30 disabled:opacity-30 disabled:cursor-default bg-white"
                      style={{ color: "var(--color-navy)" }}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={d.planlagt}
                      value={kjort}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0
                        updateValue(d.sone.id, "kjort_rute", Math.min(val, d.planlagt))
                      }}
                      className="w-12 h-7 text-center border-y border-border text-xs font-mono font-semibold focus:outline-none focus:border-navy"
                      style={{ color: "var(--color-navy)", background: "#f8fafc" }}
                    />
                    <button
                      onClick={() => updateValue(d.sone.id, "kjort_rute", Math.min(d.planlagt, kjort + 1))}
                      disabled={kjort >= d.planlagt}
                      className="w-7 h-7 rounded-r-md border border-l-0 border-border text-xs font-bold cursor-pointer transition-colors hover:bg-border/30 disabled:opacity-30 disabled:cursor-default bg-white"
                      style={{ color: "var(--color-navy)" }}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="px-3.5 py-2.5">
                  <div className="h-1.5 bg-border/50 rounded-full overflow-hidden min-w-[90px]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        background: getBarColor(pct),
                      }}
                    />
                  </div>
                </td>
                <td className="px-3.5 py-2.5">
                  {getStatusBadge(d.planlagt, kjort)}
                </td>
              </tr>
            )
          })}

          {/* Bestillingstømminger-rad */}
          <tr className="border-b border-border" style={{ background: "rgba(245,158,11,0.04)" }}>
            <td className="px-3.5 py-2.5 text-xs">
              <span className="flex items-center gap-2 font-medium" style={{ color: "#f59e0b" }}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "#f59e0b" }} />
                Bestillingstømminger
              </span>
            </td>
            <td className="text-right px-3.5 py-2.5 text-xs font-mono text-muted">—</td>
            <td className="text-center px-3.5 py-2.5">
              <div className="inline-flex items-center gap-0">
                <button
                  onClick={() => {
                    const cur = values["__bestilling__"]?.kjort_best ?? 0
                    setValues((prev) => ({ ...prev, __bestilling__: { kjort_rute: 0, kjort_best: Math.max(0, cur - 1) } }))
                    triggerAutoSave()
                  }}
                  disabled={(values["__bestilling__"]?.kjort_best ?? 0) <= 0}
                  className="w-7 h-7 rounded-l-md border border-r-0 text-xs font-bold cursor-pointer transition-colors hover:bg-border/30 disabled:opacity-30 disabled:cursor-default bg-white"
                  style={{ color: "#92400e", borderColor: "rgba(245,158,11,0.5)" }}
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  value={values["__bestilling__"]?.kjort_best ?? 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    setValues((prev) => ({ ...prev, __bestilling__: { kjort_rute: 0, kjort_best: val } }))
                    triggerAutoSave()
                  }}
                  className="w-12 h-7 text-center border-y text-xs font-mono font-semibold focus:outline-none"
                  style={{ color: "#92400e", borderColor: "rgba(245,158,11,0.5)", background: "#f8fafc" }}
                />
                <button
                  onClick={() => {
                    const cur = values["__bestilling__"]?.kjort_best ?? 0
                    setValues((prev) => ({ ...prev, __bestilling__: { kjort_rute: 0, kjort_best: cur + 1 } }))
                    triggerAutoSave()
                  }}
                  className="w-7 h-7 rounded-r-md border border-l-0 text-xs font-bold cursor-pointer transition-colors hover:bg-border/30 bg-white"
                  style={{ color: "#92400e", borderColor: "rgba(245,158,11,0.5)" }}
                >
                  +
                </button>
              </div>
            </td>
            <td className="px-3.5 py-2.5" />
            <td className="px-3.5 py-2.5">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  color: "#92400e",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                Ekstra
              </span>
            </td>
          </tr>

          {/* Totalrad */}
          <tr style={{ background: "var(--color-navy-soft, #eef2f7)" }}>
            <td className="px-3.5 py-2.5 text-xs font-bold" style={{ color: "var(--color-navy)" }}>
              Totalt uke {uke}
            </td>
            <td className="text-right px-3.5 py-2.5 text-xs font-mono font-bold" style={{ color: "var(--color-navy)" }}>
              {totalPlanlagt}
            </td>
            <td className="text-center px-3.5 py-2.5 text-xs font-mono font-bold" style={{ color: "var(--color-navy)" }}>
              {totalKjort}
            </td>
            <td className="px-3.5 py-2.5">
              <div className="h-1.5 bg-border/50 rounded-full overflow-hidden min-w-[90px]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, totalPercent)}%`,
                    background: getBarColor(totalPercent),
                  }}
                />
              </div>
            </td>
            <td className="px-3.5 py-2.5">
              {totalPlanlagt > 0 && (
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
                  style={{
                    background: totalPercent >= 100 ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.1)",
                    color: totalPercent >= 100 ? "#15803d" : "#92400e",
                    border: totalPercent >= 100 ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(245,158,11,0.3)",
                  }}
                >
                  {totalPercent}%
                </span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function buildValues(
  activeData: ZoneWeekData[],
  totalBestilling: number
): Record<string, { kjort_rute: number; kjort_best: number }> {
  const map: Record<string, { kjort_rute: number; kjort_best: number }> = {}
  for (const d of activeData) {
    map[d.sone.id] = { kjort_rute: Math.min(d.kjort_rute, d.planlagt), kjort_best: d.kjort_best }
  }
  map["__bestilling__"] = { kjort_rute: 0, kjort_best: totalBestilling }
  return map
}
