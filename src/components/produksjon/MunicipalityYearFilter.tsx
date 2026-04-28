"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

interface Props {
  kommuner: string[]
  currentKommuner: string[]
  currentYear: number
  isEmpty?: boolean
}

export function MunicipalityYearFilter({ kommuner, currentKommuner, currentYear, isEmpty = false }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  // Lokalt state när dropdown är öppen — så checkbox-klick inte triggar
  // en server-reload vid varje klick. URL:en uppdateras bara vid close.
  const [pending, setPending] = useState<string[] | null>(null)
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
      params.delete("empty")
      if (selected.length === 0) {
        params.set("empty", "1")
      } else if (selected.length < kommuner.length) {
        for (const k of selected) params.append("kommune", k)
      }
      router.push(`?${params.toString()}`)
    },
    [router, searchParams, kommuner.length]
  )

  // Används för att markera "alla bockade" på rader när dropdown är stängd
  // och URL:en inte har någon explicit kommune-param.
  const effectiveAllSelected = pending === null
    && !isEmpty
    && (currentKommuner.length === 0 || currentKommuner.length === kommuner.length)

  const toggleKommune = (k: string) => {
    const baseline = pending !== null
      ? [...pending]
      : isEmpty
        ? []
        : currentKommuner.length === 0
          ? [...kommuner]
          : [...currentKommuner]
    const set = new Set(baseline)
    if (set.has(k)) set.delete(k)
    else set.add(k)
    setPending(Array.from(set))
  }

  const selectAll = () => setPending([...kommuner])
  const clearAll = () => setPending([])

  // Commit pending → URL när dropdown stängs
  const commitAndClose = useCallback(() => {
    if (pending !== null) {
      // Bara pusha om det faktiskt ändrats
      const current = new Set(isEmpty ? [] : (currentKommuner.length === 0 ? kommuner : currentKommuner))
      const next = new Set(pending)
      const changed = current.size !== next.size || [...current].some((k) => !next.has(k))
      if (changed) updateKommuner(pending)
      setPending(null)
    }
    setOpen(false)
  }, [pending, isEmpty, currentKommuner, kommuner, updateKommuner])

  // Lukk ved klikk utenfor — commitar pending changes
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        commitAndClose()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, commitAndClose])

  // Labeln visar serversidans urval när stängd, pending när öppen
  const labelSource = pending ?? (isEmpty ? [] : currentKommuner)
  const labelIsEmpty = pending !== null ? pending.length === 0 : isEmpty
  const labelAllSelected = pending !== null
    ? pending.length === kommuner.length
    : !isEmpty && (currentKommuner.length === 0 || currentKommuner.length === kommuner.length)
  const label = labelIsEmpty
    ? "Ingen valgt"
    : labelAllSelected
      ? `Alle kommuner (${kommuner.length})`
      : labelSource.length === 1
        ? labelSource[0]
        : `${labelSource.length} av ${kommuner.length} valgt`

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
          onClick={() => open ? commitAndClose() : setOpen(true)}
          className="px-3 py-1.5 rounded text-sm font-mono font-semibold border border-border bg-white cursor-pointer hover:border-navy transition-colors flex items-center gap-2 min-w-[160px] max-w-[220px] justify-between"
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
                Fjern alle
              </button>
            </div>
            {kommuner.map((k) => {
              const checked = pending !== null
                ? pending.includes(k)
                : !isEmpty && (currentKommuner.includes(k) || effectiveAllSelected)
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
