import { Suspense } from "react"
import { getRessursStats } from "@/actions/ressurser"
import {
  BENCHMARK_TOMM_PER_DAG,
  BENCHMARK_KUBIK_PER_DAG,
} from "@/lib/ressurs-benchmarks"
import { getKommuner } from "@/actions/settings"
import { getCurrentYear } from "@/lib/week-utils"
import { MunicipalityYearFilter } from "@/components/produksjon/MunicipalityYearFilter"
import { RessursDashboard } from "@/components/produksjon/RessursDashboard"

interface Props {
  searchParams: Promise<{
    kommune?: string | string[]
    aar?: string
    fra?: string
    til?: string
    empty?: string
  }>
}

export default async function RessurserPage({ searchParams }: Props) {
  const params = await searchParams
  // Alla kommuner från settings — konsistent med Ruteplan-vyn.
  const kommuner = await getKommuner()

  const isEmpty = params.empty === "1"
  let selectedKommuner: string[] = []
  if (params.kommune) {
    selectedKommuner = Array.isArray(params.kommune)
      ? params.kommune
      : params.kommune.split(",").map((s) => s.trim()).filter(Boolean)
  }
  if (!isEmpty && selectedKommuner.length === 0) selectedKommuner = kommuner

  const aar = params.aar ? parseInt(params.aar, 10) : getCurrentYear()

  const { perBil, perOperator, periode } = await getRessursStats({
    kommuner: selectedKommuner,
    aar,
    fra: params.fra,
    til: params.til,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-serif)", color: "var(--color-navy)" }}
          >
            Produksjon per bil & operatør
          </h1>
          <p className="text-xs text-muted mt-1">
            Benchmark: {BENCHMARK_TOMM_PER_DAG} tømminger/dag · {BENCHMARK_KUBIK_PER_DAG} m³/dag
          </p>
        </div>
        <Suspense fallback={null}>
          <MunicipalityYearFilter
            kommuner={kommuner}
            currentKommuner={selectedKommuner}
            currentYear={aar}
            isEmpty={isEmpty}
          />
        </Suspense>
      </div>

      {periode.fra && (
        <div className="mb-4 text-xs text-muted font-mono">
          Data i perioden {periode.fra} → {periode.til} ({periode.antallDager} dager med tømming)
        </div>
      )}

      <RessursDashboard perBil={perBil} perOperator={perOperator} />
    </div>
  )
}
