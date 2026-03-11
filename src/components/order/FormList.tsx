"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createForm, deleteForm } from "@/actions/forms"

interface FormItem {
  id: string
  name: string
  slug: string
  status: string
  created_at: string
}

export function FormList({ forms }: { forms: FormItem[] }) {
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim()) return
    setCreating(true)
    await createForm(newName.trim(), newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"))
    setCreating(false)
    setShowNew(false)
    setNewName("")
    setNewSlug("")
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Slett formuläret "${name}"?`)) return
    await deleteForm(id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-dark text-xl font-bold">Skjemaer</h2>
          <p className="text-muted text-xs mt-1">{forms.length} skjema{forms.length !== 1 ? "er" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Avbryt" : "+ Nytt skjema"}
        </Button>
      </div>

      {showNew && (
        <div className="flex gap-3 mb-5 p-4 bg-background rounded-lg border-2 border-border">
          <input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value)
              setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9æøå]/g, "-").replace(/-+/g, "-"))
            }}
            placeholder="Skjemanavn"
            className="flex-1 border-2 border-border rounded-md px-3 py-2 text-sm outline-none focus:border-teal"
          />
          <input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="slug"
            className="w-40 border-2 border-border rounded-md px-3 py-2 text-sm outline-none focus:border-teal font-mono"
          />
          <Button size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? "Oppretter..." : "Opprett"}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {forms.map((form) => (
          <div key={form.id} className="flex items-center justify-between p-4 border-2 border-border rounded-lg hover:border-teal/30 transition-colors">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-dark">{form.name}</span>
                  <Badge variant={form.status === "published" ? "success" : "default"}>
                    {form.status === "published" ? "Publisert" : "Utkast"}
                  </Badge>
                </div>
                <span className="text-xs text-muted font-mono">/{form.slug}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`/admin/forms/${form.id}`}
                className="px-3 py-1.5 text-xs font-semibold text-dark bg-teal/10 border-2 border-teal/20 rounded-md hover:bg-teal/20 transition-colors no-underline"
              >
                Rediger
              </a>
              <button
                onClick={() => handleDelete(form.id, form.name)}
                className="px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/10 rounded-md transition-colors cursor-pointer"
              >
                Slett
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
