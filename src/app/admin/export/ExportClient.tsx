"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/constants"

const MONTH_NAMES_NB = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
]

// Genererer siste N månader (inkl. inneværande) som dropdown-alternativ
function generateMonths(count = 24): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = `${MONTH_NAMES_NB[d.getMonth()]} ${d.getFullYear()}`
    result.push({ value, label })
  }
  return result
}

interface ExportClientProps {
  kommuner: string[]
}

export function ExportClient({ kommuner }: ExportClientProps) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [kommune, setKommune] = useState("")
  const [manad, setManad] = useState("")
  const [status, setStatus] = useState("")
  const [type, setType] = useState("")

  const months = useMemo(() => generateMonths(24), [])

  const handleExport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (kommune) params.set("kommune", kommune)
      if (manad) params.set("manad", manad)
      if (status) params.set("status", status)
      if (type) params.set("type", type)
      const qs = params.toString()
      const res = await fetch(`/api/orders/export${qs ? `?${qs}` : ""}`)
      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      const parts: string[] = ["Serwent_Bestillinger"]
      if (kommune) parts.push(kommune.replace(/\s+/g, "_"))
      if (manad) parts.push(manad)
      if (status) parts.push(status)
      if (type) parts.push(type)
      parts.push(new Date().toISOString().slice(0, 10))
      a.download = `${parts.join("_")}.csv`

      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch {
      alert("Kunne ikke eksportere.")
    }
    setLoading(false)
  }

  const handleReset = () => {
    setKommune("")
    setManad("")
    setStatus("")
    setType("")
  }

  const hasFilter = kommune || manad || status || type

  const selectClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-dark focus:border-navy focus:ring-1 focus:ring-navy outline-none"
  const labelClass = "block text-sm font-medium text-dark mb-1.5"

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-dark text-lg font-bold mb-2">CSV-eksport</h3>
        <p className="text-muted text-sm mb-5">
          Last ned bestillinger som CSV-fil. Filen er semikolonseparert og
          kompatibel med Excel.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 max-w-2xl">
          <div>
            <label className={labelClass}>Kommune</label>
            <select
              value={kommune}
              onChange={(e) => setKommune(e.target.value)}
              className={selectClass}
            >
              <option value="">Alle kommuner</option>
              {kommuner.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Måned</label>
            <select
              value={manad}
              onChange={(e) => setManad(e.target.value)}
              className={selectClass}
            >
              <option value="">Alle måneder</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectClass}
            >
              <option value="">Alle statuser</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={selectClass}
            >
              <option value="">Alle typer</option>
              <option value="ordinaer">Ordinaer</option>
              <option value="ekstra">Ekstrabestilling</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleExport} disabled={loading} size="lg">
            {done ? "Eksportert!" : loading ? "Eksporterer..." : "Last ned CSV"}
          </Button>
          {hasFilter && (
            <button
              onClick={handleReset}
              className="text-sm text-muted hover:text-dark transition-colors cursor-pointer"
            >
              Nullstill filter
            </button>
          )}
        </div>

        <div className="mt-6 p-4 bg-teal/5 border-2 border-teal/20 rounded-md">
          <p className="text-xs text-dark leading-relaxed">
            <strong>Kolonner:</strong> ID, Dato, Type bestilling, Kommune, Type tømming,
            Navn, E-post, Telefon, Adresse, Gnr, Bnr, Kommentar, Tankstørrelse, Status
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
