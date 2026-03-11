import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getForms } from "@/actions/forms"

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from("orders")
    .select("status, created_at")

  const forms = await getForms()

  const stats = {
    ny: orders?.filter((o) => o.status === "ny").length || 0,
    under_behandling: orders?.filter((o) => o.status === "under_behandling").length || 0,
    utfort: orders?.filter((o) => o.status === "utfort").length || 0,
    total: orders?.length || 0,
  }

  // Last 7 days
  const week = new Date()
  week.setDate(week.getDate() - 7)
  const recentCount = orders?.filter((o) => new Date(o.created_at) > week).length || 0

  return (
    <div>
      <h1 className="text-dark text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-dark text-lg font-bold mb-4">Siste 7 dager</h3>
            <div className="text-4xl font-bold text-teal mb-1">{recentCount}</div>
            <p className="text-muted text-sm">nye bestillinger denne uken</p>
          </CardContent>
        </Card>

        {/* Forms */}
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
    </div>
  )
}
