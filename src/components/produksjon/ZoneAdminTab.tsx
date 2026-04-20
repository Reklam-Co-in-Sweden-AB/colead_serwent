"use client"

import { useState, useTransition } from "react"
import { createSone, updateSone, deleteSone } from "@/actions/soner"
import type { Sone } from "@/types/produksjon"

interface Props {
  soner: Sone[]
  kommune: string
}

// Fördefinierade sone-färger
const ZONE_COLORS = [
  "#3266AD", "#1D9E75", "#BA7517", "#993556", "#534AB7",
  "#2D8EAD", "#A6432F", "#5B8C3C", "#8B5CF6", "#0EA5E9",
]

export function ZoneAdminTab({ soner, kommune }: Props) {
  const [newName, setNewName] = useState("")
  const [newGruppe, setNewGruppe] = useState("")
  const [newColor, setNewColor] = useState(ZONE_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editGruppe, setEditGruppe] = useState("")
  const [editColor, setEditColor] = useState("")
  const [isPending, startTransition] = useTransition()

  // Eksisterende grupper for forslag (datalist)
  const eksisterendeGrupper = Array.from(
    new Set(soner.map((s) => s.gruppe).filter((g): g is string => Boolean(g)))
  ).sort()

  const handleCreate = () => {
    if (!newName.trim()) return
    if (!kommune) {
      alert("Velg én enkelt kommune i toppmenyen før du oppretter en sone.")
      return
    }
    startTransition(async () => {
      await createSone({
        kommune,
        navn: newName.trim(),
        gruppe: newGruppe.trim() || null,
        farge: newColor,
        sort_order: soner.length,
      })
      setNewName("")
      setNewGruppe("")
    })
  }

  const handleUpdate = (id: string) => {
    startTransition(async () => {
      await updateSone(id, {
        navn: editName,
        gruppe: editGruppe.trim() || null,
        farge: editColor,
      })
      setEditingId(null)
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne sonen?")) return
    startTransition(async () => {
      await deleteSone(id)
    })
  }

  const startEdit = (sone: Sone) => {
    setEditingId(sone.id)
    setEditName(sone.navn)
    setEditGruppe(sone.gruppe ?? "")
    setEditColor(sone.farge)
  }

  return (
    <div>
      {/* Lägg till ny sone */}
      <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-5">
        <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">
          Legg til ny sone
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Sonenavn (f.eks. Biri 1)"
            className="flex-1 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-navy"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <input
            type="text"
            value={newGruppe}
            onChange={(e) => setNewGruppe(e.target.value)}
            placeholder="Gruppe (valgfritt, f.eks. Sone 1)"
            list="sone-grupper"
            className="w-56 px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-navy"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <datalist id="sone-grupper">
            {eksisterendeGrupper.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <div className="flex gap-1">
            {ZONE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-6 h-6 rounded-full cursor-pointer transition-transform"
                style={{
                  background: c,
                  transform: newColor === c ? "scale(1.2)" : "scale(1)",
                  outline: newColor === c ? "2px solid var(--color-navy)" : "none",
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
          <button
            onClick={handleCreate}
            disabled={isPending || !newName.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer transition-colors disabled:opacity-50"
            style={{ background: "var(--color-navy)" }}
          >
            Legg til
          </button>
        </div>
      </div>

      {/* Sone-lista */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: "var(--color-navy)" }}>
              <th className="text-left text-[10px] font-bold text-white/70 uppercase tracking-wider px-4 py-2.5">
                Farge
              </th>
              <th className="text-left text-[10px] font-bold text-white/70 uppercase tracking-wider px-4 py-2.5">
                Navn
              </th>
              <th className="text-left text-[10px] font-bold text-white/70 uppercase tracking-wider px-4 py-2.5">
                Gruppe
              </th>
              <th className="text-center text-[10px] font-bold text-white/70 uppercase tracking-wider px-4 py-2.5">
                Sortering
              </th>
              <th className="text-right text-[10px] font-bold text-white/70 uppercase tracking-wider px-4 py-2.5">
                Handlinger
              </th>
            </tr>
          </thead>
          <tbody>
            {soner.map((sone, idx) => (
              <tr key={sone.id} className="border-b border-border hover:bg-navy-soft/50">
                <td className="px-4 py-2.5">
                  {editingId === sone.id ? (
                    <div className="flex gap-1">
                      {ZONE_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className="w-5 h-5 rounded-full cursor-pointer"
                          style={{
                            background: c,
                            outline: editColor === c ? "2px solid var(--color-navy)" : "none",
                            outlineOffset: 1,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <span
                      className="w-5 h-5 rounded-full inline-block"
                      style={{ background: sone.farge }}
                    />
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs font-medium">
                  {editingId === sone.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-2 py-1 rounded border border-border text-sm focus:outline-none focus:border-navy w-full"
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate(sone.id)}
                    />
                  ) : (
                    <span style={{ color: "var(--color-navy)" }}>{sone.navn}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs font-medium">
                  {editingId === sone.id ? (
                    <input
                      type="text"
                      value={editGruppe}
                      onChange={(e) => setEditGruppe(e.target.value)}
                      placeholder="(ingen)"
                      list="sone-grupper"
                      className="px-2 py-1 rounded border border-border text-sm focus:outline-none focus:border-navy w-full"
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate(sone.id)}
                    />
                  ) : (
                    <span className="text-muted">{sone.gruppe || "—"}</span>
                  )}
                </td>
                <td className="text-center px-4 py-2.5 text-xs font-mono text-muted">
                  {idx + 1}
                </td>
                <td className="text-right px-4 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    {editingId === sone.id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(sone.id)}
                          disabled={isPending}
                          className="px-3 py-1 rounded text-[11px] font-semibold text-white cursor-pointer"
                          style={{ background: "#22c55e" }}
                        >
                          Lagre
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 rounded text-[11px] font-semibold border border-border cursor-pointer text-muted"
                        >
                          Avbryt
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(sone)}
                          className="px-3 py-1 rounded text-[11px] font-semibold border border-border cursor-pointer hover:border-navy transition-colors"
                          style={{ color: "var(--color-navy)" }}
                        >
                          Rediger
                        </button>
                        <button
                          onClick={() => handleDelete(sone.id)}
                          disabled={isPending}
                          className="px-3 py-1 rounded text-[11px] font-semibold border border-border cursor-pointer hover:border-red transition-colors"
                          style={{ color: "var(--color-red)" }}
                        >
                          Slett
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {soner.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-sm text-muted py-8">
                  Ingen soner opprettet ennå
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
