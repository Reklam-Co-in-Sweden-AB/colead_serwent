import { Card, CardContent } from "@/components/ui/card"
import { AutomationManager } from "@/components/automations/AutomationManager"
import { getAutomations, getAutomationLogs } from "@/actions/automations"
import { getTemplates } from "@/actions/messages"

export default async function AutomationsPage() {
  const [automations, templatesResult, logs] = await Promise.all([
    getAutomations(),
    getTemplates(),
    getAutomationLogs(),
  ])

  const templates = ("data" in templatesResult ? templatesResult.data : []) as {
    id: string
    name: string
    channel: string
    recipient_type: string
  }[]

  return (
    <div>
      <h1 className="text-dark text-2xl font-bold mb-6">Automasjoner</h1>
      <Card>
        <CardContent className="p-6">
          <AutomationManager
            initialAutomations={automations}
            templates={templates}
            logs={logs}
          />
        </CardContent>
      </Card>
    </div>
  )
}
