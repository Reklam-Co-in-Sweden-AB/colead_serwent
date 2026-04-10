"use client"

import { useState } from "react"
import { GanttGrid } from "@/components/produksjon/GanttGrid"
import { HistoryPanel } from "@/components/produksjon/HistoryPanel"
import { ZoneReportTab } from "@/components/produksjon/ZoneReportTab"
import { ZoneAdminTab } from "@/components/produksjon/ZoneAdminTab"
import { PublishButton } from "@/components/produksjon/PublishButton"
import { copyPreviousYear, resetRuteplan } from "@/actions/ruteplan"
import { TommingPanel } from "@/components/produksjon/TommingPanel"
import type { Sone, Ruteplan, Produksjon } from "@/types/produksjon"
import { useTransition } from "react"

interface Props {
  soner: Sone[]
  allSoner: Sone[]
  ruteplan: Ruteplan[]
  prevRuteplan: Ruteplan[]
  prevProduksjon: Produksjon[]
  currentProduksjon: Produksjon[]
  kommune: string
  aar: number
  activeTab: string
  hasUtkast: boolean
}

const TABS = [
  { id: "gantt", label: "Gantt-oversikt" },
  { id: "report", label: "Sonerapport" },
  { id: "admin", label: "Administrasjon av soner" },
]

export function RuteplanTabs({
  soner,
  allSoner,
  ruteplan,
  prevRuteplan,
  prevProduksjon,
  currentProduksjon,
  kommune,
  aar,
  activeTab,
  hasUtkast,
}: Props) {
  const [tab, setTab] = useState(activeTab)
  const [kapasitet, setKapasitet] = useState(50)
  const [historyZone, setHistoryZone] = useState<Sone | null>(null)
  const [showCurrentYear, setShowCurrentYear] = useState(false)
  const [tommingDetail, setTommingDetail] = useState<{ sone: Sone; uke: number } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleCopyPrev = () => {
    if (!confirm(`Kopiere planen fra ${aar - 1} til ${aar}?`)) return
    startTransition(async () => {
      await copyPreviousYear(kommune, aar - 1, aar, kapasitet)
    })
  }

  const handleReset = () => {
    if (!confirm(`Nullstille alle utkast for ${kommune} ${aar}?`)) return
    startTransition(async () => {
      await resetRuteplan(kommune, aar)
    })
  }

  // Bygg historikdata för GanttGrid — aktuellt eller föregående år
  const activeProd = showCurrentYear ? currentProduksjon : prevProduksjon
  const historyProdData = activeProd.map((p) => ({
    sone_id: p.sone_id,
    uke: p.uke,
    kjort_rute: p.kjort_rute,
    planlagt: 0,
  }))

  return (
    <div>
      {/* Flikar */}
      <div className="flex bg-white border-b-[1.5px] border-border mb-5" style={{ margin: "0 -2rem", padding: "0 2rem" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2.5 text-xs font-semibold cursor-pointer transition-colors border-b-2 -mb-[1.5px]"
            style={{
              color: tab === t.id ? "var(--color-navy)" : "var(--color-muted)",
              borderBottomColor: tab === t.id ? "var(--color-red)" : "transparent",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.id ? "2px solid var(--color-red)" : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Gantt-flik */}
      {tab === "gantt" && (
        <>
          {/* Kontroller */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyPrev}
                disabled={isPending}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold border border-border bg-white cursor-pointer hover:border-navy transition-colors disabled:opacity-50"
                style={{ color: "var(--color-navy)" }}
              >
                Kopier forrige år →
              </button>
              <button
                onClick={handleReset}
                disabled={isPending}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold border border-border bg-white cursor-pointer hover:border-navy transition-colors disabled:opacity-50"
                style={{ color: "var(--color-navy)" }}
              >
                Nullstill plan
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-background rounded-lg p-1">
                <button
                  onClick={() => setShowCurrentYear(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all"
                  style={{
                    background: !showCurrentYear ? "var(--color-navy)" : "transparent",
                    color: !showCurrentYear ? "white" : "var(--color-muted)",
                  }}
                >
                  {aar - 1} faktisk
                </button>
                <button
                  onClick={() => setShowCurrentYear(true)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all"
                  style={{
                    background: showCurrentYear ? "var(--color-navy)" : "transparent",
                    color: showCurrentYear ? "white" : "var(--color-muted)",
                  }}
                >
                  {aar} faktisk
                </button>
              </div>
              <PublishButton kommune={kommune} aar={aar} hasUtkast={hasUtkast} />
            </div>
          </div>

          {soner.length === 0 ? (
            <div className="bg-white border border-border rounded-xl p-12 text-center">
              <p className="text-sm text-muted">
                Ingen aktive soner. Gå til &quot;Administrasjon av soner&quot; for å opprette soner.
              </p>
            </div>
          ) : (
            <GanttGrid
              soner={soner}
              ruteplan={ruteplan}
              historyPlan={showCurrentYear ? ruteplan : prevRuteplan}
              historyProd={historyProdData}
              aar={aar}
              onZoneClick={setHistoryZone}
              onHistoryCellClick={(sone, uke) => setTommingDetail({ sone, uke })}
              historyLabel={showCurrentYear ? `${aar} faktisk` : `${aar - 1} faktisk`}
            />
          )}

          {/* Legend */}
          <div className="flex gap-4 flex-wrap mt-3.5">
            {[
              { bg: "rgba(27,58,107,0.15)", border: "rgba(27,58,107,0.3)", label: `Planlagt ${aar}` },
              { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.3)", label: "Historikk ≥95%" },
              { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)", label: "Historikk ≥75%" },
              { bg: "rgba(232,50,30,0.1)", border: "rgba(232,50,30,0.25)", label: "Historikk <75%" },
              { bg: "var(--color-surface, #fff)", border: "var(--color-border)", label: "Ikke planlagt" },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-muted">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: item.bg, border: `1.5px solid ${item.border}` }}
                />
                {item.label}
              </span>
            ))}
          </div>

          {/* Historikpanel */}
          {historyZone && (
            <HistoryPanel
              sone={historyZone}
              aar={aar}
              onClose={() => setHistoryZone(null)}
            />
          )}

          {/* Tömningsdetaljer */}
          {tommingDetail && (
            <TommingPanel
              sone={tommingDetail.sone}
              aar={showCurrentYear ? aar : aar - 1}
              uke={tommingDetail.uke}
              onClose={() => setTommingDetail(null)}
            />
          )}
        </>
      )}

      {/* Sonerapport-flik */}
      {tab === "report" && (
        <ZoneReportTab
          soner={soner}
          currentPlan={ruteplan}
          currentProd={currentProduksjon}
          prevPlan={prevRuteplan}
          prevProd={prevProduksjon}
          aar={aar}
        />
      )}

      {/* Administrasjon-flik */}
      {tab === "admin" && (
        <ZoneAdminTab soner={allSoner} kommune={kommune} />
      )}
    </div>
  )
}
