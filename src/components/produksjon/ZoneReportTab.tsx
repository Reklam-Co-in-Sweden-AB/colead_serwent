"use client"

import { useState } from "react"
import type { Sone, Ruteplan, Produksjon, RodeNotat } from "@/types/produksjon"
import { RodeNotatPanel } from "./RodeNotatPanel"

interface Props {
  soner: Sone[]
  currentPlan: Ruteplan[]
  currentProd: Produksjon[]
  prevPlan: Ruteplan[]
  prevProd: Produksjon[]
  aar: number
  notater: RodeNotat[]
  currentUserEmail?: string | null
}

export function ZoneReportTab({ soner, currentPlan, currentProd, prevPlan, prevProd, aar, notater, currentUserEmail }: Props) {
  const [selectedSone, setSelectedSone] = useState<string>("all")

  const filteredSoner = selectedSone === "all"
    ? soner
    : soner.filter((s) => s.id === selectedSone)

  // Bygg maps
  const prevPlanMap = new Map<string, number>()
  for (const r of prevPlan) {
    prevPlanMap.set(`${r.sone_id}:${r.uke}`, r.planlagt)
  }

  const prevProdMap = new Map<string, number>()
  for (const p of prevProd) {
    prevProdMap.set(`${p.sone_id}:${p.uke}`, p.kjort_rute)
  }

  const currentPlanMap = new Map<string, number>()
  for (const r of currentPlan) {
    currentPlanMap.set(`${r.sone_id}:${r.uke}`, r.planlagt)
  }

  const currentProdMap = new Map<string, number>()
  for (const p of currentProd) {
    currentProdMap.set(`${p.sone_id}:${p.uke}`, p.kjort_rute)
  }

  // Samla alla veckor — inkludera veckor med produksjonsdata
  const allWeeks = new Set<number>()
  for (const r of [...prevPlan, ...currentPlan]) allWeeks.add(r.uke)
  for (const p of [...prevProd, ...currentProd]) allWeeks.add(p.uke)
  const weeks = Array.from(allWeeks).sort((a, b) => a - b)

  return (
    <div>
      {/* Filter */}
      <div className="mb-4">
        <select
          value={selectedSone}
          onChange={(e) => setSelectedSone(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm font-mono font-semibold border border-border bg-white cursor-pointer"
          style={{ color: "var(--color-navy)" }}
        >
          <option value="all">Alle soner</option>
          {soner.map((s) => (
            <option key={s.id} value={s.id}>{s.navn}</option>
          ))}
        </select>
      </div>

      {filteredSoner.map((sone) => {
        const soneWeeks = weeks.filter((uke) =>
          prevPlanMap.has(`${sone.id}:${uke}`) ||
          prevProdMap.has(`${sone.id}:${uke}`) ||
          currentPlanMap.has(`${sone.id}:${uke}`) ||
          currentProdMap.has(`${sone.id}:${uke}`)
        )

        if (soneWeeks.length === 0) return null

        // Totaler
        const totalPrevPlan = soneWeeks.reduce((s, u) => s + (prevPlanMap.get(`${sone.id}:${u}`) || 0), 0)
        const totalPrevProd = soneWeeks.reduce((s, u) => s + (prevProdMap.get(`${sone.id}:${u}`) || 0), 0)
        const totalNewPlan = soneWeeks.reduce((s, u) => s + (currentPlanMap.get(`${sone.id}:${u}`) || 0), 0)
        const totalNewProd = soneWeeks.reduce((s, u) => s + (currentProdMap.get(`${sone.id}:${u}`) || 0), 0)

        return (
          <div key={sone.id} className="bg-white border border-border rounded-xl shadow-sm mb-4 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: sone.farge }} />
              <span className="text-sm font-semibold" style={{ color: "var(--color-navy)" }}>
                {sone.navn}
              </span>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white border-b border-border">
                  <th className="text-left text-[10px] font-bold text-muted uppercase tracking-wider px-4 py-2">Uke</th>
                  <th className="text-right text-[10px] font-bold text-muted uppercase tracking-wider px-4 py-2">Plan {aar - 1}</th>
                  <th className="text-right text-[10px] font-bold text-muted uppercase tracking-wider px-4 py-2">Faktisk {aar - 1}</th>
                  <th className="text-right text-[10px] font-bold text-muted uppercase tracking-wider px-4 py-2">Plan {aar}</th>
                  <th className="text-right text-[10px] font-bold text-muted uppercase tracking-wider px-4 py-2">Faktisk {aar}</th>
                  <th className="text-right text-[10px] font-bold text-muted uppercase tracking-wider px-4 py-2">Restanse {aar}</th>
                </tr>
              </thead>
              <tbody>
                {soneWeeks.map((uke) => {
                  const prevP = prevPlanMap.get(`${sone.id}:${uke}`) || 0
                  const prevA = prevProdMap.get(`${sone.id}:${uke}`) || 0
                  const newP = currentPlanMap.get(`${sone.id}:${uke}`) || 0
                  const newA = currentProdMap.get(`${sone.id}:${uke}`) || 0
                  // Restanse: plan minus faktisk (negativt = gjort mer enn planlagt)
                  const restanse = newP > 0 ? newP - newA : 0

                  return (
                    <tr key={uke} className="border-b border-border hover:bg-navy-soft/50">
                      <td className="px-4 py-2 text-xs font-mono font-semibold" style={{ color: "var(--color-navy)" }}>
                        V{uke}
                      </td>
                      <td className="text-right px-4 py-2 text-xs font-mono text-muted">
                        {prevP || "—"}
                      </td>
                      <td className="text-right px-4 py-2 text-xs font-mono text-muted">
                        {prevA || "—"}
                      </td>
                      <td className="text-right px-4 py-2 text-xs font-mono font-semibold" style={{ color: "var(--color-navy)" }}>
                        {newP || "—"}
                      </td>
                      <td className="text-right px-4 py-2 text-xs font-mono font-semibold" style={{ color: newA > 0 ? "var(--color-navy)" : undefined }}>
                        {newA || "—"}
                      </td>
                      <td className="text-right px-4 py-2 text-xs font-mono font-bold">
                        {newP > 0 && restanse !== 0 ? (
                          <span style={{ color: restanse <= 0 ? "#22c55e" : "#E8321E" }}>
                            {restanse <= 0 ? "✓" : restanse}
                          </span>
                        ) : newP > 0 && restanse === 0 && newA > 0 ? (
                          <span style={{ color: "#22c55e" }}>✓</span>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}

                {/* Totalrad */}
                <tr className="border-t-2 border-border bg-background/50">
                  <td className="px-4 py-2 text-xs font-bold uppercase" style={{ color: "var(--color-navy)" }}>
                    Totalt
                  </td>
                  <td className="text-right px-4 py-2 text-xs font-mono font-semibold text-muted">
                    {totalPrevPlan || "—"}
                  </td>
                  <td className="text-right px-4 py-2 text-xs font-mono font-semibold text-muted">
                    {totalPrevProd || "—"}
                  </td>
                  <td className="text-right px-4 py-2 text-xs font-mono font-bold" style={{ color: "var(--color-navy)" }}>
                    {totalNewPlan || "—"}
                  </td>
                  <td className="text-right px-4 py-2 text-xs font-mono font-bold" style={{ color: "var(--color-navy)" }}>
                    {totalNewProd || "—"}
                  </td>
                  <td className="text-right px-4 py-2 text-xs font-mono font-bold">
                    {totalNewPlan > 0 && (() => {
                      const totalRestanse = totalNewPlan - totalNewProd
                      return totalRestanse <= 0 ? (
                        <span style={{ color: "#22c55e" }}>✓</span>
                      ) : (
                        <span style={{ color: "#E8321E" }}>{totalRestanse}</span>
                      )
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
            <RodeNotatPanel
              soneId={sone.id}
              aar={aar}
              notater={notater.filter((n) => n.sone_id === sone.id)}
              currentUserEmail={currentUserEmail}
            />
          </div>
        )
      })}
    </div>
  )
}
