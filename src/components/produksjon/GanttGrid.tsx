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
  indent = false,
  onCellClick,
  onZoneClick,
  onHistoryCellClick,
  historyLabel,
}: {
  sone: Sone
  planMap: Map<number, number>
  histMap: Map<number, { pct: number | null; raw: number }>
  aar: number
  indent?: boolean
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
          style={{ color: "var(--color-navy)", minWidth: 150, paddingLeft: indent ? 36 : 14 }}
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
          style={{ paddingLeft: indent ? 52 : 28, minWidth: 150 }}
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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

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
          {(() => {
            // Gruppér soner: samme (kommune, gruppe) havner sammen.
            // Soner uten gruppe vises som egen "solo-gruppe" (ingen header).
            const groups: Array<{ key: string; kommune: string; gruppe: string | null; soner: Sone[] }> = []
            const seenKey = new Map<string, number>()
            for (const s of soner) {
              const key = s.gruppe ? `${s.kommune}::${s.gruppe}` : `__solo__${s.id}`
              const existing = seenKey.get(key)
              if (existing !== undefined) {
                groups[existing].soner.push(s)
              } else {
                seenKey.set(key, groups.length)
                groups.push({ key, kommune: s.kommune, gruppe: s.gruppe, soner: [s] })
              }
            }

            // Sjekk om flere kommuner er representert — i så fall vises kommun-header
            const unikeKommuner = new Set(groups.map((g) => g.kommune))
            const visKommuneHeader = unikeKommuner.size > 1

            const render: React.ReactNode[] = []
            let forrigeKommune: string | null = null
            for (const g of groups) {
              if (visKommuneHeader && g.kommune !== forrigeKommune) {
                forrigeKommune = g.kommune
                render.push(
                  <tr key={`khdr-${g.kommune}`}>
                    <td
                      colSpan={53}
                      className="text-[10px] font-bold uppercase tracking-widest px-3.5 py-1 border-b border-border sticky left-0 z-10"
                      style={{
                        background: "var(--color-navy)",
                        color: "white",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {g.kommune}
                    </td>
                  </tr>
                )
              }

              const isGroup = g.gruppe !== null && g.soner.length > 1
              const expanded = !collapsedGroups.has(g.key)

              if (isGroup) {
                // Aggregert gruppe-rad
                const aggPlan = new Map<number, number>()
                const aggHist = new Map<number, { pct: number | null; raw: number; planned: number }>()
                for (const s of g.soner) {
                  for (const [key, val] of localPlan) {
                    const [sid, ukeStr] = key.split(":")
                    if (sid === s.id) {
                      const uke = parseInt(ukeStr)
                      aggPlan.set(uke, (aggPlan.get(uke) || 0) + val)
                    }
                  }
                  for (const [key, val] of histMap) {
                    const [sid, ukeStr] = key.split(":")
                    if (sid === s.id) {
                      const uke = parseInt(ukeStr)
                      const prev = aggHist.get(uke) || { pct: null, raw: 0, planned: 0 }
                      prev.raw += val.raw
                      aggHist.set(uke, prev)
                    }
                  }
                }
                // Regne ut gruppe-prosent basert på aggregert plan vs raw
                for (const [uke, plan] of aggPlan) {
                  const h = aggHist.get(uke)
                  if (h) {
                    h.planned = plan
                    h.pct = plan > 0 ? Math.round((h.raw / plan) * 100) : null
                  }
                }

                const repColor = g.soner[0].farge
                render.push(
                  <tr
                    key={`g-${g.key}`}
                    className="cursor-pointer hover:bg-navy-soft/40"
                    onClick={() => toggleGroup(g.key)}
                  >
                    <td
                      className="text-[11px] font-bold px-3.5 h-7 bg-navy-soft/20 border-r-[1.5px] border-border whitespace-nowrap sticky left-0 z-10"
                      style={{ color: "var(--color-navy)", minWidth: 150 }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-[9px] font-mono w-3 inline-block">{expanded ? "▼" : "▶"}</span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0 inline-block"
                          style={{ background: repColor }}
                        />
                        {g.gruppe}
                        <span className="text-[9px] font-normal text-muted">({g.soner.length})</span>
                      </span>
                    </td>
                    {Array.from({ length: 52 }, (_, i) => i + 1).map((uke) => {
                      const planlagt = aggPlan.get(uke) || 0
                      const filled = planlagt > 0
                      return (
                        <td
                          key={uke}
                          className="border-r border-b border-border h-7 text-center text-[9px] font-mono font-bold"
                          style={
                            filled
                              ? { background: "rgba(27,58,107,0.2)", color: "var(--color-navy)" }
                              : undefined
                          }
                        >
                          {filled ? planlagt : ""}
                        </td>
                      )
                    })}
                  </tr>
                )

                if (expanded) {
                  for (const s of g.soner) {
                    const sonePlanMap = new Map<number, number>()
                    for (const [key, val] of localPlan) {
                      const [sid, uke] = key.split(":")
                      if (sid === s.id) sonePlanMap.set(parseInt(uke), val)
                    }
                    const soneHistMap = new Map<number, { pct: number | null; raw: number }>()
                    for (const [key, val] of histMap) {
                      const [sid, uke] = key.split(":")
                      if (sid === s.id) soneHistMap.set(parseInt(uke), val)
                    }
                    render.push(
                      <GanttRow
                        key={s.id}
                        sone={s}
                        planMap={sonePlanMap}
                        histMap={soneHistMap}
                        aar={aar}
                        indent
                        onCellClick={handleCellClick}
                        onZoneClick={onZoneClick}
                        onHistoryCellClick={onHistoryCellClick}
                        historyLabel={historyLabel}
                      />
                    )
                  }
                }
              } else {
                // Ingen gruppering — vis enkelt-sone som vanlig
                const s = g.soner[0]
                const sonePlanMap = new Map<number, number>()
                for (const [key, val] of localPlan) {
                  const [sid, uke] = key.split(":")
                  if (sid === s.id) sonePlanMap.set(parseInt(uke), val)
                }
                const soneHistMap = new Map<number, { pct: number | null; raw: number }>()
                for (const [key, val] of histMap) {
                  const [sid, uke] = key.split(":")
                  if (sid === s.id) soneHistMap.set(parseInt(uke), val)
                }
                render.push(
                  <GanttRow
                    key={s.id}
                    sone={s}
                    planMap={sonePlanMap}
                    histMap={soneHistMap}
                    aar={aar}
                    onCellClick={handleCellClick}
                    onZoneClick={onZoneClick}
                    onHistoryCellClick={onHistoryCellClick}
                    historyLabel={historyLabel}
                  />
                )
              }
            }
            return render
          })()}
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
          Klikk på en celle for å velge antall tømminger for den uken. Klikk «Fjern» for å tømme cellen. Klikk en gruppe-rad (▼/▶) for å åpne/lukke tilhørende roter.
        </span>
      </div>

      {/* Cell-popup för val av antal */}
      {popup && (
        <CellPopup
          ref={popupRef}
          uke={popup.uke}
          x={popup.x}
          y={popup.y}
          current={popup.current}
          onSelect={selectValue}
        />
      )}
    </div>
  )
}

const DEFAULT_KAPASITET = 55

const CellPopup = memo(function CellPopup({
  ref,
  uke,
  x,
  y,
  current,
  onSelect,
}: {
  ref: React.RefObject<HTMLDivElement | null>
  uke: number
  x: number
  y: number
  current: number
  onSelect: (val: number) => void
}) {
  const [input, setInput] = useState<string>(
    current > 0 ? String(current) : String(DEFAULT_KAPASITET)
  )

  const numericValue = Math.max(0, Math.floor(Number(input) || 0))

  const commit = () => {
    onSelect(numericValue)
  }

  const adjust = (delta: number) => {
    const next = Math.max(0, numericValue + delta)
    setInput(String(next))
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-border p-2.5"
      style={{
        left: Math.min(x - 90, window.innerWidth - 200),
        top: y,
        minWidth: 220,
      }}
    >
      <div className="text-[10px] text-muted font-semibold uppercase tracking-wider px-1 pt-0.5 pb-2">
        Uke {uke} — Antall tømminger
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <button
          onClick={() => adjust(-1)}
          className="h-9 w-9 rounded-lg text-base font-bold cursor-pointer transition-colors border bg-white hover:bg-navy-soft/40 shrink-0"
          style={{ borderColor: "var(--color-border)", color: "var(--color-navy)" }}
          aria-label="Minsk med én"
        >
          −
        </button>
        <input
          type="number"
          min={0}
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "ArrowUp") {
              e.preventDefault()
              adjust(1)
            }
            if (e.key === "ArrowDown") {
              e.preventDefault()
              adjust(-1)
            }
          }}
          className="flex-1 h-9 px-2 rounded-lg text-sm font-bold font-mono text-center border-2 focus:outline-none focus:border-navy"
          style={{ borderColor: "var(--color-border)", color: "var(--color-navy)" }}
        />
        <button
          onClick={() => adjust(1)}
          className="h-9 w-9 rounded-lg text-base font-bold cursor-pointer transition-colors border bg-white hover:bg-navy-soft/40 shrink-0"
          style={{ borderColor: "var(--color-border)", color: "var(--color-navy)" }}
          aria-label="Øk med én"
        >
          +
        </button>
      </div>
      <button
        onClick={commit}
        className="w-full h-9 rounded-lg text-xs font-bold text-white cursor-pointer transition-colors"
        style={{ background: "var(--color-navy)" }}
      >
        Lagre
      </button>
      {current > 0 && (
        <button
          onClick={() => onSelect(0)}
          className="w-full mt-1.5 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-colors text-error hover:bg-error/5 border border-transparent hover:border-error/20"
        >
          Fjern
        </button>
      )}
    </div>
  )
})
