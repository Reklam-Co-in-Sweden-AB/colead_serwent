"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

interface Props {
  kommuner: string[]
  currentKommuner: string[]
  currentYear: number
}

export function MunicipalityYearFilter({ kommuner, currentKommuner, currentYear }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const updateYear = useCallback(
    (year: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("aar", String(year))
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const updateKommuner = useCallback(
    (selected: string[]) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("kommune")
      // Alle valgt eller tom liste → fjern param (server tolker som alle)
      if (selected.length > 0 && selected.length < kommuner.length) {
        for (const k of selected) params.append("kommune", k)
      }
      router.push(`?${params.toString()}`)
    },
    [router, searchParams, kommuner.length]
  )

  const toggleKommune = (k: string) => {
    const set = new Set(currentKommuner)
    if (set.has(k)) set.delete(k)
    else set.add(k)
    updateKommuner(Array.from(set))
  }

  const selectAll = () => updateKommuner(kommuner)
  const clearAll = () => updateKommuner([])

  // Lukk ved klikk utenfor
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const allSelected = currentKommuner.length === 0 || currentKommuner.length === kommuner.length
  const label =
    allSelected
      ? `Alle kommuner (${kommuner.length})`
      : currentKommuner.length === 1
        ? currentKommuner[0]
        : `${currentKommuner.length} av ${kommuner.length} valgt`

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateYear(currentYear - 1)}
          className="px-2 py-1 rounded text-sm font-mono font-semibold text-navy border border-border hover:border-navy transition-colors bg-surface cursor-pointer"
          style={{ color: "var(--color-navy)" }}
        >
          ◀
        </button>
        <span
          className="px-3 py-1 rounded text-sm font-mono font-bold border border-border bg-white"
          style={{ color: "var(--color-navy)" }}
        >
          {currentYear}
        </span>
        <button
          onClick={() => updateYear(currentYear + 1)}
          className="px-2 py-1 rounded text-sm font-mono font-semibold text-navy border border-border hover:border-navy transition-colors bg-surface cursor-pointer"
          style={{ color: "var(--color-navy)" }}
        >
          ▶
        </button>
      </div>

      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="px-3 py-1.5 rounded text-sm font-mono font-semibold border border-border bg-white cursor-pointer hover:border-navy transition-colors flex items-center gap-2 min-w-[200px] justify-between"
          style={{ color: "var(--color-navy)" }}
        >
          <span className="truncate">{label}</span>
          <span className="text-[10px]">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-border z-50 py-1.5 min-w-[240px] max-h-[400px] overflow-y-auto"
          >
            <div className="px-2 py-1 flex gap-1 border-b border-border mb-1">
              <button
                onClick={selectAll}
                className="flex-1 px-2 py-1 rounded text-[10px] font-semibold cursor-pointer hover:bg-navy-soft/50 transition-colors"
                style={{ color: "var(--color-navy)" }}
              >
                Velg alle
              </button>
              <button
                onClick={clearAll}
                className="flex-1 px-2 py-1 rounded text-[10px] font-semibold cursor-pointer hover:bg-navy-soft/50 transition-colors"
                style={{ color: "var(--color-muted)" }}
              >
                Nullstill
              </button>
            </div>
            {kommuner.map((k) => {
              const checked = currentKommuner.includes(k) || allSelected
              return (
                <label
                  key={k}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-navy-soft/40 transition-colors"
                  style={{ color: "var(--color-navy)" }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleKommune(k)}
                    className="cursor-pointer"
                  />
                  <span className="font-medium">{k}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
