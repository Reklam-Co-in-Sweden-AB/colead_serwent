import { KomtekImport } from "@/components/komtek/KomtekImport"
import { ImportLog, type ImportLogEntry } from "@/components/komtek/ImportLog"
import { getKommuner } from "@/actions/settings"
import { createClient } from "@/lib/supabase/server"

export default async function KomtekPage() {
  const supabase = await createClient()

  const [kommuner, { data: logEntries }] = await Promise.all([
    getKommuner(),
    supabase
      .from("serwent_komtek_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  return (
    <div>
      <h1 className="text-dark text-2xl font-bold mb-6">Komtek-import</h1>
      <div className="space-y-6">
        <KomtekImport kommuner={kommuner} />
        <ImportLog entries={(logEntries as ImportLogEntry[]) || []} />
      </div>
    </div>
  )
}
