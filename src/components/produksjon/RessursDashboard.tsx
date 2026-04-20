"use client"

import { useState } from "react"
import type { RessursStats } from "@/actions/ressurser"
import {
  BENCHMARK_TOMM_PER_DAG,
  BENCHMARK_KUBIK_PER_DAG,
  type Zone,
} from "@/lib/ressurs-benchmarks"

interface Props {
  perBil: RessursStats[]
  perOperator: RessursStats[]
}

const zoneStyle: Record<Zone, { bg: string; border: string; label: string; labelBg: string }> = {
  green: {
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.35)",
    label: "#15803d",
    labelBg: "rgba(34,197,94,0.15)",
  },
  yellow: {
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.35)",
    label: "#92400e",
    labelBg: "rgba(245,158,11,0.18)",
  },
  red: {
    bg: "rgba(232,50,30,0.07)",
    border: "rgba(232,50,30,0.3)",
    label: "#E8321E",
    labelBg: "rgba(232,50,30,0.13)",
  },
}

const zoneLabels: Record<Zone, string> = {
  green: "Over benchmark",
  yellow: "Nær benchmark",
  red: "Under benchmark",
}

export function RessursDashboard({ perBil, perOperator }: Props) {
  const [tab, setTab] = useState<"bil" | "operator">("bil")
  const data = tab === "bil" ? perBil : perOperator

  const sammendrag = {
    grønn: data.filter((d) => d.zone === "green").length,
    gul: data.filter((d) => d.zone === "yellow").length,
    rød: data.filter((d) => d.zone === "red").length,
  }

  return (
    <div>
      {/* Tab-veksler */}
      <div className="flex items-center gap-3 mb-4">
        <div className="inline-flex bg-white border border-border rounded-lg p-0.5">
          {(["bil", "operator"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors"
              style={{
                background: tab === t ? "var(--color-navy)" : "transparent",
                color: tab === t ? "white" : "var(--color-muted)",
              }}
            >
              {t === "bil" ? "Per bil" : "Per operatør"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
            {sammendrag.grønn} grønn
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} />
            {sammendrag.gul} gul
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "#E8321E" }} />
            {sammendrag.rød} rød
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted">
            Ingen tømmedata i perioden. Kontroller at Comtech-filen inneholder{" "}
            {tab === "bil" ? "bil-kolonne" : "tømmerpasser-kolonne"}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((r) => (
            <Kort key={r.navn} r={r} />
          ))}
        </div>
      )}
    </div>
  )
}

function Kort({ r }: { r: RessursStats }) {
  const z = zoneStyle[r.zone]
  const perDagProsent = Math.min(
    150,
    Math.round((r.perDag / BENCHMARK_TOMM_PER_DAG) * 100)
  )
  const kubikProsent = Math.min(
    150,
    Math.round((r.kubikPerDag / BENCHMARK_KUBIK_PER_DAG) * 100)
  )

  return (
    <div
      className="rounded-xl p-4 border-2 shadow-sm"
      style={{ background: z.bg, borderColor: z.border }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="font-semibold text-sm" style={{ color: "var(--color-navy)" }}>
          {r.navn}
        </div>
        <span
          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
          style={{ background: z.labelBg, color: z.label }}
        >
          {zoneLabels[r.zone]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <MaltKpi
          label="Tømm/dag"
          verdi={r.perDag.toFixed(1)}
          benchmark={BENCHMARK_TOMM_PER_DAG}
          prosent={perDagProsent}
          zoneColor={z.label}
        />
        <MaltKpi
          label="Kubikk/dag"
          verdi={r.kubikPerDag.toFixed(1)}
          benchmark={BENCHMARK_KUBIK_PER_DAG}
          prosent={kubikProsent}
          zoneColor={z.label}
        />
      </div>

      <div className="flex items-center justify-between pt-3 border-t text-[11px]" style={{ borderColor: z.border }}>
        <span className="text-muted">
          {r.dager} {r.dager === 1 ? "dag" : "dager"} · {r.antall} tømminger
        </span>
        <span className="font-mono font-semibold" style={{ color: "var(--color-navy)" }}>
          {r.totalVolum.toFixed(1)} m³
        </span>
      </div>
    </div>
  )
}

function MaltKpi({
  label,
  verdi,
  benchmark,
  prosent,
  zoneColor,
}: {
  label: string
  verdi: string
  benchmark: number
  prosent: number
  zoneColor: string
}) {
  return (
    <div>
      <div className="text-[9px] font-bold text-muted uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-lg font-mono font-bold" style={{ color: zoneColor }}>
          {verdi}
        </span>
        <span className="text-[10px] text-muted">/ {benchmark}</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, prosent)}%`,
            background: zoneColor,
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  )
}
