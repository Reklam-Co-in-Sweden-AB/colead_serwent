"use client"

import { useState } from "react"
import { createTemplate, updateTemplate, deleteTemplate } from "@/actions/messages"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TEMPLATE_VARIABLES } from "@/lib/messaging"

type Template = {
  id: string
  name: string
  channel: string
  recipient_type: string
  subject: string | null
  body: string
  created_at: string | null
}

interface TemplateManagerProps {
  initialTemplates: Template[]
}

export function TemplateManager({ initialTemplates }: TemplateManagerProps) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [channel, setChannel] = useState<"sms" | "email">("sms")
  const [recipientType, setRecipientType] = useState<"customer" | "company">("customer")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  function resetForm() {
    setName("")
    setChannel("sms")
    setRecipientType("customer")
    setSubject("")
    setBody("")
    setEditingId(null)
    setShowForm(false)
    setError("")
  }

  function startEdit(t: Template) {
    setName(t.name)
    setChannel(t.channel as "sms" | "email")
    setRecipientType((t.recipient_type as "customer" | "company") || "customer")
    setSubject(t.subject || "")
    setBody(t.body)
    setEditingId(t.id)
    setShowForm(true)
    setError("")
  }

  function insertVariable(key: string) {
    setBody((prev) => prev + `{{${key}}}`)
  }

  async function handleSave() {
    setSaving(true)
    setError("")

    if (editingId) {
      const result = await updateTemplate(editingId, {
        name,
        channel,
        recipient_type: recipientType,
        subject: channel === "email" ? subject : null,
        body,
      })
      if (result?.error) {
        setError(result.error)
      } else {
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingId
              ? { ...t, name, channel, recipient_type: recipientType, subject: channel === "email" ? subject : null, body }
              : t
          )
        )
        resetForm()
      }
    } else {
      const formData = new FormData()
      formData.set("name", name)
      formData.set("channel", channel)
      formData.set("recipient_type", recipientType)
      formData.set("subject", channel === "email" ? subject : "")
      formData.set("body", body)

      const result = await createTemplate(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        window.location.reload()
      }
    }

    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Slette denne malen?")) return
    await deleteTemplate(id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-dark">Meldingsmaler</h2>
          <p className="text-sm text-muted mt-0.5">
            Opprett maler for SMS og e-post. Bruk variabler for personalisering.
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            Ny mal
          </Button>
        )}
      </div>

      {/* Formulär */}
      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-dark">
              {editingId ? "Rediger mal" : "Ny mal"}
            </h3>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">Malnavn</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="f.eks. Bekreftelse-SMS"
                className="w-full px-3 py-2 border-[1.5px] border-border rounded-lg text-sm text-dark placeholder:text-muted focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">Kanal</label>
              <div className="flex gap-2">
                {(["sms", "email"] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`px-4 py-2 text-sm rounded-lg border-[1.5px] transition-colors cursor-pointer ${
                      channel === ch
                        ? "border-teal bg-teal/10 text-dark font-medium"
                        : "border-border text-muted hover:border-teal/40"
                    }`}
                  >
                    {ch === "sms" ? "SMS" : "E-post"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark mb-1">Mottaker</label>
              <div className="flex gap-2">
                {(["customer", "company"] as const).map((rt) => (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => setRecipientType(rt)}
                    className={`px-4 py-2 text-sm rounded-lg border-[1.5px] transition-colors cursor-pointer ${
                      recipientType === rt
                        ? "border-teal bg-teal/10 text-dark font-medium"
                        : "border-border text-muted hover:border-teal/40"
                    }`}
                  >
                    {rt === "customer" ? "Kunden" : "Bedriften"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted mt-1">
                {recipientType === "customer"
                  ? "Sendes til bestillerens e-post/telefon"
                  : "Sendes til bedriften (NOTIFY_EMAIL / NOTIFY_PHONE)"}
              </p>
            </div>

            {channel === "email" && (
              <div>
                <label className="block text-sm font-medium text-dark mb-1">Emne</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="f.eks. Bestilling mottatt — {{order_id}}"
                  className="w-full px-3 py-2 border-[1.5px] border-border rounded-lg text-sm text-dark placeholder:text-muted focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-dark mb-1">Melding</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={channel === "sms" ? 3 : 6}
                placeholder={
                  channel === "sms"
                    ? "Hei {{navn}}! Din bestilling er mottatt. Vi kontakter deg snart. /Serwent"
                    : "Hei {{navn}},\n\nTakk for din bestilling av {{tomming_type}}.\n\nBestillings-ID: {{order_id}}\n\nMed vennlig hilsen,\nSerwent AS"
                }
                className="w-full px-3 py-2 border-[1.5px] border-border rounded-lg text-sm text-dark placeholder:text-muted focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 resize-none"
              />
              {channel === "sms" && (
                <p className="text-xs text-muted mt-1">
                  {body.length}/160 tegn (1 SMS)
                  {body.length > 160 && ` — ${Math.ceil(body.length / 153)} SMS`}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Sett inn variabel
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="px-2 py-1 text-xs bg-[#f8fafc] border border-border rounded-md text-muted hover:text-dark hover:border-teal/40 transition-colors cursor-pointer"
                    title={`${v.label} — f.eks. "${v.example}"`}
                  >
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            </div>

            {body && (
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Forhåndsvisning
                </label>
                <div className="px-4 py-3 bg-[#f8fafc] border border-border rounded-lg text-sm text-dark whitespace-pre-wrap">
                  {body.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                    const v = TEMPLATE_VARIABLES.find((t) => t.key === key)
                    return v?.example || `{{${key}}}`
                  })}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-error">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving || !name || !body}>
                {saving ? "Lagrer..." : editingId ? "Lagre endringer" : "Opprett mal"}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Avbryt
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mallista */}
      {templates.length === 0 && !showForm ? (
        <Card>
          <CardContent className="p-6 text-center py-10">
            <svg className="w-10 h-10 text-muted mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <p className="text-sm text-muted mb-1">Ingen maler ennå</p>
            <p className="text-xs text-muted">Opprett din første mal for å begynne å sende SMS og e-post.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-dark">{t.name}</h3>
                      <Badge variant={t.channel === "sms" ? "info" : "default"}>
                        {t.channel === "sms" ? "SMS" : "E-post"}
                      </Badge>
                      <Badge variant={t.recipient_type === "company" ? "warning" : "success"}>
                        {t.recipient_type === "company" ? "Bedriften" : "Kunden"}
                      </Badge>
                    </div>
                    {t.channel === "email" && t.subject && (
                      <p className="text-xs text-muted mb-1">Emne: {t.subject}</p>
                    )}
                    <p className="text-sm text-muted line-clamp-2 whitespace-pre-wrap">{t.body}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(t)}>
                      Rediger
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}>
                      Slett
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
