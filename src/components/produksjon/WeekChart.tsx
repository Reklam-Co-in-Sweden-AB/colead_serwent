"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import type { WeekSummary } from "@/types/produksjon"

interface Props {
  data: WeekSummary[]
  onWeekClick?: (uke: number) => void
}

export function WeekChart({ data, onWeekClick }: Props) {
  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-5">
      <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-4">
        Ukeoversikt — planlagt vs kjørt
      </div>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            onClick={(e) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const payload = (e as any)?.activePayload?.[0]?.payload
              if (payload?.uke && onWeekClick) {
                onWeekClick(payload.uke)
              }
            }}
            style={{ cursor: onWeekClick ? "pointer" : "default" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
            <XAxis
              dataKey="uke"
              tickFormatter={(v) => `V${v}`}
              tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value, name) => [String(value), String(name)]}
              labelFormatter={(label) => `Uke ${label}`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Bar dataKey="planlagt" name="Planlagt" fill="#d0d8e4" stackId="a" radius={[2, 2, 0, 0]} />
            <Bar dataKey="kjort_rute" name="Kjørt rute" fill="#22c55e" stackId="b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="kjort_best" name="Bestillingstømminger" fill="#f59e0b" stackId="b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="restanse" name="Restanse" fill="rgba(232,50,30,0.45)" stackId="b" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2.5 flex-wrap">
        {[
          { color: "#1B3A6B", label: "Planlagt" },
          { color: "#22c55e", label: "Kjørt rute" },
          { color: "#f59e0b", label: "Bestillingstømminger" },
          { color: "rgba(232,50,30,0.45)", label: "Restanse" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-muted">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
