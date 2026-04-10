import { getKommuner } from "@/actions/settings"
import { ExportClient } from "./ExportClient"

export default async function ExportPage() {
  const kommuner = await getKommuner()

  return (
    <div>
      <h1 className="text-dark text-2xl font-bold mb-6">Eksport</h1>
      <ExportClient kommuner={kommuner} />
    </div>
  )
}
