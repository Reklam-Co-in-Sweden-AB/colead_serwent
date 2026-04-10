"use client"

import { useState, useEffect, useTransition, useCallback, useRef, memo } from "react"
import { upsertRuteplanWeek } from "@/actions/ruteplan"
import type { Sone, Ruteplan } from "@/types/produksjon"
import { MONTH_WEEKS } from "@/lib/week-utils"

interface Props {
  soner: Sone[]
  ruteplan: Ruteplan[]
  historyPlan?: Ruteplan[]
  historyProd?: { sone_id: string; uke: number; kjort_rute: number; planlagt: number }[]
  aar: number
  onZoneClick?: (sone: Sone) => void
  onHistoryCellClick?: (sone: Sone, uke: number) => void
  historyLabel?: string
}

// Minnesoptimerad rad-komponent
const GanttRow = memo(function GanttRow({
  sone,
  planMap,
  histMap,
  aar,
  onCellClick,
  onZoneClick,
  onHistoryCellClick,
  historyLabel,
}: {
  sone: Sone
  planMap: Map<number, number>
  histMap: Map<number, { pct: number | null; raw: number }>
  aar: number
  onCellClick: (soneId: string, uke: number, currentPlanlagt: number, e: React.MouseEvent) => void
  onZoneClick?: (sone: Sone) => void
  onHistoryCellClick?: (sone: Sone, uke: number) => void
  historyLabel?: string
}) {
  return (
    <>
      {/* Plan-rad */}
      <tr>
        <td
          className="text-[11px] font-medium px-3.5 h-7 bg-white border-r-[1.5px] border-border whitespace-nowrap cursor-pointer hover:bg-navy-soft/50 sticky left-0 z-10"
          style={{ color: "var(--color-navy)", minWidth: 150 }}
          onClick={() => onZoneClick?.(sone)}
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0 inline-block"
              style={{ background: sone.farge }}
            />
            {sone.navn}
          </span>
        </td>
        {Array.from({ length: 52 }, (_, i) => i + 1).map((uke) => {
          const planlagt = planMap.get(uke) || 0
          const filled = planlagt > 0
          return (
            <td
              key={uke}
              className={`border-r border-b border-border h-7 text-center text-[9px] font-mono font-semibold cursor-pointer transition-colors ${
                filled
                  ? "text-navy"
                  : "hover:bg-navy/5"
              }`}
              style={
                filled
                  ? { background: "rgba(27,58,107,0.12)", color: "var(--color-navy)" }
                  : undefined
              }
              onClick={(e) => onCellClick(sone.id, uke, planlagt, e)}
            >
              {filled ? planlagt : ""}
            </td>
          )
        })}
      </tr>

      {/* Historikrad */}
      <tr>
        <td
          className="text-[10px] italic px-3.5 h-7 bg-white border-r-[1.5px] border-border whitespace-nowrap opacity-55 sticky left-0 z-10"
          style={{ paddingLeft: 28, minWidth: 150 }}
        >
          <span>↳ {historyLabel || `${aar - 1} faktisk`}</span>
        </td>
        {Array.from({ length: 52 }, (_, i) => i + 1).map((uke) => {
          const entry = histMap.get(uke)
          let bgStyle = ""
          let textColor = ""
          let label = ""
          if (entry) {
            if (entry.pct !== null) {
              // Har plan — visa procent med färgkod
              if (entry.pct >= 95) {
                bgStyle = "rgba(34,197,94,0.13)"
                textColor = "#15803d"
              } else if (entry.pct >= 75) {
                bgStyle = "rgba(245,158,11,0.13)"
                textColor = "#92400e"
              } else {
                bgStyle = "rgba(232,50,30,0.08)"
                textColor = "#E8321E"
              }
              label = `${entry.pct}%`
            } else {
              // Ingen plan — visa rå antal med neutral färg
              bgStyle = "rgba(27,58,107,0.08)"
              textColor = "var(--color-navy)"
              label = `${entry.raw}`
            }
          }
          return (
            <td
              key={uke}
              className={`border-r border-b border-border h-7 text-center text-[9px] font-mono font-semibold ${
                entry && onHistoryCellClick ? "cursor-pointer hover:opacity-75" : ""
              }`}
              style={
                entry
                  ? { background: bgStyle, color: textColor }
                  : undefined
              }
              onClick={() => entry && onHistoryCellClick?.(sone, uke)}
            >
              {label}
            </td>
          )
        })}
      </tr>
    </>
  )
})

export function GanttGrid({
  soner,
  ruteplan,
  historyPlan,
  historyProd,
  aar,
  onZoneClick,
  onHistoryCellClick,
  historyLabel,
}: Props) {
  const [localPlan, setLocalPlan] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>()
    for (const r of ruteplan) {
      map.set(`${r.sone_id}:${r.uke}`, r.planlagt)
    }
    return map
  })

  // Synka localPlan med nya props (t.ex. vid årsändring)
  useEffect(() => {
    const map = new Map<string, number>()
    for (const r of ruteplan) {
      map.set(`${r.sone_id}:${r.uke}`, r.planlagt)
    }
    setLocalPlan(map)
  }, [ruteplan])
  const [isPending, startTransition] = useTransition()

  // Bygg historik-map: sone_id:uke → { pct: fullföringsprocent, raw: rå antal }
  const histMap = new Map<string, { pct: number | null; raw: number }>()
  if (historyPlan && historyProd) {
    const planMap = new Map<string, number>()
    for (const r of historyPlan) {
      planMap.set(`${r.sone_id}:${r.uke}`, r.planlagt)
    }
    for (const p of historyProd) {
      const planned = planMap.get(`${p.sone_id}:${p.uke}`) || p.planlagt || 0
      if (planned > 0) {
        histMap.set(`${p.sone_id}:${p.uke}`, {
          pct: Math.round((p.kjort_rute / planned) * 100),
          raw: p.kjort_rute,
        })
      } else if (p.kjort_rute > 0) {
        // Ingen plan — visa rå antal
        histMap.set(`${p.sone_id}:${p.uke}`, { pct: null, raw: p.kjort_rute })
      }
    }
  }

  // Popup-state för cellval
  const [popup, setPopup] = useState<{ soneId: string; uke: number; x: number; y: number; current: number } | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Stäng popup vid klick utanför
  useEffect(() => {
    if (!popup) return
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [popup])

  const handleCellClick = useCallback(
    (soneId: string, uke: number, currentPlanlagt: number, e: React.MouseEvent) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      setPopup({
        soneId,
        uke,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 4,
        current: currentPlanlagt,
      })
    },
    []
  )

  const selectValue = useCallback(
    (value: number) => {
      if (!popup) return
      const key = `${popup.soneId}:${popup.uke}`

      setLocalPlan((prev) => {
        const next = new Map(prev)
        if (value > 0) {
          next.set(key, value)
        } else {
          next.delete(key)
        }
        return next
      })

      startTransition(async () => {
        await upsertRuteplanWeek(popup.soneId, aar, popup.uke, value)
      })

      setPopup(null)
    },
    [popup, aar]
  )

  // Bygg månads-headers
  let prevEnd = 0
  const monthHeaders = MONTH_WEEKS.map((m) => {
    const span = m.endWeek - prevEnd
    prevEnd = m.endWeek
    return { label: m.label, span }
  })

  return (
    <div className="overflow-x-auto border border-border rounded-xl shadow-sm">
      <table className="border-collapse" style={{ minWidth: 1200 }}>
        <thead>
          {/* Månadsrad */}
          <tr>
            <th
              className="text-left text-[9px] font-mono font-bold text-muted uppercase px-3.5 py-1.5 bg-white border-b-[1.5px] border-r-[1.5px] border-border sticky left-0 z-20"
              style={{ minWidth: 150 }}
            >
              Sone
            </th>
            {monthHeaders.map((m) => (
              <th
                key={m.label}
                colSpan={m.span}
                className="text-center text-[9px] font-bold uppercase tracking-wider px-0 py-1.5 border-b-[1.5px] border-r border-border"
                style={{ background: "var(--color-navy-soft, #eef2f7)", color: "var(--color-navy)" }}
              >
                {m.label}
              </th>
            ))}
          </tr>

          {/* Veckonummerrad */}
          <tr>
            <th className="bg-white border-b-[1.5px] border-r-[1.5px] border-border sticky left-0 z-20" />
            {Array.from({ length: 52 }, (_, i) => i + 1).map((uke) => (
              <th
                key={uke}
                className="text-center text-[9px] font-mono font-semibold text-muted px-0.5 py-1.5 bg-white border-b-[1.5px] border-r border-border select-none"
                style={{ minWidth: 18 }}
              >
                {uke}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {soner.map((sone) => {
            const sonePlanMap = new Map<number, number>()
            for (const [key, val] of localPlan) {
              const [sid, uke] = key.split(":")
              if (sid === sone.id) sonePlanMap.set(parseInt(uke), val)
            }

            const soneHistMap = new Map<number, { pct: number | null; raw: number }>()
            for (const [key, val] of histMap) {
              const [sid, uke] = key.split(":")
              if (sid === sone.id) soneHistMap.set(parseInt(uke), val)
            }

            return (
              <GanttRow
                key={sone.id}
                sone={sone}
                planMap={sonePlanMap}
                histMap={soneHistMap}
                aar={aar}
                onCellClick={handleCellClick}
                onZoneClick={onZoneClick}
                onHistoryCellClick={onHistoryCellClick}
                historyLabel={historyLabel}
              />
            )
          })}
        </tbody>
      </table>

      {isPending && (
        <div className="text-[11px] text-muted text-center py-1.5 bg-white border-t border-border">
          Lagrer...
        </div>
      )}

      {/* Hjälptekst */}
      <div className="flex items-center gap-2 mt-2 px-1">
        <svg className="w-4 h-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[11px] text-muted">
          Klikk på en celle for å velge antall tømminger for den uken. Klikk «Fjern» for å tømme cellen.
        </span>
      </div>

      {/* Cell-popup för val av antal */}
      {popup && (
        <div
          ref={popupRef}
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-border p-2"
          style={{
            left: Math.min(popup.x - 80, window.innerWidth - 180),
            top: popup.y,
          }}
        >
          <div className="text-[10px] text-muted font-semibold uppercase tracking-wider px-2 pt-1 pb-2">
            Uke {popup.uke} — Velg antall
          </div>
          <div className="flex gap-1.5">
            {[30, 40, 50].map((val) => (
              <button
                key={val}
                onClick={() => selectValue(val)}
                className="w-12 h-10 rounded-lg text-sm font-bold cursor-pointer transition-all border-2"
                style={{
                  background: popup.current === val ? "var(--color-navy)" : "white",
                  color: popup.current === val ? "white" : "var(--color-navy)",
                  borderColor: popup.current === val ? "var(--color-navy)" : "var(--color-border)",
                }}
              >
                {val}
              </button>
            ))}
          </div>
          {popup.current > 0 && (
            <button
              onClick={() => selectValue(0)}
              className="w-full mt-1.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors text-error hover:bg-error/5 border border-transparent hover:border-error/20"
            >
              Fjern
            </button>
          )}
        </div>
      )}
    </div>
  )
}
