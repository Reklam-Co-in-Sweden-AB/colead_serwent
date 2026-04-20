"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { getSoneNavnForKommune } from "@/actions/soner"
import { bestFuzzyMatch } from "@/lib/fuzzy-match"

// Kolumnordning i Komtek-export (A–U)
const KOMTEK_COLUMNS = [
  "kommune", "tomme_dato", "anlegg", "kunde", "adresse",
  "postnummer", "poststed", "eiendom", "anleggstype", "avtaletype",
  "type_tomming", "bil", "adkomst", "tomt", "tomme_volum",
  "slangeutlegg", "hoydeforskjell", "tommer", "merknad", "avvik",
  "rodenavn",
] as const

interface ParsedRow {
  kommune: string
  tomme_dato: string
  anlegg: string | null
  kunde: string | null
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  eiendom: string | null
  anleggstype: string | null
  avtaletype: string | null
  type_tomming: string | null
  bil: string | null
  adkomst: string | null
  tomt: string | null
  tomme_volum: number | null
  slangeutlegg: number | null
  hoydeforskjell: number | null
  tommer: string | null
  merknad: string | null
  avvik: string | null
  rodenavn: string
}

interface SoneSummary {
  navn: string
  count: number
  weeks: Set<number>
}

interface ImportResult {
  success: boolean
  total_rows: number
  skipped: number
  aggregated_weeks: number
  upserted: number
  errors: string[]
  created_soner: string[]
  matched_soner: { navn: string; id: string }[]
}

type Step = "upload" | "preview" | "importing" | "done"

// Beräkna ISO-veckonummer
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

interface KomtekImportProps {
  kommuner: string[]
}

export function KomtekImport({ kommuner }: KomtekImportProps) {
  const [step, setStep] = useState<Step>("upload")
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [kommune, setKommune] = useState("")
  const [fileName, setFileName] = useState("")
  const [dateRange, setDateRange] = useState({ from: "", to: "" })
  const [soneSummary, setSoneSummary] = useState<SoneSummary[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [existingSoner, setExistingSoner] = useState<string[]>([])
  const [confirmUnknown, setConfirmUnknown] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Hent eksisterende sonenavn når kommune velges, for validering av rodenavn
  useEffect(() => {
    if (!kommune) {
      setExistingSoner([])
      return
    }
    let cancelled = false
    getSoneNavnForKommune(kommune).then((navn) => {
      if (!cancelled) setExistingSoner(navn)
    })
    return () => {
      cancelled = true
    }
  }, [kommune])

  // Kategoriser rodenavn i preview: exakt match / fuzzy match / helt nytt
  const validationResults = soneSummary.map((s) => {
    const exactMatch = existingSoner.find(
      (e) => e.toLowerCase() === s.navn.toLowerCase()
    )
    if (exactMatch) return { ...s, kind: "exact" as const, match: exactMatch }
    const fuzzy = bestFuzzyMatch(s.navn, existingSoner, 2)
    if (fuzzy) return { ...s, kind: "fuzzy" as const, match: fuzzy.match, distance: fuzzy.distance }
    return { ...s, kind: "new" as const }
  })

  const harFuzzyTreff = validationResults.some((r) => r.kind === "fuzzy")
  const harNye = validationResults.some((r) => r.kind === "new")

  // Parsa Excel med exceljs (redan installerat)
  const parseFile = useCallback(async (file: File) => {
    setError("")

    if (!file.name.match(/\.xlsx?$/i)) {
      setError("Filen må være en Excel-fil (.xlsx)")
      return
    }

    try {
      const ExcelJS = (await import("exceljs")).default
      const workbook = new ExcelJS.Workbook()
      const buffer = await file.arrayBuffer()
      await workbook.xlsx.load(buffer)

      const worksheet = workbook.worksheets[0]
      if (!worksheet) {
        setError("Fant ingen ark i filen")
        return
      }

      const parsed: ParsedRow[] = []
      let detectedKommune = ""

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // Hoppa över header

        const values: (string | number | Date | null)[] = []
        for (let i = 1; i <= 21; i++) {
          const cell = row.getCell(i)
          values.push(cell.value as string | number | Date | null)
        }

        const rodenavn = values[20]
        if (!rodenavn || String(rodenavn) === "Rodenavn") return

        const tommeDato = values[1]
        if (!tommeDato) return

        // Konvertera datum
        let isoDate = ""
        if (tommeDato instanceof Date) {
          isoDate = tommeDato.toISOString()
        } else {
          const d = new Date(String(tommeDato))
          if (!isNaN(d.getTime())) {
            isoDate = d.toISOString()
          } else {
            return
          }
        }

        // Detektera kommun från första raden
        if (!detectedKommune && values[0]) {
          detectedKommune = String(values[0]).trim()
        }

        const entry: ParsedRow = {
          kommune: values[0] ? String(values[0]).trim() : "",
          tomme_dato: isoDate,
          anlegg: values[2] ? String(values[2]) : null,
          kunde: values[3] ? String(values[3]) : null,
          adresse: values[4] ? String(values[4]) : null,
          postnummer: values[5] ? String(values[5]) : null,
          poststed: values[6] ? String(values[6]) : null,
          eiendom: values[7] ? String(values[7]) : null,
          anleggstype: values[8] ? String(values[8]) : null,
          avtaletype: values[9] ? String(values[9]) : null,
          type_tomming: values[10] ? String(values[10]) : null,
          bil: values[11] ? String(values[11]) : null,
          adkomst: values[12] ? String(values[12]) : null,
          tomt: values[13] ? String(values[13]) : null,
          tomme_volum: values[14] != null ? Number(values[14]) || null : null,
          slangeutlegg: values[15] != null ? Number(values[15]) || null : null,
          hoydeforskjell: values[16] != null ? Number(values[16]) || null : null,
          tommer: values[17] ? String(values[17]) : null,
          merknad: values[18] ? String(values[18]) : null,
          avvik: values[19] ? String(values[19]) : null,
          rodenavn: String(rodenavn).trim(),
        }

        parsed.push(entry)
      })

      if (parsed.length === 0) {
        setError("Fant ingen gyldige rader i filen. Kontroller at kolumn U (Rodenavn) har verdier.")
        return
      }

      // Autodetektera kommun
      if (detectedKommune) {
        const match = kommuner.find(
          (k) => k.toLowerCase() === detectedKommune.toLowerCase()
        )
        if (match) setKommune(match)
        else setKommune(detectedKommune)
      }

      // Beräkna sammanfattning per sone
      const soneMap = new Map<string, SoneSummary>()
      const dates: Date[] = []

      for (const row of parsed) {
        const date = new Date(row.tomme_dato)
        dates.push(date)
        const week = getISOWeek(date)

        const existing = soneMap.get(row.rodenavn)
        if (existing) {
          existing.count++
          existing.weeks.add(week)
        } else {
          soneMap.set(row.rodenavn, {
            navn: row.rodenavn,
            count: 1,
            weeks: new Set([week]),
          })
        }
      }

      // Sortera efter antal (fallande)
      const summaries = Array.from(soneMap.values()).sort((a, b) => b.count - a.count)

      // Datumintervall
      dates.sort((a, b) => a.getTime() - b.getTime())
      const formatDate = (d: Date) =>
        `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`

      setRows(parsed)
      setFileName(file.name)
      setSoneSummary(summaries)
      setDateRange({
        from: formatDate(dates[0]),
        to: formatDate(dates[dates.length - 1]),
      })
      setStep("preview")
    } catch (err) {
      setError(`Kunne ikke lese filen: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseFile(file)
  }

  const handleImport = async () => {
    if (!kommune) {
      setError("Velg en kommune før import")
      return
    }

    setStep("importing")
    setError("")

    try {
      const res = await fetch("/api/komtek/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, kommune, filnamn: fileName }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      const data: ImportResult = await res.json()
      setResult(data)
      setStep("done")
    } catch (err) {
      setError(`Import feilet: ${err instanceof Error ? err.message : String(err)}`)
      setStep("preview")
    }
  }

  const handleReset = () => {
    setStep("upload")
    setRows([])
    setKommune("")
    setFileName("")
    setDateRange({ from: "", to: "" })
    setSoneSummary([])
    setResult(null)
    setError("")
    setConfirmUnknown(false)
  }

  return (
    <div className="space-y-5">
      {/* Felmeddelande */}
      {error && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium bg-error/10 text-error border border-error/20">
          {error}
        </div>
      )}

      {/* Steg 1: Filuppladdning */}
      {step === "upload" && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <p className="text-sm text-muted">
                Last opp en tømmerapport fra Komtek (.xlsx). Kolonne U (Rodenavn) brukes
                for å knytte tømminger til riktig sone i systemet.
              </p>
            </div>

            <div
              className={`
                border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
                ${dragActive
                  ? "border-teal bg-teal/5"
                  : "border-border hover:border-teal/50 hover:bg-teal/3"
                }
              `}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <svg
                className="w-12 h-12 mx-auto mb-4 text-muted/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H14.25M12 3v12m0-12l-3 3m3-3l3 3"
                />
              </svg>
              <p className="text-sm font-semibold text-dark mb-1">
                {dragActive ? "Slipp filen her" : "Dra og slipp Excel-fil her"}
              </p>
              <p className="text-xs text-muted">
                eller klikk for å velge fil
              </p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </CardContent>
        </Card>
      )}

      {/* Steg 2: Förhandsgranskning */}
      {step === "preview" && (
        <>
          {/* Filinformation */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-dark">{fileName}</p>
                    <p className="text-xs text-muted">
                      {rows.length} tømminger &middot; {dateRange.from} — {dateRange.to}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Bytt fil
                </Button>
              </div>

              {/* Kommuneval */}
              <Select
                label="Kommune"
                options={kommuner}
                value={kommune}
                onChange={(e) => setKommune(e.target.value)}
                placeholder="– Velg kommune –"
              />
            </CardContent>
          </Card>

          {/* Soneöversikt med validering */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-dark text-lg font-bold">
                  Soner i filen
                  <span className="text-muted font-normal text-sm ml-2">
                    ({soneSummary.length} soner)
                  </span>
                </h2>
                {kommune && (harFuzzyTreff || harNye) && (
                  <Badge variant={harFuzzyTreff ? "warning" : "info"}>
                    {harFuzzyTreff ? "Sjekk rodenavn!" : "Nye soner vil opprettes"}
                  </Badge>
                )}
              </div>

              {kommune && harFuzzyTreff && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-warning/10 border border-warning/30 text-xs">
                  <p className="font-semibold text-warning mb-1">
                    Mulige stavfeil i rodenavn
                  </p>
                  <p className="text-muted">
                    Noen rodenavn i filen ligner på eksisterende sonenavn, men matcher ikke eksakt.
                    Hvis dette er stavefeil, vil de opprettes som nye soner og produksjonsdata havner på feil sted.
                    Rett opp rodenavnet i Comtech eller gi sonen et nytt navn i Administrasjon av soner.
                  </p>
                </div>
              )}

              <div className="space-y-0">
                {validationResults.map((sone) => {
                  const badge =
                    sone.kind === "exact"
                      ? { text: "Match", variant: "success" as const }
                      : sone.kind === "fuzzy"
                        ? { text: `Likner «${sone.match}»`, variant: "warning" as const }
                        : { text: "Ny sone", variant: "info" as const }
                  const dotColor =
                    sone.kind === "exact"
                      ? "#22c55e"
                      : sone.kind === "fuzzy"
                        ? "#f59e0b"
                        : "var(--color-navy)"
                  return (
                    <div
                      key={sone.navn}
                      className="flex items-center justify-between py-3 border-b border-border last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: dotColor }}
                        />
                        <span className="text-sm font-medium text-dark">
                          {sone.navn}
                        </span>
                        {kommune && <Badge variant={badge.variant}>{badge.text}</Badge>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted">
                          v.{Math.min(...sone.weeks)}–{Math.max(...sone.weeks)}
                        </span>
                        <Badge variant="default">
                          {sone.count} tømminger
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Totalsummering */}
              <div className="mt-4 pt-4 border-t-2 border-border flex items-center justify-between">
                <span className="text-sm font-bold text-dark">Totalt</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">
                    {new Set(soneSummary.flatMap((s) => [...s.weeks])).size} uker
                  </span>
                  <Badge variant="info">
                    {rows.length} tømminger
                  </Badge>
                </div>
              </div>

              {/* Bekreftelse ved fuzzy/nye */}
              {kommune && (harFuzzyTreff || harNye) && (
                <label className="mt-4 flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmUnknown}
                    onChange={(e) => setConfirmUnknown(e.target.checked)}
                    className="mt-0.5 cursor-pointer"
                  />
                  <span className="text-muted">
                    Jeg har kontrollert rodenavnene og vil fortsette importen.
                    {harFuzzyTreff && " Mulige stavfeil vil opprettes som nye soner."}
                  </span>
                </label>
              )}
            </CardContent>
          </Card>

          {/* Detaljerad förhandsgranskning */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-dark text-lg font-bold mb-4">
                Forhåndsvisning
                <span className="text-muted font-normal text-sm ml-2">
                  (viser {Math.min(rows.length, 20)} av {rows.length} rader)
                </span>
              </h2>

              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-2 pr-4">Dato</th>
                      <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-2 pr-4">Kunde</th>
                      <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-2 pr-4">Adresse</th>
                      <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-2 pr-4">Type</th>
                      <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-2 pr-4">Sone</th>
                      <th className="text-right text-xs font-semibold text-muted uppercase tracking-wider py-2">Volum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((row, i) => {
                      const date = new Date(row.tomme_dato)
                      const formatted = `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`
                      return (
                        <tr key={i} className="border-b border-border last:border-b-0">
                          <td className="py-2 pr-4 text-dark whitespace-nowrap font-mono text-xs">{formatted}</td>
                          <td className="py-2 pr-4 text-dark">{row.kunde || "–"}</td>
                          <td className="py-2 pr-4 text-muted">{row.adresse || "–"}</td>
                          <td className="py-2 pr-4 text-muted text-xs">{row.anleggstype || "–"}</td>
                          <td className="py-2 pr-4">
                            <Badge variant="default">{row.rodenavn}</Badge>
                          </td>
                          <td className="py-2 text-right font-mono text-xs text-dark">
                            {row.tomme_volum ? `${row.tomme_volum} m³` : "–"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Importknapp */}
          <div className="flex items-center gap-3 justify-end">
            <Button variant="secondary" onClick={handleReset}>
              Avbryt
            </Button>
            <Button
              onClick={handleImport}
              disabled={!kommune || ((harFuzzyTreff || harNye) && !confirmUnknown)}
            >
              Importer {rows.length} tømminger
            </Button>
          </div>
        </>
      )}

      {/* Steg 3: Importerar */}
      {step === "importing" && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-teal/20 border-t-teal animate-spin" />
            <p className="text-sm font-semibold text-dark mb-1">
              Importerer tømminger...
            </p>
            <p className="text-xs text-muted">
              {rows.length} rader til {kommune}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Steg 4: Resultat */}
      {step === "done" && result && (
        <>
          {/* Resultatsammanfattning */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-dark">Import fullført!</p>
                  <p className="text-xs text-muted">{kommune} — {fileName}</p>
                </div>
              </div>

              {/* KPI-kort */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <div className="bg-background rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-dark">{result.total_rows}</div>
                  <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">Rader lest</div>
                </div>
                <div className="bg-background rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-dark">{result.aggregated_weeks}</div>
                  <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">Sone-uker</div>
                </div>
                <div className="bg-background rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-success">{result.upserted}</div>
                  <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">Oppdatert</div>
                </div>
                <div className="bg-background rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold" style={{ color: result.skipped > 0 ? "var(--color-warning)" : "var(--color-dark)" }}>
                    {result.skipped}
                  </div>
                  <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">Hoppet over</div>
                </div>
              </div>

              {/* Skapade soner */}
              {result.created_soner.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Nye soner opprettet
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.created_soner.map((s) => (
                      <Badge key={s} variant="success">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Matchade soner */}
              {result.matched_soner.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Soner i import
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.matched_soner.map((s) => (
                      <Badge key={s.id} variant="default">{s.navn}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Fel */}
              {result.errors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-error uppercase tracking-wider mb-2">
                    Feil ({result.errors.length})
                  </p>
                  <div className="bg-error/5 border border-error/20 rounded-lg p-3 text-xs text-error space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Åtgärdsknappar */}
          <div className="flex items-center gap-3 justify-end">
            <Button variant="secondary" onClick={handleReset}>
              Importer ny fil
            </Button>
            <Button
              variant="primary"
              onClick={() => window.location.href = "/admin/ruteplan"}
            >
              Gå til Ruteplan
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
