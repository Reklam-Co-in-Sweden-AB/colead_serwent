import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getForms } from "@/actions/forms"

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Hämta all data parallellt
  const [
    { data: orders },
    { count: totalViews },
    { count: weekViews },
    { count: totalConversions },
    { count: weekConversions },
    { data: recentConversions },
    { data: utmSources },
    forms,
  ] = await Promise.all([
    supabase.from("orders").select("status, created_at"),
    supabase.from("serwent_form_views").select("*", { count: "exact", head: true }),
    supabase.from("serwent_form_views").select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from("serwent_conversions").select("*", { count: "exact", head: true }),
    supabase.from("serwent_conversions").select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from("serwent_conversions")
      .select("order_id, utm_source, utm_medium, utm_campaign, referrer, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("serwent_conversions")
      .select("utm_source"),
    getForms(),
  ])

  const stats = {
    ny: orders?.filter((o) => o.status === "ny").length || 0,
    under_behandling: orders?.filter((o) => o.status === "under_behandling").length || 0,
    utfort: orders?.filter((o) => o.status === "utfort").length || 0,
    total: orders?.length || 0,
  }

  const week = new Date()
  week.setDate(week.getDate() - 7)
  const recentOrderCount = orders?.filter((o) => new Date(o.created_at) > week).length || 0

  // Beräkna konverteringsgrad
  const convRate = (totalViews || 0) > 0
    ? Math.round(((totalConversions || 0) / (totalViews || 1)) * 1000) / 10
    : 0
  const weekConvRate = (weekViews || 0) > 0
    ? Math.round(((weekConversions || 0) / (weekViews || 1)) * 1000) / 10
    : 0

  // Aggregera UTM-källor
  const sourceMap = new Map<string, number>()
  for (const c of utmSources || []) {
    const src = c.utm_source || "direkt"
    sourceMap.set(src, (sourceMap.get(src) || 0) + 1)
  }
  const topSources = Array.from(sourceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  // Formatera datum
  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")} kl. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  return (
    <div>
      <h1 className="text-dark text-2xl font-bold mb-6">Dashboard</h1>

      {/* Bestilling-stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Totalt", value: stats.total, color: "#143b59" },
          { label: "Nye", value: stats.ny, color: "#E8321E" },
          { label: "Under behandling", value: stats.under_behandling, color: "#f59e0b" },
          { label: "Utført", value: stats.utfort, color: "#22c55e" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Konverteringsanalys */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="text-3xl font-bold" style={{ color: "#143b59" }}>{totalViews || 0}</div>
            <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">Visninger totalt</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-3xl font-bold" style={{ color: "#143b59" }}>{weekViews || 0}</div>
            <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">Visninger 7d</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-3xl font-bold text-teal">{convRate}%</div>
            <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">Konvertering totalt</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-3xl font-bold text-teal">{weekConvRate}%</div>
            <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">Konvertering 7d</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Siste 7 dager */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-dark text-lg font-bold mb-4">Siste 7 dager</h3>
            <div className="text-4xl font-bold text-teal mb-1">{recentOrderCount}</div>
            <p className="text-muted text-sm">nye bestillinger denne uken</p>
          </CardContent>
        </Card>

        {/* Trafikkkilder */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-dark text-lg font-bold mb-4">Trafikkkilder</h3>
            {topSources.length > 0 ? (
              <div className="space-y-2.5">
                {topSources.map(([source, count]) => {
                  const pct = Math.round((count / (totalConversions || 1)) * 100)
                  return (
                    <div key={source}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-dark capitalize">{source}</span>
                        <span className="text-xs font-mono text-muted">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted text-sm">Ingen data ennå</p>
            )}
          </CardContent>
        </Card>

        {/* Skjemaer */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-dark text-lg font-bold">Skjemaer</h3>
              <a href="/admin/forms" className="text-teal text-sm font-semibold no-underline hover:underline">
                Se alle
              </a>
            </div>
            <div className="flex flex-col gap-2">
              {forms.slice(0, 3).map((form: { id: string; name: string; slug: string; status: string }) => (
                <div key={form.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <div>
                    <span className="text-sm font-medium text-dark">{form.name}</span>
                    <span className="text-xs text-muted ml-2 font-mono">/{form.slug}</span>
                  </div>
                  <Badge variant={form.status === "published" ? "success" : "default"}>
                    {form.status === "published" ? "Publisert" : "Utkast"}
                  </Badge>
                </div>
              ))}
              {forms.length === 0 && (
                <p className="text-muted text-sm">Ingen skjemaer ennå</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Senaste konverteringar */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-dark text-lg font-bold mb-4">Siste konverteringer</h3>
          {(recentConversions?.length || 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-2 pr-4">Tidspunkt</th>
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-2 pr-4">Ordre-ID</th>
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-2 pr-4">Kilde</th>
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-2 pr-4">Medium</th>
                    <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider py-2">Kampanje</th>
                  </tr>
                </thead>
                <tbody>
                  {recentConversions?.map((c) => (
                    <tr key={c.order_id} className="border-b border-border last:border-b-0">
                      <td className="py-2 pr-4 text-xs font-mono text-muted whitespace-nowrap">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="py-2 pr-4 text-xs font-mono font-semibold text-dark">
                        {c.order_id}
                      </td>
                      <td className="py-2 pr-4">
                        {c.utm_source ? (
                          <Badge variant="default">{c.utm_source}</Badge>
                        ) : (
                          <span className="text-xs text-muted">direkt</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted">
                        {c.utm_medium || "–"}
                      </td>
                      <td className="py-2 text-xs text-muted">
                        {c.utm_campaign || "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted text-sm">Ingen konverteringer registrert ennå</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
