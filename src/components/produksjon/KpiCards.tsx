import type { ProduksjonStats } from "@/types/produksjon"

interface Props {
  stats: ProduksjonStats
  currentWeek: number
}

export function KpiCards({ stats, currentWeek }: Props) {
  const cards = [
    {
      label: "Planlagt (helår)",
      value: stats.totalPlanlagt.toLocaleString("nb-NO"),
      sub: "tømminger totalt",
      color: "var(--color-navy)",
      accent: true,
    },
    {
      label: "Kjørt hittil",
      value: stats.totalKjort.toLocaleString("nb-NO"),
      sub: `t.o.m. uke ${currentWeek} · ${stats.totalPlanlagt > 0 ? Math.round((stats.totalKjort / stats.totalPlanlagt) * 100) : 0}% av plan`,
      color: "#22c55e",
    },
    {
      label: "Bestillingstømminger",
      value: stats.totalBestilling.toLocaleString("nb-NO"),
      sub: `ekstra · ${stats.totalKjort > 0 ? Math.round((stats.totalBestilling / (stats.totalKjort + stats.totalBestilling)) * 100) : 0}% av total`,
      color: "#f59e0b",
    },
    {
      label: "Restanse",
      value: stats.restanse.toLocaleString("nb-NO"),
      sub: "t.o.m. denne uken",
      color: "var(--color-red)",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white border border-border rounded-xl p-5 shadow-sm"
          style={card.accent ? { borderLeft: "3px solid var(--color-red)" } : undefined}
        >
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
            {card.label}
          </div>
          <div
            className="text-[28px] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-serif)", color: card.color }}
          >
            {card.value}
          </div>
          <div className="text-[11px] text-muted mt-1">{card.sub}</div>
        </div>
      ))}
    </div>
  )
}
