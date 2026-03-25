"use client"

import { useState } from "react"
import { createAutomation, updateAutomation, toggleAutomation, deleteAutomation, runAutomationManually } from "@/actions/automations"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS, ORDER_STATUSES, type OrderStatus } from "@/lib/constants"

type Template = {
  id: string
  name: string
  channel: string
  recipient_type: string
}

type AutomationAction = {
  id: string
  action_type: string
  action_config: Record<string, unknown>
  position: number
}

type Automation = {
  id: string
  name: string
  enabled: boolean
  trigger_type: string
  trigger_config: Record<string, unknown>
  automation_actions: AutomationAction[]
  created_at: string | null
}

type LogEntry = {
  id: string
  automation_id: string
  order_id: string | null
  status: string
  details: string | null
  created_at: string | null
}

const TRIGGER_TYPES = [
  { value: "new_order", label: "Ny bestilling" },
  { value: "status_change", label: "Statusendring" },
  { value: "scheduled", label: "Planlagt" },
] as const

const WEEKDAYS = [
  { value: 0, label: "Man" },
  { value: 1, label: "Tir" },
  { value: 2, label: "Ons" },
  { value: 3, label: "Tor" },
  { value: 4, label: "Fre" },
  { value: 5, label: "Lør" },
  { value: 6, label: "Søn" },
] as const

const ACTION_TYPES = [
  { value: "send_sms", label: "Send SMS" },
  { value: "send_email", label: "Send e-post" },
  { value: "change_status", label: "Endre status" },
  { value: "webhook", label: "Webhook" },
] as const

type AutomationPreset = {
  name: string
  description: string
  trigger_type: string
  trigger_config: Record<string, unknown>
  actions: { action_type: string; action_config: Record<string, unknown> }[]
}

const AUTOMATION_PRESETS: AutomationPreset[] = [
  {
    name: "Bekreftelse-SMS til kunden",
    description: "Send SMS til kunden når en ny bestilling mottas.",
    trigger_type: "new_order",
    trigger_config: {},
    actions: [
      { action_type: "send_sms", action_config: { message: "Hei {{navn}}! Din bestilling ({{order_id}}) for {{tomming_type}} i {{kommune}} er mottatt. Vi kontakter deg snart. /Serwent" } },
    ],
  },
  {
    name: "E-postvarsel til Serwent",
    description: "Send e-post til kontoret når en ny bestilling registreres.",
    trigger_type: "new_order",
    trigger_config: {},
    actions: [
      { action_type: "send_email", action_config: { message: "Ny bestilling!\n\nNavn: {{navn}}\nE-post: {{epost}}\nTelefon: {{telefon}}\nKommune: {{kommune}}\nType: {{tomming_type}}\nAdresse: {{adresse}}\n\nLogg inn i admin for å håndtere bestillingen.", subject: "Ny bestilling: {{navn}} — {{kommune}}" } },
    ],
  },
  {
    name: "Bekreftelse-e-post til kunden",
    description: "Send bekreftelse via e-post til kunden ved ny bestilling.",
    trigger_type: "new_order",
    trigger_config: {},
    actions: [
      { action_type: "send_email", action_config: { message: "Hei {{navn}},\n\nTakk for din bestilling av {{tomming_type}} i {{kommune}}.\n\nBestillings-ID: {{order_id}}\nAdresse: {{adresse}}\n\nTømming vil bli utført iht. tidsfrister satt i rammeverk mellom oppdragsgiver og kommune.\n\nMed vennlig hilsen,\nSerwent AS", subject: "Bestilling mottatt — {{order_id}}" } },
    ],
  },
  {
    name: "SMS ved under behandling",
    description: "Send SMS til kunden når bestillingen settes under behandling.",
    trigger_type: "status_change",
    trigger_config: { to_status: "under_behandling" },
    actions: [
      { action_type: "send_sms", action_config: { message: "Hei {{navn}}! Din bestilling ({{order_id}}) er nå under behandling. Vi tar kontakt for å avtale tidspunkt. /Serwent" } },
    ],
  },
  {
    name: "SMS ved utført",
    description: "Send SMS til kunden når tømmingen er utført.",
    trigger_type: "status_change",
    trigger_config: { to_status: "utfort" },
    actions: [
      { action_type: "send_sms", action_config: { message: "Hei {{navn}}! Tømmingen ({{order_id}}) er nå utført. Takk for at du bruker Serwent! /Serwent" } },
    ],
  },
  {
    name: "Webhook ved ny bestilling",
    description: "Send bestillingsdata til et eksternt system via webhook.",
    trigger_type: "new_order",
    trigger_config: {},
    actions: [
      { action_type: "webhook", action_config: { webhook_url: "" } },
    ],
  },
  {
    name: "Daglig påminnelse for ubehandlede bestillinger",
    description: "Send SMS til kunder med status 'Ny' som er eldre enn 3 dager, hver ukedag kl. 09:00.",
    trigger_type: "scheduled",
    trigger_config: {
      schedule_type: "recurring",
      schedule_time: "09:00",
      schedule_days: [0, 1, 2, 3, 4],
      order_filter: { status: "ny", older_than_days: 3 },
    },
    actions: [
      { action_type: "send_sms", action_config: { message: "Hei {{navn}}! Vi har mottatt bestillingen din ({{order_id}}) for {{tomming_type}} i {{kommune}}, men har ikke fått behandlet den ennå. Vi tar kontakt snart! /Serwent" } },
    ],
  },
]

interface AutomationManagerProps {
  initialAutomations: Automation[]
  templates: Template[]
  logs: LogEntry[]
}

export function AutomationManager({ initialAutomations, templates, logs }: AutomationManagerProps) {
  const [automations, setAutomations] = useState(initialAutomations)
  const [showForm, setShowForm] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingPresetIndex, setSavingPresetIndex] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [triggerType, setTriggerType] = useState<string>("new_order")
  const [fromStatus, setFromStatus] = useState("")
  const [toStatus, setToStatus] = useState("")
  const [actions, setActions] = useState<{ action_type: string; action_config: Record<string, unknown> }[]>([])

  // Schemaläggningsinställningar
  const [scheduleType, setScheduleType] = useState<"once" | "recurring">("recurring")
  const [scheduleTime, setScheduleTime] = useState("09:00")
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleDays, setScheduleDays] = useState<number[]>([0, 1, 2, 3, 4]) // Mån-fre
  const [filterStatus, setFilterStatus] = useState("")
  const [filterOlderThan, setFilterOlderThan] = useState("")

  function resetForm() {
    setName("")
    setTriggerType("new_order")
    setFromStatus("")
    setToStatus("")
    setActions([])
    setScheduleType("recurring")
    setScheduleTime("09:00")
    setScheduleDate("")
    setScheduleDays([0, 1, 2, 3, 4])
    setFilterStatus("")
    setFilterOlderThan("")
    setShowForm(false)
    setShowPresets(false)
    setEditingId(null)
    setError("")
  }

  function editAutomation(a: Automation) {
    setEditingId(a.id)
    setName(a.name)
    setTriggerType(a.trigger_type)
    const tc = a.trigger_config as Record<string, unknown>
    setFromStatus((tc.from_status as string) || "")
    setToStatus((tc.to_status as string) || "")
    if (a.trigger_type === "scheduled") {
      setScheduleType((tc.schedule_type as "once" | "recurring") || "recurring")
      setScheduleTime((tc.schedule_time as string) || "09:00")
      setScheduleDate((tc.schedule_date as string) || "")
      setScheduleDays((tc.schedule_days as number[]) || [0, 1, 2, 3, 4])
      const filter = tc.order_filter as Record<string, unknown> | undefined
      setFilterStatus((filter?.status as string) || "")
      setFilterOlderThan(filter?.older_than_days ? String(filter.older_than_days) : "")
    }
    setActions(
      a.automation_actions
        .sort((x, y) => x.position - y.position)
        .map((act) => ({ action_type: act.action_type, action_config: act.action_config }))
    )
    setShowForm(true)
    setShowPresets(false)
    setShowLogs(false)
  }

  function usePreset(preset: AutomationPreset) {
    setName(preset.name)
    setTriggerType(preset.trigger_type)
    if (preset.trigger_config.from_status) setFromStatus(preset.trigger_config.from_status as string)
    if (preset.trigger_config.to_status) setToStatus(preset.trigger_config.to_status as string)
    setActions(preset.actions)
    setShowPresets(false)
    setShowForm(true)
  }

  async function createFromPreset(preset: AutomationPreset, index: number) {
    setSavingPresetIndex(index)
    setError("")

    const result = await createAutomation({
      name: preset.name,
      trigger_type: preset.trigger_type,
      trigger_config: preset.trigger_config,
      actions: preset.actions,
    })

    if (result?.error) {
      setError(result.error)
      setSavingPresetIndex(null)
    } else {
      window.location.reload()
    }
  }

  function addAction() {
    setActions((prev) => [...prev, { action_type: "send_sms", action_config: {} }])
  }

  function removeAction(index: number) {
    setActions((prev) => prev.filter((_, i) => i !== index))
  }

  function updateAction(index: number, updates: Partial<{ action_type: string; action_config: Record<string, unknown> }>) {
    setActions((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...updates } : a))
    )
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Angi et navn")
      return
    }
    if (actions.length === 0) {
      setError("Legg til minst én handling")
      return
    }

    setSaving(true)
    setError("")

    const triggerConfig: Record<string, unknown> = {}
    if (triggerType === "status_change") {
      if (fromStatus) triggerConfig.from_status = fromStatus
      if (toStatus) triggerConfig.to_status = toStatus
    }
    if (triggerType === "scheduled") {
      if (!scheduleTime) {
        setError("Angi et klokkeslett")
        setSaving(false)
        return
      }
      if (scheduleType === "once" && !scheduleDate) {
        setError("Angi en dato for engangskjøring")
        setSaving(false)
        return
      }
      triggerConfig.schedule_type = scheduleType
      triggerConfig.schedule_time = scheduleTime
      if (scheduleType === "once") {
        triggerConfig.schedule_date = scheduleDate
      } else {
        triggerConfig.schedule_days = scheduleDays
      }
      const orderFilter: Record<string, unknown> = {}
      if (filterStatus) orderFilter.status = filterStatus
      if (filterOlderThan && parseInt(filterOlderThan) > 0) {
        orderFilter.older_than_days = parseInt(filterOlderThan)
      }
      if (Object.keys(orderFilter).length > 0) {
        triggerConfig.order_filter = orderFilter
      }
    }

    const payload = {
      name: name.trim(),
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      actions,
    }

    const result = editingId
      ? await updateAutomation(editingId, payload)
      : await createAutomation(payload)

    if (result?.error) {
      setError(result.error)
    } else {
      window.location.reload()
    }

    setSaving(false)
  }

  async function handleToggle(id: string, enabled: boolean) {
    const result = await toggleAutomation(id, !enabled)
    if (!result?.error) {
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: !enabled } : a))
      )
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Slette denne automasjonen?")) return
    const result = await deleteAutomation(id)
    if (!result?.error) {
      setAutomations((prev) => prev.filter((a) => a.id !== id))
    }
  }

  const [runningId, setRunningId] = useState<string | null>(null)

  async function handleRunManually(id: string) {
    if (!confirm("Kjøre denne automasjonen manuelt nå?")) return
    setRunningId(id)
    const result = await runAutomationManually(id)
    setRunningId(null)
    if (result?.error) {
      alert(`Feil: ${result.error}`)
    } else {
      alert("Automasjonen ble kjørt.")
      window.location.reload()
    }
  }

  function getTriggerLabel(type: string) {
    return TRIGGER_TYPES.find((t) => t.value === type)?.label || type
  }

  function getActionLabel(type: string) {
    return ACTION_TYPES.find((a) => a.value === type)?.label || type
  }

  function getStatusLabel(status: string) {
    return STATUS_LABELS[status as OrderStatus] || status
  }

  function getTemplateName(id: string) {
    return templates.find((t) => t.id === id)?.name || "Ukjent mal"
  }

  function describeSchedule(config: Record<string, unknown>): string {
    const type = config.schedule_type as string
    const time = config.schedule_time as string || "00:00"
    const dayNames = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"]

    let desc = ""
    if (type === "once") {
      const date = config.schedule_date as string
      desc = `Engangs: ${date || "ukjent dato"} kl. ${time}`
    } else {
      const days = (config.schedule_days as number[]) || []
      const dayStr = days.length === 0 || days.length === 7
        ? "Hver dag"
        : days.map((d) => dayNames[d] || "?").join(", ")
      desc = `${dayStr} kl. ${time}`
    }

    const filter = config.order_filter as Record<string, unknown> | undefined
    if (filter) {
      const parts: string[] = []
      if (filter.status) parts.push(`status: ${getStatusLabel(filter.status as string)}`)
      if (filter.older_than_days) parts.push(`eldre enn ${filter.older_than_days} dager`)
      if (parts.length > 0) desc += ` — Filter: ${parts.join(", ")}`
    }

    return desc
  }

  function describeAction(a: AutomationAction) {
    const config = a.action_config as Record<string, string | boolean>
    switch (a.action_type) {
      case "send_sms":
      case "send_email": {
        const channel = a.action_type === "send_sms" ? "SMS" : "E-post"
        const excel = config.attach_leads ? " + Excel" : ""
        if (config.template_id) return `${channel}: ${getTemplateName(config.template_id as string)}${excel}`
        return `${channel}: Fritt meddelande${excel}`
      }
      case "change_status":
        return `Endre status til ${getStatusLabel(String(config.new_status || ""))}`
      case "webhook":
        return `Webhook: ${String(config.webhook_url || "")}`
      default:
        return a.action_type
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-dark">Automasjoner</h2>
          <p className="text-sm text-muted mt-0.5">
            Opprett automatiske flyter som kjøres ved nye bestillinger eller statusendringer.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowLogs(!showLogs)}>
            {showLogs ? "Vis automasjoner" : "Vis logg"}
          </Button>
          {!showForm && !showLogs && !showPresets && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowPresets(true)}>
                Fra mal
              </Button>
              <Button size="sm" onClick={() => setShowForm(true)}>
                Ny automasjon
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Loggvy */}
      {showLogs && (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted text-sm">Ingen logger ennå.</CardContent></Card>
          ) : (
            logs.slice(0, 50).map((log) => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={log.status === "success" ? "success" : "error"}>
                        {log.status === "success" ? "OK" : "Feil"}
                      </Badge>
                      <span className="text-sm text-dark">{log.details}</span>
                    </div>
                    <span className="text-xs text-muted">
                      {log.created_at ? new Date(log.created_at).toLocaleString("nb-NO") : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Presetväljare */}
      {showPresets && !showLogs && !showForm && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark">Velg en automasjonsmal</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowPresets(false)}>
              Avbryt
            </Button>
          </div>
          {error && <p className="text-sm text-error mb-3">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AUTOMATION_PRESETS.map((preset, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-dark text-sm mb-1">{preset.name}</h4>
                  <p className="text-xs text-muted mb-2">{preset.description}</p>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Badge variant="info">{getTriggerLabel(preset.trigger_type)}</Badge>
                    {typeof preset.trigger_config.to_status === "string" && (
                      <Badge>{getStatusLabel(preset.trigger_config.to_status)}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => createFromPreset(preset, i)} disabled={savingPresetIndex !== null}>
                      {savingPresetIndex === i ? "Oppretter..." : "Opprett direkte"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => usePreset(preset)} disabled={savingPresetIndex !== null}>
                      Tilpass først
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Opprettelsesformular */}
      {showForm && !showLogs && (
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-dark">{editingId ? "Rediger automasjon" : "Ny automasjon"}</h3>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">Navn</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="f.eks. Bekreftelse-SMS ved ny bestilling"
                className="w-full px-3 py-2 border-[1.5px] border-border rounded-lg text-sm text-dark placeholder:text-muted focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">Trigger</label>
              <div className="flex gap-2">
                {TRIGGER_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTriggerType(t.value)}
                    className={`px-4 py-2 text-sm rounded-lg border-[1.5px] transition-colors cursor-pointer ${
                      triggerType === t.value
                        ? "border-teal bg-teal/10 text-dark font-medium"
                        : "border-border text-muted hover:border-teal/40"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {triggerType === "status_change" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Fra status (valgfritt)</label>
                  <select
                    value={fromStatus}
                    onChange={(e) => setFromStatus(e.target.value)}
                    className="w-full px-3 py-2 border-[1.5px] border-border rounded-lg text-sm text-dark focus:outline-none focus:border-teal"
                  >
                    <option value="">Alle</option>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">Til status (valgfritt)</label>
                  <select
                    value={toStatus}
                    onChange={(e) => setToStatus(e.target.value)}
                    className="w-full px-3 py-2 border-[1.5px] border-border rounded-lg text-sm text-dark focus:outline-none focus:border-teal"
                  >
                    <option value="">Alle</option>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Schemaläggningsinställningar */}
            {triggerType === "scheduled" && (
              <div className="space-y-4 p-4 bg-[#f8fafc] border border-border rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-dark mb-2">Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setScheduleType("recurring")}
                      className={`px-4 py-2 text-sm rounded-lg border-[1.5px] transition-colors cursor-pointer ${
                        scheduleType === "recurring"
                          ? "border-teal bg-teal/10 text-dark font-medium"
                          : "border-border text-muted hover:border-teal/40"
                      }`}
                    >
                      Gjentagende
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleType("once")}
                      className={`px-4 py-2 text-sm rounded-lg border-[1.5px] transition-colors cursor-pointer ${
                        scheduleType === "once"
                          ? "border-teal bg-teal/10 text-dark font-medium"
                          : "border-border text-muted hover:border-teal/40"
                      }`}
                    >
                      Engangs
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark mb-1">Klokkeslett</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 border-[1.5px] border-border rounded-lg text-sm text-dark focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                    />
                  </div>
                  {scheduleType === "once" && (
                    <div>
                      <label className="block text-sm font-medium text-dark mb-1">Dato</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full px-3 py-2 border-[1.5px] border-border rounded-lg text-sm text-dark focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                      />
                    </div>
                  )}
                </div>

                {scheduleType === "recurring" && (
                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">Dager</label>
                    <div className="flex gap-1.5">
                      {WEEKDAYS.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            setScheduleDays((prev) =>
                              prev.includes(day.value)
                                ? prev.filter((d) => d !== day.value)
                                : [...prev, day.value].sort()
                            )
                          }}
                          className={`px-3 py-1.5 text-xs rounded-lg border-[1.5px] transition-colors cursor-pointer font-medium ${
                            scheduleDays.includes(day.value)
                              ? "border-teal bg-teal/10 text-dark"
                              : "border-border text-muted hover:border-teal/40"
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <label className="block text-sm font-medium text-dark mb-2">
                    Bestillingsfilter <span className="text-muted font-normal">(valgfritt)</span>
                  </label>
                  <p className="text-xs text-muted mb-3">
                    Bestem hvilke bestillinger handlingene skal kjøres mot.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm text-dark focus:outline-none focus:border-teal"
                      >
                        <option value="">Alle statuser</option>
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Eldre enn (dager)</label>
                      <input
                        type="number"
                        min="0"
                        value={filterOlderThan}
                        onChange={(e) => setFilterOlderThan(e.target.value)}
                        placeholder="f.eks. 3"
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm text-dark placeholder:text-muted focus:outline-none focus:border-teal"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-dark">Handlinger</label>
                <Button variant="secondary" size="sm" onClick={addAction}>
                  + Legg til
                </Button>
              </div>

              {actions.length === 0 && (
                <p className="text-sm text-muted py-2">Ingen handlinger lagt til.</p>
              )}

              <div className="space-y-3">
                {actions.map((action, i) => (
                  <div key={i} className="p-3 bg-[#f8fafc] border border-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                        Handling {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAction(i)}
                        className="text-xs text-muted hover:text-error transition-colors cursor-pointer"
                      >
                        Fjern
                      </button>
                    </div>

                    <select
                      value={action.action_type}
                      onChange={(e) => updateAction(i, { action_type: e.target.value, action_config: {} })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm text-dark focus:outline-none focus:border-teal"
                    >
                      {ACTION_TYPES.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>

                    {(action.action_type === "send_sms" || action.action_type === "send_email") && (
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Mal</label>
                        <select
                          value={(action.action_config.template_id as string) || ""}
                          onChange={(e) =>
                            updateAction(i, {
                              action_config: e.target.value ? { template_id: e.target.value } : {},
                            })
                          }
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm text-dark focus:outline-none focus:border-teal"
                        >
                          <option value="">Velg mal...</option>
                          {templates
                            .filter((t) =>
                              action.action_type === "send_sms" ? t.channel === "sms" : t.channel === "email"
                            )
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.recipient_type === "company" ? "Bedriften" : "Kunden"})
                              </option>
                            ))}
                        </select>
                        {!action.action_config.template_id && (
                          <div className="mt-2">
                            <label className="block text-xs font-medium text-muted mb-1">
                              Eller skriv fritt meddelande
                            </label>
                            {action.action_type === "send_email" && (
                              <input
                                type="text"
                                value={(action.action_config.subject as string) || ""}
                                onChange={(e) =>
                                  updateAction(i, {
                                    action_config: { ...action.action_config, subject: e.target.value },
                                  })
                                }
                                placeholder="Emne..."
                                className="w-full px-3 py-2 mb-2 border border-border rounded-lg text-sm text-dark placeholder:text-muted focus:outline-none focus:border-teal"
                              />
                            )}
                            <textarea
                              value={(action.action_config.message as string) || ""}
                              onChange={(e) =>
                                updateAction(i, {
                                  action_config: { ...action.action_config, message: e.target.value },
                                })
                              }
                              rows={2}
                              placeholder="Hei {{navn}}, vi har mottatt din bestilling..."
                              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-dark placeholder:text-muted focus:outline-none focus:border-teal resize-none"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {action.action_type === "send_email" && (
                      <label className="flex items-center gap-2 cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={!!action.action_config.attach_leads}
                          onChange={(e) =>
                            updateAction(i, {
                              action_config: { ...action.action_config, attach_leads: e.target.checked },
                            })
                          }
                          className="w-4 h-4 rounded border-border text-teal focus:ring-teal/20 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-dark">
                          Legg ved Excel-fil med aktuelle bestillinger
                        </span>
                      </label>
                    )}

                    {action.action_type === "change_status" && (
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Ny status</label>
                        <select
                          value={(action.action_config.new_status as string) || ""}
                          onChange={(e) =>
                            updateAction(i, { action_config: { new_status: e.target.value } })
                          }
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm text-dark focus:outline-none focus:border-teal"
                        >
                          <option value="">Velg status...</option>
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {action.action_type === "webhook" && (
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Webhook URL</label>
                        <input
                          type="url"
                          value={(action.action_config.webhook_url as string) || ""}
                          onChange={(e) =>
                            updateAction(i, { action_config: { webhook_url: e.target.value } })
                          }
                          placeholder="https://..."
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm text-dark placeholder:text-muted focus:outline-none focus:border-teal"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Lagrer..." : editingId ? "Lagre endringer" : "Opprett automasjon"}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Avbryt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automationslista */}
      {!showLogs && !showPresets && (
        <>
          {automations.length === 0 && !showForm ? (
            <Card>
              <CardContent className="p-6 text-center py-10">
                <svg className="w-10 h-10 text-muted mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                <p className="text-sm text-muted mb-1">Ingen automasjoner ennå</p>
                <p className="text-xs text-muted">Opprett din første automasjon for å automatisere flytene dine.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {automations.map((a) => {
                const isExpanded = expandedId === a.id
                return (
                  <Card key={a.id}>
                    <CardContent className="p-4">
                      <div
                        className="cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : a.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <svg
                                className={`w-4 h-4 text-muted transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                              <h3 className="font-semibold text-dark">{a.name}</h3>
                              <Badge variant={a.enabled ? "success" : "default"}>
                                {a.enabled ? "Aktiv" : "Inaktiv"}
                              </Badge>
                              <Badge variant="info">
                                {getTriggerLabel(a.trigger_type)}
                              </Badge>
                            </div>

                            {a.trigger_type === "status_change" && (
                              <p className="text-xs text-muted mb-1 pl-6">
                                {(a.trigger_config as Record<string, string>).from_status
                                  ? `Fra: ${getStatusLabel((a.trigger_config as Record<string, string>).from_status)}`
                                  : "Fra: Alle"}
                                {" -> "}
                                {(a.trigger_config as Record<string, string>).to_status
                                  ? `Til: ${getStatusLabel((a.trigger_config as Record<string, string>).to_status)}`
                                  : "Til: Alle"}
                              </p>
                            )}

                            {a.trigger_type === "scheduled" && (
                              <p className="text-xs text-muted mb-1 pl-6">
                                {describeSchedule(a.trigger_config as Record<string, unknown>)}
                              </p>
                            )}

                            {!isExpanded && (
                              <div className="flex flex-wrap gap-1.5 mt-1 pl-6">
                                {a.automation_actions
                                  .sort((x, y) => x.position - y.position)
                                  .map((action, i) => (
                                    <span
                                      key={action.id || i}
                                      className="inline-flex items-center px-2 py-0.5 text-xs bg-[#f8fafc] border border-border rounded-md text-muted"
                                    >
                                      {describeAction(action)}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRunManually(a.id)}
                              disabled={runningId === a.id}
                            >
                              {runningId === a.id ? "Kjører..." : "Kjør nå"}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => editAutomation(a)}>
                              Rediger
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleToggle(a.id, a.enabled)}>
                              {a.enabled ? "Deaktiver" : "Aktiver"}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}>
                              Slett
                            </Button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border space-y-4">
                          <div>
                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Trigger</h4>
                            <div className="p-3 bg-[#f8fafc] border border-border rounded-lg">
                              <p className="text-sm text-dark font-medium">{getTriggerLabel(a.trigger_type)}</p>
                              {a.trigger_type === "status_change" && (
                                <p className="text-xs text-muted mt-1">
                                  {(a.trigger_config as Record<string, string>).from_status
                                    ? `Fra: ${getStatusLabel((a.trigger_config as Record<string, string>).from_status)}`
                                    : "Fra: Alle statuser"}
                                  {" -> "}
                                  {(a.trigger_config as Record<string, string>).to_status
                                    ? `Til: ${getStatusLabel((a.trigger_config as Record<string, string>).to_status)}`
                                    : "Til: Alle statuser"}
                                </p>
                              )}
                              {a.trigger_type === "new_order" && (
                                <p className="text-xs text-muted mt-1">Kjøres når en ny bestilling kommer inn via skjemaet.</p>
                              )}
                              {a.trigger_type === "scheduled" && (() => {
                                const aRecord = a as unknown as Record<string, string | null>
                                return (
                                  <div className="text-xs text-muted mt-1 space-y-1">
                                    <p>{describeSchedule(a.trigger_config as Record<string, unknown>)}</p>
                                    {aRecord.last_run_at && (
                                      <p>Siste kjøring: {new Date(aRecord.last_run_at).toLocaleString("nb-NO")}</p>
                                    )}
                                    {aRecord.next_run_at && (
                                      <p>Neste kjøring: {new Date(aRecord.next_run_at).toLocaleString("nb-NO")}</p>
                                    )}
                                  </div>
                                )
                              })()}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                              Handlinger ({a.automation_actions.length})
                            </h4>
                            <div className="space-y-2">
                              {a.automation_actions
                                .sort((x, y) => x.position - y.position)
                                .map((action, i) => {
                                  const config = action.action_config as Record<string, string>
                                  return (
                                    <div key={action.id || i} className="p-3 bg-[#f8fafc] border border-border rounded-lg">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold text-teal bg-teal/10 px-2 py-0.5 rounded">
                                          Steg {i + 1}
                                        </span>
                                        <span className="text-sm font-medium text-dark">
                                          {getActionLabel(action.action_type)}
                                        </span>
                                      </div>
                                      {config.template_id && (
                                        <p className="text-xs text-muted mt-1">Mal: {getTemplateName(config.template_id)}</p>
                                      )}
                                      {config.message && (
                                        <div className="mt-2 p-2 bg-white border border-border rounded text-xs text-muted whitespace-pre-wrap font-mono">
                                          {config.message}
                                        </div>
                                      )}
                                      {config.subject && (
                                        <p className="text-xs text-muted mt-1">
                                          Emne: <span className="text-dark">{config.subject}</span>
                                        </p>
                                      )}
                                      {config.new_status && (
                                        <p className="text-xs text-muted mt-1">
                                          Ny status: <Badge variant="info">{getStatusLabel(config.new_status)}</Badge>
                                        </p>
                                      )}
                                      {config.webhook_url && (
                                        <p className="text-xs text-muted mt-1 break-all">
                                          URL: <span className="text-dark">{config.webhook_url}</span>
                                        </p>
                                      )}
                                    </div>
                                  )
                                })}
                            </div>
                          </div>

                          {a.created_at && (
                            <p className="text-xs text-muted">
                              Opprettet: {new Date(a.created_at).toLocaleString("nb-NO")}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
