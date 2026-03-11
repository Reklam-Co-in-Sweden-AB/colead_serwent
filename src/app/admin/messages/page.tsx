import { Card, CardContent } from "@/components/ui/card"
import { TemplateManager } from "@/components/messages/TemplateManager"
import { getTemplates } from "@/actions/messages"

export default async function MessagesPage() {
  const result = await getTemplates()
  const templates = ("data" in result ? result.data : []) as {
    id: string
    name: string
    channel: string
    recipient_type: string
    subject: string | null
    body: string
    created_at: string | null
  }[]

  return (
    <div>
      <h1 className="text-dark text-2xl font-bold mb-6">Meldinger</h1>
      <Card>
        <CardContent className="p-6">
          <TemplateManager initialTemplates={templates} />
        </CardContent>
      </Card>
    </div>
  )
}
