"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface ImportLogEntry {
  id: string
  kommune: string
  filnamn: string
  total_rader: number
  importerade: number
  hoppade_over: number
  sone_uker: number
  skapade_soner: string[]
  soner: string[]
  period_fra: string | null
  period_til: string | null
  importert_av: string | null
  created_at: string
}

interface ImportLogProps {
  entries: ImportLogEntry[]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} kl. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function ImportLog({ entries }: ImportLogProps) {
  if (entries.length === 0) return null

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-dark text-lg font-bold mb-4">
          Importhistorikk
          <span className="text-muted font-normal text-sm ml-2">
            ({entries.length} {entries.length === 1 ? "import" : "importer"})
          </span>
        </h2>

        <div className="space-y-0">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between py-3.5 border-b border-border last:border-b-0"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-dark truncate">
                    {entry.filnamn}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {entry.kommune}
                    {entry.period_fra && entry.period_til && (
                      <> &middot; {formatDate(entry.period_fra)} — {formatDate(entry.period_til)}</>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {entry.soner.map((s) => (
                      <Badge key={s} variant="default">{s}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 ml-4">
                <p className="text-xs text-muted">
                  {formatDateTime(entry.created_at)}
                </p>
                <div className="flex items-center gap-2 mt-1 justify-end">
                  <span className="text-xs font-semibold text-dark">
                    {entry.total_rader} rader
                  </span>
                  <span className="text-xs text-muted">&rarr;</span>
                  <Badge variant="success">{entry.sone_uker} sone-uker</Badge>
                </div>
                {entry.skapade_soner.length > 0 && (
                  <p className="text-xs text-success mt-1">
                    +{entry.skapade_soner.length} nye soner
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
