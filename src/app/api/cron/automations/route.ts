import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { runScheduledAutomation, calculateNextRunAt } from "@/lib/automations"

// Vercel Cron anropar denna route var 5:e minut
// Skyddas med CRON_SECRET i Authorization-headern
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Obehörig" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Hämta schemalagda automationer som ska köras
  const { data: automations, error } = await supabase
    .from("automations")
    .select(`
      *,
      automation_actions (*)
    `)
    .eq("trigger_type", "scheduled")
    .eq("enabled", true)
    .lte("next_run_at", now)
    .not("next_run_at", "is", null)

  if (error) {
    console.error("Feil ved henting av schemalagda automationer:", error)
    return NextResponse.json({ error: "Databasefeil" }, { status: 500 })
  }

  if (!automations || automations.length === 0) {
    return NextResponse.json({ executed: 0 })
  }

  let executed = 0
  let failed = 0

  for (const automation of automations) {
    try {
      await runScheduledAutomation(automation)

      // Uppdatera last_run_at och beräkna nästa körning
      const config = automation.trigger_config as Record<string, unknown>
      const scheduleType = config.schedule_type as string

      const nextRun = scheduleType === "recurring"
        ? calculateNextRunAt(config)
        : null // Engångskörning — ingen nästa

      await supabase
        .from("automations")
        .update({
          last_run_at: now,
          next_run_at: nextRun,
          // Inaktivera engångsautomationer efter körning
          ...(scheduleType === "once" ? { enabled: false } : {}),
        })
        .eq("id", automation.id)

      executed++
    } catch (err) {
      console.error(`Schemalagd automation ${automation.id} misslyckades:`, err)

      // Logga felet
      await supabase.from("automation_logs").insert({
        automation_id: automation.id,
        status: "failed",
        details: `Schemalagt jobb misslyckades: ${(err as Error).message}`,
      })

      failed++
    }
  }

  return NextResponse.json({ executed, failed })
}
