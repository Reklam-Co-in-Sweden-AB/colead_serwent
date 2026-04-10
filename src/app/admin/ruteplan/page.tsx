import { Suspense } from "react"
import { getRuteplan } from "@/actions/ruteplan"
import { getSoner, getAllSoner, getKommunerWithSoner } from "@/actions/soner"
import { getProduksjon } from "@/actions/produksjon"
import { getCurrentYear } from "@/lib/week-utils"
import { MunicipalityYearFilter } from "@/components/produksjon/MunicipalityYearFilter"
import { RuteplanTabs } from "./RuteplanTabs"

interface Props {
  searchParams: Promise<{ kommune?: string; aar?: string; tab?: string }>
}

export default async function RuteplanPage({ searchParams }: Props) {
  const params = await searchParams
  const kommuner = await getKommunerWithSoner()
  const kommune = params.kommune || kommuner[0] || "Gjøvik"
  const aar = params.aar ? parseInt(params.aar, 10) : getCurrentYear()
  const tab = params.tab || "gantt"

  // Hämta all data parallellt
  const [soner, allSoner, ruteplan, prevRuteplan, prevProduksjon, currentProduksjon] = await Promise.all([
    getSoner(kommune),
    getAllSoner(kommune),
    getRuteplan(kommune, aar),
    getRuteplan(kommune, aar - 1),
    getProduksjon(kommune, aar - 1),
    getProduksjon(kommune, aar),
  ])

  // Kontrollera om det finns utkast
  const hasUtkast = ruteplan.some((r) => r.status === "Utkast")

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-lg font-semibold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-navy)" }}
        >
          Ruteplanlegger
        </h1>
        <Suspense fallback={null}>
          <MunicipalityYearFilter
            kommuner={kommuner.length > 0 ? kommuner : [kommune]}
            currentKommune={kommune}
            currentYear={aar}
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
          kommune={kommune}
          aar={aar}
          activeTab={tab}
          hasUtkast={hasUtkast}
        />
      </Suspense>
    </div>
  )
}
