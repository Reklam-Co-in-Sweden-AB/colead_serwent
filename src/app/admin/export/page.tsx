"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ExportPage() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/orders/export")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Serwent_Bestillinger_${new Date().toISOString().slice(0, 10)}.csv`
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
            Last ned alle bestillinger som CSV-fil. Filen er semikolonseparert og
            kompatibel med Excel.
          </p>

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
