"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { saveKommuner } from "@/actions/settings"

interface KommuneManagerProps {
  initialKommuner: string[]
}

export function KommuneManager({ initialKommuner }: KommuneManagerProps) {
  const [kommuner, setKommuner] = useState<string[]>(initialKommuner)
  const [newKommune, setNewKommune] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleAdd = () => {
    const name = newKommune.trim()
    if (!name) return
    if (kommuner.some((k) => k.toLowerCase() === name.toLowerCase())) {
      setMessage({ type: "error", text: `"${name}" finnes allerede` })
      return
    }
    setKommuner((prev) => [...prev, name])
    setNewKommune("")
    setMessage(null)
  }

  const handleRemove = (index: number) => {
    setKommuner((prev) => prev.filter((_, i) => i !== index))
    setMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    const result = await saveKommuner(kommuner)
    if (result.error) {
      setMessage({ type: "error", text: result.error })
    } else {
      setMessage({ type: "success", text: "Kommuner lagret!" })
    }
    setSaving(false)
  }

  const hasChanges = JSON.stringify(kommuner) !== JSON.stringify(initialKommuner)

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-dark text-lg font-bold mb-2">Kommuner</h3>
        <p className="text-muted text-sm mb-5">
          Kommuner som vises i bestillingsskjema, filtre og Komtek-import.
        </p>

        {/* Lista med befintliga kommuner */}
        <div className="space-y-0 mb-4">
          {kommuner.map((k, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0 group"
            >
              <span className="text-sm text-dark">{k}</span>
              <button
                onClick={() => handleRemove(i)}
                className="text-muted hover:text-error text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                title="Fjern"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {kommuner.length === 0 && (
            <p className="text-sm text-muted italic py-2">Ingen kommuner lagt til</p>
          )}
        </div>

        {/* Lägg till ny */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newKommune}
            onChange={(e) => setNewKommune(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Skriv kommunenavn..."
            className="flex-1 border-2 border-border rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
          />
          <Button variant="secondary" size="md" onClick={handleAdd} disabled={!newKommune.trim()}>
            Legg til
          </Button>
        </div>

        {/* Meddelande */}
        {message && (
          <div
            className={`px-4 py-3 rounded-lg text-sm font-medium mb-4 ${
              message.type === "success"
                ? "bg-success/10 text-success border border-success/20"
                : "bg-error/10 text-error border border-error/20"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Spara */}
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          {saving ? "Lagrer..." : "Lagre endringer"}
        </Button>
      </CardContent>
    </Card>
  )
}
