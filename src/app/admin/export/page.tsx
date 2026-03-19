"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { KOMMUNER } from "@/lib/constants"

export default function ExportPage() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [kommune, setKommune] = useState("")

  const handleExport = async () => {
    setLoading(true)
    try {
      const params = kommune ? `?kommune=${encodeURIComponent(kommune)}` : ""
      const res = await fetch(`/api/orders/export${params}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const suffix = kommune ? `_${kommune.replace(/\s+/g, "_")}` : ""
      a.download = `Serwent_Bestillinger${suffix}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch {
      alert("Kunne ikke eksportere.")
    }
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-dark text-2xl font-bold mb-6">Eksport</h1>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-dark text-lg font-bold mb-2">CSV-eksport</h3>
          <p className="text-muted text-sm mb-5">
            Last ned bestillinger som CSV-fil. Filen er semikolonseparert og
            kompatibel med Excel.
          </p>

          <div className="mb-5">
            <label className="block text-sm font-medium text-dark mb-1.5">
              Filtrer på kommune
            </label>
            <select
              value={kommune}
              onChange={(e) => setKommune(e.target.value)}
              className="w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-dark focus:border-navy focus:ring-1 focus:ring-navy"
            >
              <option value="">Alle kommuner</option>
              {KOMMUNER.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handleExport} disabled={loading} size="lg">
            {done ? "Eksportert!" : loading ? "Eksporterer..." : "Last ned CSV"}
          </Button>

          <div className="mt-6 p-4 bg-teal/5 border-2 border-teal/20 rounded-md">
            <p className="text-xs text-dark leading-relaxed">
              <strong>Kolonner:</strong> ID, Dato, Type bestilling, Kommune, Type tømming,
              Navn, E-post, Telefon, Adresse, Gnr, Bnr, Kommentar, Status
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
