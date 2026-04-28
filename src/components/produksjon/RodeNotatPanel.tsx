"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createNotat, updateNotat, deleteNotat } from "@/actions/notater"
import type { RodeNotat } from "@/types/produksjon"

interface Props {
  soneId: string
  aar: number
  notater: RodeNotat[]
  currentUserEmail?: string | null
}

export function RodeNotatPanel({ soneId, aar, notater, currentUserEmail }: Props) {
  const router = useRouter()
  const [newNotat, setNewNotat] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Sortera så aktuellt år visas först, sedan tidigare år
  const sorted = [...notater].sort((a, b) => {
    if (a.aar !== b.aar) {
      if (a.aar === aar) return -1
      if (b.aar === aar) return 1
      return b.aar - a.aar
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const visible = showAll ? sorted : sorted.slice(0, 3)
  const hiddenCount = sorted.length - visible.length

  useEffect(() => {
    setError(null)
  }, [newNotat])

  const handleCreate = () => {
    const text = newNotat.trim()
    if (!text) return
    startTransition(async () => {
      const res = await createNotat(soneId, aar, text)
      if (res?.error) {
        setError(res.error)
        return
      }
      setNewNotat("")
      router.refresh()
    })
  }

  const handleStartEdit = (n: RodeNotat) => {
    setEditingId(n.id)
    setEditText(n.notat)
  }

  const handleSaveEdit = (id: string) => {
    const text = editText.trim()
    if (!text) return
    startTransition(async () => {
      const res = await updateNotat(id, text)
      if (res?.error) {
        setError(res.error)
        return
      }
      setEditingId(null)
      router.refresh()
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm("Slette denne notaten?")) return
    startTransition(async () => {
      const res = await deleteNotat(id)
      if (res?.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`
  }

  return (
    <div className="px-4 py-3 border-t border-border bg-background/30">
      <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
        Notater {sorted.length > 0 && <span className="font-mono">({sorted.length})</span>}
      </div>

      {/* Befintliga notater */}
      {sorted.length > 0 && (
        <div className="space-y-2 mb-3">
          {visible.map((n) => {
            const canEdit = !n.forfatter || n.forfatter === currentUserEmail
            const isEditing = editingId === n.id
            return (
              <div
                key={n.id}
                className="bg-white border border-border rounded-lg p-2.5 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        background: n.aar === aar ? "rgba(232,50,30,0.1)" : "rgba(0,0,0,0.05)",
                        color: n.aar === aar ? "#E8321E" : "var(--color-muted)",
                      }}
                    >
                      {n.aar}
                    </span>
                    <span className="text-muted text-[10px]">
                      {n.forfatter || "Ukjent"} · {formatDate(n.created_at)}
                    </span>
                  </div>
                  {canEdit && !isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(n)}
                        className="text-muted hover:text-navy text-[10px] px-1.5 cursor-pointer"
                      >
                        Rediger
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        disabled={isPending}
                        className="text-muted hover:text-error text-[10px] px-1.5 cursor-pointer"
                      >
                        Slett
                      </button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="flex flex-col gap-1.5">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="w-full border border-border rounded px-2 py-1 text-xs outline-none focus:border-navy resize-none"
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-0.5 text-[10px] font-semibold text-muted cursor-pointer"
                      >
                        Avbryt
                      </button>
                      <button
                        onClick={() => handleSaveEdit(n.id)}
                        disabled={isPending || !editText.trim()}
                        className="px-2 py-0.5 text-[10px] font-semibold text-white rounded cursor-pointer disabled:opacity-50"
                        style={{ background: "var(--color-navy)" }}
                      >
                        Lagre
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-dark whitespace-pre-wrap leading-snug">{n.notat}</p>
                )}
              </div>
            )
          })}
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="text-[10px] font-semibold text-navy hover:underline cursor-pointer"
            >
              Vis {hiddenCount} eldre notat{hiddenCount === 1 ? "" : "er"}
            </button>
          )}
        </div>
      )}

      {/* Ny notat */}
      <div className="flex gap-2 items-end">
        <textarea
          value={newNotat}
          onChange={(e) => setNewNotat(e.target.value)}
          placeholder={`Legg til notat for ${aar} (snø, adkomst, andre erfaringer...)`}
          rows={2}
          className="flex-1 border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-navy resize-none bg-white"
        />
        <button
          onClick={handleCreate}
          disabled={isPending || !newNotat.trim()}
          className="px-3 py-1.5 rounded text-xs font-semibold text-white cursor-pointer disabled:opacity-50 transition-colors"
          style={{ background: "var(--color-navy)" }}
        >
          Legg til
        </button>
      </div>

      {error && (
        <div className="mt-2 text-[10px] text-error font-medium">{error}</div>
      )}
    </div>
  )
}
