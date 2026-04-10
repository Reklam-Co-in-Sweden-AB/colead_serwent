"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

interface Props {
  kommuner: string[]
  currentKommune: string
  currentYear: number
}

export function MunicipalityYearFilter({ kommuner, currentKommune, currentYear }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(key, value)
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateParams("aar", String(currentYear - 1))}
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
          onClick={() => updateParams("aar", String(currentYear + 1))}
          className="px-2 py-1 rounded text-sm font-mono font-semibold text-navy border border-border hover:border-navy transition-colors bg-surface cursor-pointer"
          style={{ color: "var(--color-navy)" }}
        >
          ▶
        </button>
      </div>

      <select
        value={currentKommune}
        onChange={(e) => updateParams("kommune", e.target.value)}
        className="px-3 py-1.5 rounded text-sm font-mono font-semibold border border-border bg-white cursor-pointer"
        style={{ color: "var(--color-navy)" }}
      >
        {kommuner.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
    </div>
  )
}
