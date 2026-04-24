import { Suspense } from "react"
import { getRuteplan } from "@/actions/ruteplan"
import { getSoner, getAllSoner } from "@/actions/soner"
import { getKommuner } from "@/actions/settings"
import { getProduksjon } from "@/actions/produksjon"
import { getCurrentYear } from "@/lib/week-utils"
import { MunicipalityYearFilter } from "@/components/produksjon/MunicipalityYearFilter"
import { RuteplanTabs } from "./RuteplanTabs"

interface Props {
  searchParams: Promise<{ kommune?: string | string[]; aar?: string; tab?: string; empty?: string }>
}

export default async function RuteplanPage({ searchParams }: Props) {
  const params = await searchParams
  // Hämtar alla kommuner från settings (inte bara de med soner), annars kan
  // Thomas aldrig välja en tom kommune för att skapa första sonen där.
  const kommuner = await getKommuner()

  const isEmpty = params.empty === "1"
  let selectedKommuner: string[] = []
  if (params.kommune) {
    selectedKommuner = Array.isArray(params.kommune)
      ? params.kommune
      : params.kommune.split(",").map((s) => s.trim()).filter(Boolean)
  }
  // Default = alla. Explicit tomt urval hanteras via empty-flagga.
  if (!isEmpty && selectedKommuner.length === 0) selectedKommuner = kommuner

  const aar = params.aar ? parseInt(params.aar, 10) : getCurrentYear()
  const tab = params.tab || "gantt"

  // Hämta all data parallellt
  const [soner, allSoner, ruteplan, prevRuteplan, prevProduksjon, currentProduksjon] = await Promise.all([
    getSoner(selectedKommuner),
    getAllSoner(selectedKommuner),
    getRuteplan(selectedKommuner, aar),
    getRuteplan(selectedKommuner, aar - 1),
    getProduksjon(selectedKommuner, aar - 1),
    getProduksjon(selectedKommuner, aar),
  ])

  // Kontrollera om det finns utkast
  const hasUtkast = ruteplan.some((r) => r.status === "Utkast")

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h1
          className="text-lg font-semibold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-navy)" }}
        >
          Ruteplanlegger
        </h1>
        <Suspense fallback={null}>
          <MunicipalityYearFilter
            kommuner={kommuner}
            currentKommuner={selectedKommuner}
            currentYear={aar}
            isEmpty={isEmpty}
          />
        </Suspense>
      </div>

      <Suspense fallback={<div className="text-sm text-muted">Laster...</div>}>
        <RuteplanTabs
          soner={soner}
          allSoner={allSoner}
          ruteplan={ruteplan}
          prevRuteplan={prevRuteplan}
          prevProduksjon={prevProduksjon}
          currentProduksjon={currentProduksjon}
          kommune={selectedKommuner.length === 1 ? selectedKommuner[0] : ""}
          selectedKommuner={selectedKommuner}
          aar={aar}
          activeTab={tab}
          hasUtkast={hasUtkast}
        />
      </Suspense>
    </div>
  )
}
