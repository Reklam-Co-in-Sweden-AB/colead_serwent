import { redirect } from "next/navigation"
import { getReportData } from "@/actions/reports"
import { ReportDashboard } from "@/components/reports/ReportDashboard"
import { hasRole } from "@/actions/roles"

interface Props {
  searchParams: Promise<{ fra?: string; til?: string }>
}

export default async function RapporterPage({ searchParams }: Props) {
  // Bara super_admin har åtkomst
  const allowed = await hasRole("super_admin")
  if (!allowed) redirect("/admin")

  const params = await searchParams

  const now = new Date()
  const defaultFrom = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0]
  const defaultTo = now.toISOString().split("T")[0]

  const fra = params.fra || defaultFrom
  const til = params.til || defaultTo

  const data = await getReportData(fra, til)

  return <ReportDashboard data={data} fra={fra} til={til} />
}
