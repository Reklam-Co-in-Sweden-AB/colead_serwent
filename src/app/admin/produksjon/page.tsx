import { Suspense } from "react"
import { getProduksjonStats, getWeekSummaries, getZoneWeekData, getActiveWeeks } from "@/actions/produksjon"
import { getKommunerWithSoner } from "@/actions/soner"
import { getCurrentWeek, getCurrentYear } from "@/lib/week-utils"
import { MunicipalityYearFilter } from "@/components/produksjon/MunicipalityYearFilter"
import { KpiCards } from "@/components/produksjon/KpiCards"
import { WeekChart } from "@/components/produksjon/WeekChart"
import { WeekNav } from "@/components/produksjon/WeekNav"
import { ZoneTable } from "@/components/produksjon/ZoneTable"
import { CsvExportButton } from "@/components/produksjon/CsvExportButton"

interface Props {
  searchParams: Promise<{ kommune?: string; aar?: string; uke?: string }>
}

export default async function ProduksjonPage({ searchParams }: Props) {
  const params = await searchParams
  const kommuner = await getKommunerWithSoner()
  const kommune = params.kommune || kommuner[0] || "Gjøvik"
  const aar = params.aar ? parseInt(params.aar, 10) : getCurrentYear()
  const currentWeek = getCurrentWeek()
  const selectedWeek = params.uke ? parseInt(params.uke, 10) : currentWeek

  // Hämta all data parallellt
  const [stats, weekSummaries, activeWeeks, zoneData] = await Promise.all([
    getProduksjonStats(kommune, aar),
    getWeekSummaries(kommune, aar),
    getActiveWeeks(kommune, aar),
    getZoneWeekData(kommune, aar, selectedWeek),
  ])

  // Avgör vilka veckor som är "done" (fullförda)
  const completedWeeks = new Set<number>()
  for (const ws of weekSummaries) {
    if (ws.planlagt > 0 && ws.kjort_rute >= ws.planlagt) {
      completedWeeks.add(ws.uke)
    }
  }

  // Bestillingstømminger för vald vecka
  const weekBestilling = weekSummaries.find((w) => w.uke === selectedWeek)?.kjort_best ?? 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-lg font-semibold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-navy)" }}
        >
          Produksjonsdashboard
        </h1>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <MunicipalityYearFilter
              kommuner={kommuner.length > 0 ? kommuner : [kommune]}
              currentKommune={kommune}
              currentYear={aar}
            />
          </Suspense>
          <CsvExportButton kommune={kommune} aar={aar} />
        </div>
      </div>

      {kommuner.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <div
            className="text-lg font-semibold mb-2"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-navy)" }}
          >
            Ingen soner registrert
          </div>
          <p className="text-sm text-muted">
            Opprett soner og publiser en ruteplan i Ruteplanleggeren for å komme i gang.
          </p>
        </div>
      ) : (
        <>
          {/* KPI-kort */}
          <KpiCards stats={stats} currentWeek={currentWeek} />

          {/* Ukeoversikt-chart */}
          {weekSummaries.length > 0 && <WeekChart data={weekSummaries} />}

          {/* Veckonavigering + sonetabell */}
          {activeWeeks.length > 0 && (
            <Suspense fallback={null}>
              <WeekNav
                weeks={activeWeeks}
                selectedWeek={selectedWeek}
                completedWeeks={completedWeeks}
              />
            </Suspense>
          )}

          {zoneData.length > 0 && (
            <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
              <ZoneTable
                data={zoneData}
                aar={aar}
                uke={selectedWeek}
                totalBestilling={weekBestilling}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
