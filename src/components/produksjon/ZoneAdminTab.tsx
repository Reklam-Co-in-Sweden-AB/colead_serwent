"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createSone, updateSone, deleteSone, deleteSonePermanent, reactivateSone } from "@/actions/soner"
import { Badge } from "@/components/ui/badge"
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
  const router = useRouter()
  const [newName, setNewName] = useState("")
  const [newGruppe, setNewGruppe] = useState("")
  const [newColor, setNewColor] = useState(ZONE_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editGruppe, setEditGruppe] = useState("")
  const [editColor, setEditColor] = useState("")
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
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
      const res = await createSone({
        kommune,
        navn: newName.trim(),
        gruppe: newGruppe.trim() || null,
        farge: newColor,
        sort_order: soner.length,
      })
      if (res?.error) {
        alert(res.error)
        return
      }
      setNewName("")
      setNewGruppe("")
      // router.refresh() behövs — revalidatePath på servern räcker inte för att
      // klientens data ska uppdateras utan en aktiv refetch.
      router.refresh()
    })
  }

  const handleUpdate = (id: string) => {
    startTransition(async () => {
      const res = await updateSone(id, {
        navn: editName,
        gruppe: editGruppe.trim() || null,
        farge: editColor,
      })
      if (res?.error) {
        alert(res.error)
        return
      }
      setEditingId(null)
      router.refresh()
    })
  }

  const handleHide = (sone: Sone) => {
    if (!confirm(
      `Fjerne «${sone.navn}» fra Gantt-oversikten?\n\nSonen beholdes i databasen med all historikk og kan reaktiveres senere.`
    )) return
    startTransition(async () => {
      const res = await deleteSone(sone.id)
      if (res?.error) {
        alert(res.error)
        return
      }
      router.refresh()
    })
  }

  const handleReactivate = (sone: Sone) => {
    startTransition(async () => {
      const res = await reactivateSone(sone.id)
      if (res?.error) {
        alert(res.error)
        return
      }
      router.refresh()
    })
  }

  const handleDeletePermanent = (sone: Sone) => {
    const typed = prompt(
      `ADVARSEL: Dette sletter sonen «${sone.navn}» PERMANENT.\n\n` +
      `Alle historiske data for sonen forsvinner også:\n` +
      `  • Ruteplan (utkast og publisert)\n` +
      `  • Produksjon (registrerte tømminger)\n` +
      `  • Komtek-importer koblet til sonen\n\n` +
      `Dette kan IKKE angres.\n\n` +
      `Skriv inn sonenavnet for å bekrefte:`
    )
    if (typed === null) return
    if (typed.trim() !== sone.navn) {
      alert("Sonenavnet stemmer ikke. Sletting avbrutt.")
      return
    }
    startTransition(async () => {
      const res = await deleteSonePermanent(sone.id)
      if (res?.error) {
        alert(res.error)
        return
      }
      router.refresh()
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
                    <div className="flex items-center gap-2">
                      <span style={{ color: "var(--color-navy)", opacity: sone.aktiv ? 1 : 0.55 }}>
                        {sone.navn}
                      </span>
                      {!sone.aktiv && (
                        <Badge variant="warning">Fjernet fra Gantt</Badge>
                      )}
                    </div>
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
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === sone.id ? null : sone.id)}
                            disabled={isPending}
                            className="w-7 h-7 flex items-center justify-center rounded cursor-pointer text-muted hover:bg-navy-soft/60 hover:text-navy transition-colors"
                            aria-label="Flere handlinger"
                            title="Flere handlinger"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                              <circle cx="8" cy="3" r="1.3" />
                              <circle cx="8" cy="8" r="1.3" />
                              <circle cx="8" cy="13" r="1.3" />
                            </svg>
                          </button>
                          {menuOpenId === sone.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuOpenId(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[180px]">
                                {sone.aktiv ? (
                                  <button
                                    onClick={() => { setMenuOpenId(null); handleHide(sone) }}
                                    disabled={isPending}
                                    className="w-full text-left px-3 py-1.5 text-[11px] font-medium hover:bg-navy-soft/50 cursor-pointer"
                                    style={{ color: "var(--color-navy)" }}
                                  >
                                    Fjern fra Gantt
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => { setMenuOpenId(null); handleReactivate(sone) }}
                                    disabled={isPending}
                                    className="w-full text-left px-3 py-1.5 text-[11px] font-medium hover:bg-navy-soft/50 cursor-pointer"
                                    style={{ color: "#16a34a" }}
                                  >
                                    Reaktiver
                                  </button>
                                )}
                                <div className="border-t border-border my-1" />
                                <button
                                  onClick={() => { setMenuOpenId(null); handleDeletePermanent(sone) }}
                                  disabled={isPending}
                                  className="w-full text-left px-3 py-1.5 text-[11px] font-medium hover:bg-error/10 cursor-pointer"
                                  style={{ color: "var(--color-red)" }}
                                >
                                  Slett permanent
                                </button>
                              </div>
                            </>
                          )}
                        </div>
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
