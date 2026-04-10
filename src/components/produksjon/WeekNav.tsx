"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { getCurrentWeek } from "@/lib/week-utils"

interface WeekInfo {
  uke: number
  hasBestilling: boolean
  totalBestilling: number
}

interface Props {
  weeks: WeekInfo[]
  selectedWeek: number
  completedWeeks: Set<number>
}

export function WeekNav({ weeks, selectedWeek, completedWeeks }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentWeek = getCurrentWeek()

  const navigateToWeek = (uke: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("uke", String(uke))
    router.push(`?${params.toString()}`)
  }

  const goToWeek = (direction: -1 | 1) => {
    const currentIdx = weeks.findIndex((w) => w.uke === selectedWeek)
    const newIdx = currentIdx + direction
    if (newIdx >= 0 && newIdx < weeks.length) {
      navigateToWeek(weeks[newIdx].uke)
    }
  }

  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-5">
      <div className="flex items-center justify-between mb-4">
        <div
          className="text-[10px] font-bold text-muted uppercase tracking-wider"
          style={{ margin: 0 }}
        >
          Uke {selectedWeek} — soneregistrering
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => goToWeek(-1)}
            disabled={weeks[0]?.uke === selectedWeek}
            className="px-3 py-1.5 text-sm font-semibold border border-border rounded-lg bg-white hover:border-navy transition-colors cursor-pointer disabled:opacity-40"
            style={{ color: "var(--color-navy)" }}
          >
            ◀
          </button>
          <button
            onClick={() => goToWeek(1)}
            disabled={weeks[weeks.length - 1]?.uke === selectedWeek}
            className="px-3 py-1.5 text-sm font-semibold border border-border rounded-lg bg-white hover:border-navy transition-colors cursor-pointer disabled:opacity-40"
            style={{ color: "var(--color-navy)" }}
          >
            ▶
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider mr-1">V.</span>
        {weeks.map((w) => {
          const isDone = completedWeeks.has(w.uke)
          const isCurrent = w.uke === currentWeek
          const isSelected = w.uke === selectedWeek

          let className = "w-[30px] h-[30px] rounded-md border text-[10px] font-mono font-medium flex items-center justify-center cursor-pointer transition-all relative "
          if (isSelected && isCurrent) {
            className += "font-bold"
          } else if (isSelected) {
            className += "font-bold"
          } else if (isCurrent) {
            className += "font-bold"
          }

          let style: React.CSSProperties = {
            fontFamily: "var(--font-mono)",
          }

          if (isDone) {
            style = {
              ...style,
              background: "rgba(34,197,94,0.12)",
              borderColor: "rgba(34,197,94,0.3)",
              color: "#15803d",
            }
          }
          if (isCurrent) {
            style = {
              ...style,
              background: "rgba(232,50,30,0.08)",
              borderColor: "rgba(232,50,30,0.35)",
              color: "#E8321E",
            }
          }
          if (isSelected) {
            style = {
              ...style,
              background: "rgba(27,58,107,0.08)",
              borderColor: "#1B3A6B",
              color: "#1B3A6B",
            }
          }
          if (!isDone && !isCurrent && !isSelected) {
            style = {
              ...style,
              background: "var(--color-surface, #fff)",
              borderColor: "var(--color-border)",
              color: "var(--color-muted)",
            }
          }

          return (
            <button
              key={w.uke}
              onClick={() => navigateToWeek(w.uke)}
              className={className}
              style={style}
            >
              {w.uke}
              {w.hasBestilling && (
                <sup
                  className="absolute text-[7px]"
                  style={{ top: 1, right: 2, color: "#f59e0b" }}
                >
                  +{w.totalBestilling}
                </sup>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
