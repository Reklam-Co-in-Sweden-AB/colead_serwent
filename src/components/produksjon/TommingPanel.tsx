"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import type { Sone } from "@/types/produksjon"

interface Tomming {
  id: string
  tomme_dato: string
  kunde: string | null
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  anleggstype: string | null
  type_tomming: string | null
  tomme_volum: number | null
  tommer: string | null
  avvik: string | null
  rodenavn: string
}

interface Props {
  sone: Sone
  aar: number
  uke: number
  onClose: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`
}

export function TommingPanel({ sone, aar, uke, onClose }: Props) {
  const [tomminger, setTomminger] = useState<Tomming[]>([])
  const [totalVolum, setTotalVolum] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/komtek/tomminger?sone_id=${sone.id}&aar=${aar}&uke=${uke}`)
      .then((r) => r.json())
      .then((data) => {
        setTomminger(data.tomminger || [])
        setTotalVolum(data.total_volum || 0)
      })
      .catch(() => setTomminger([]))
      .finally(() => setLoading(false))
  }, [sone.id, aar, uke])

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl border-l border-border z-50 flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: sone.farge }}
            />
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: "var(--font-serif)", color: "var(--color-navy)" }}
            >
              {sone.navn}
            </span>
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            Uke {uke}, {aar}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-navy hover:border-navy transition-colors cursor-pointer bg-white"
        >
          ✕
        </button>
      </div>

      {/* Sammanfattning */}
      <div className="px-5 py-4 border-b border-border grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Tømminger</div>
          <div className="text-lg font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-navy)" }}>
            {tomminger.length}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Total m³</div>
          <div className="text-lg font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-navy)" }}>
            {totalVolum}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Snitt m³</div>
          <div className="text-lg font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-navy)" }}>
            {tomminger.length > 0 ? Math.round((totalVolum / tomminger.length) * 10) / 10 : 0}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center text-sm text-muted py-8">Laster...</div>
        ) : tomminger.length === 0 ? (
          <div className="text-center text-sm text-muted py-8">
            Ingen tømminger registrert for denne uken
          </div>
        ) : (
          <div>
            {tomminger.map((t) => (
              <div
                key={t.id}
                className="px-5 py-3 border-b border-border last:border-b-0 hover:bg-background/50"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-dark truncate">
                      {t.kunde || "Ukjent kunde"}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {t.adresse || "Ukjent adresse"}
                      {t.postnummer && `, ${t.postnummer}`}
                      {t.poststed && ` ${t.poststed}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    {t.tomme_volum ? (
                      <span className="text-sm font-bold font-mono" style={{ color: "var(--color-navy)" }}>
                        {t.tomme_volum} m³
                      </span>
                    ) : (
                      <span className="text-xs text-muted">–</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-muted font-mono">
                    {formatDate(t.tomme_dato)}
                  </span>
                  {t.anleggstype && (
                    <Badge variant="default">{t.anleggstype}</Badge>
                  )}
                  {t.avvik && t.avvik !== "Nei" && (
                    <Badge variant="warning">{t.avvik}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:border-navy transition-colors cursor-pointer bg-white"
          style={{ color: "var(--color-navy)" }}
        >
          Lukk
        </button>
      </div>
    </div>
  )
}
