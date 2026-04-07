"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Form, FormStep, FormField, FieldType, FieldOption } from "@/types/forms"
import { saveFormStructure, updateForm, toggleFormStatus } from "@/actions/forms"

interface FormBuilderProps {
  form: Form
}

interface EditableField {
  id: string
  field_type: FieldType
  label: string
  placeholder: string
  required: boolean
  options: FieldOption[]
  position: number
  mapping: string | null
}

interface EditableStep {
  id: string
  title: string
  description: string
  position: number
  fields: EditableField[]
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Tekst" },
  { value: "email", label: "E-post" },
  { value: "phone", label: "Telefon" },
  { value: "number", label: "Tall" },
  { value: "textarea", label: "Tekstområde" },
  { value: "select", label: "Nedtrekksliste" },
  { value: "radio", label: "Radio-knapper" },
  { value: "checkbox", label: "Avkrysning" },
  { value: "address_lookup", label: "Adresseoppslag (Kartverket)" },
]

const MAPPINGS = [
  { value: "", label: "Ingen" },
  { value: "navn", label: "Navn" },
  { value: "epost", label: "E-post" },
  { value: "telefon", label: "Telefon" },
  { value: "adresse", label: "Adresse" },
  { value: "gnr", label: "Gnr" },
  { value: "bnr", label: "Bnr" },
  { value: "kommune", label: "Kommune" },
  { value: "tomming_type", label: "Type tømming" },
  { value: "kommentar", label: "Kommentar" },
  { value: "tank_storrelse_m3", label: "Tankstørrelse (m³)" },
]

function genId() {
  return "new-" + Math.random().toString(36).substring(2, 9)
}

export function FormBuilder({ form }: FormBuilderProps) {
  const [steps, setSteps] = useState<EditableStep[]>(
    form.form_steps.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description || "",
      position: s.position,
      fields: s.form_fields.map((f) => ({
        id: f.id,
        field_type: f.field_type,
        label: f.label,
        placeholder: f.placeholder || "",
        required: f.required,
        options: (f.options || []) as FieldOption[],
        position: f.position,
        mapping: f.mapping,
      })),
    }))
  )

  const [activeStep, setActiveStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formMeta, setFormMeta] = useState({
    headline: form.headline || "",
    description: form.description || "",
    thank_you_title: form.thank_you_title || "",
    thank_you_message: form.thank_you_message || "",
  })
  const [activeTab, setActiveTab] = useState<"steg" | "innstillinger">("steg")

  const currentStep = steps[activeStep]

  // ── Step actions ──
  const addStep = () => {
    const newStep: EditableStep = {
      id: genId(),
      title: `Steg ${steps.length + 1}`,
      description: "",
      position: steps.length,
      fields: [],
    }
    setSteps([...steps, newStep])
    setActiveStep(steps.length)
  }

  const removeStep = (idx: number) => {
    if (steps.length <= 1) return
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, position: i }))
    setSteps(updated)
    setActiveStep(Math.min(activeStep, updated.length - 1))
  }

  const updateStep = (idx: number, key: keyof EditableStep, value: string) => {
    setSteps(steps.map((s, i) => (i === idx ? { ...s, [key]: value } : s)))
  }

  // ── Field actions ──
  const addField = (type: FieldType) => {
    const newField: EditableField = {
      id: genId(),
      field_type: type,
      label: FIELD_TYPES.find((t) => t.value === type)?.label || type,
      placeholder: "",
      required: false,
      options: type === "select" || type === "radio" || type === "checkbox"
        ? [{ value: "Alternativ 1", label: "Alternativ 1" }]
        : [],
      position: currentStep.fields.length,
      mapping: type === "email" ? "epost" : type === "phone" ? "telefon" : type === "address_lookup" ? "adresse" : null,
    }
    updateStepFields([...currentStep.fields, newField])
  }

  const removeField = (fieldIdx: number) => {
    updateStepFields(
      currentStep.fields.filter((_, i) => i !== fieldIdx).map((f, i) => ({ ...f, position: i }))
    )
  }

  const updateField = (fieldIdx: number, updates: Partial<EditableField>) => {
    updateStepFields(
      currentStep.fields.map((f, i) => (i === fieldIdx ? { ...f, ...updates } : f))
    )
  }

  const moveField = (fieldIdx: number, dir: -1 | 1) => {
    const target = fieldIdx + dir
    if (target < 0 || target >= currentStep.fields.length) return
    const updated = [...currentStep.fields]
    const temp = updated[fieldIdx]
    updated[fieldIdx] = updated[target]
    updated[target] = temp
    updateStepFields(updated.map((f, i) => ({ ...f, position: i })))
  }

  const updateStepFields = (fields: EditableField[]) => {
    setSteps(steps.map((s, i) => (i === activeStep ? { ...s, fields } : s)))
  }

  // ── Save ──
  const handleSave = async () => {
    setSaving(true)
    await Promise.all([
      saveFormStructure(
        form.id,
        steps.map((s) => ({
          title: s.title,
          description: s.description,
          position: s.position,
          fields: s.fields.map((f) => ({
            field_type: f.field_type,
            label: f.label,
            placeholder: f.placeholder,
            required: f.required,
            options: f.options,
            position: f.position,
            mapping: f.mapping,
          })),
        }))
      ),
      updateForm(form.id, formMeta),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleToggleStatus = async () => {
    const newStatus = form.status === "published" ? "draft" : "published"
    await toggleFormStatus(form.id, newStatus)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-dark text-xl font-bold">{form.name}</h2>
          <Badge variant={form.status === "published" ? "success" : "default"}>
            {form.status === "published" ? "Publisert" : "Utkast"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleToggleStatus}>
            {form.status === "published" ? "Avpubliser" : "Publiser"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saved ? "Lagret!" : saving ? "Lagrer..." : "Lagre endringer"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b-2 border-border mb-6">
        {(["steg", "innstillinger"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-semibold capitalize transition-colors cursor-pointer ${
              activeTab === tab
                ? "text-dark border-b-2 border-dark -mb-[2px]"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab === "steg" ? "Steg & felter" : "Innstillinger"}
          </button>
        ))}
      </div>

      {/* ── Settings tab ── */}
      {activeTab === "innstillinger" && (
        <div className="max-w-lg flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-dark uppercase tracking-wider">Overskrift</label>
            <input
              value={formMeta.headline}
              onChange={(e) => setFormMeta({ ...formMeta, headline: e.target.value })}
              className="border-2 border-border rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-teal"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-dark uppercase tracking-wider">Beskrivelse</label>
            <textarea
              value={formMeta.description}
              onChange={(e) => setFormMeta({ ...formMeta, description: e.target.value })}
              rows={2}
              className="border-2 border-border rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-teal resize-y"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-dark uppercase tracking-wider">Takk-tittel (etter innsending)</label>
            <input
              value={formMeta.thank_you_title}
              onChange={(e) => setFormMeta({ ...formMeta, thank_you_title: e.target.value })}
              className="border-2 border-border rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-teal"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-dark uppercase tracking-wider">Takk-melding</label>
            <textarea
              value={formMeta.thank_you_message}
              onChange={(e) => setFormMeta({ ...formMeta, thank_you_message: e.target.value })}
              rows={3}
              className="border-2 border-border rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-teal resize-y"
            />
          </div>
        </div>
      )}

      {/* ── Steps & fields tab ── */}
      {activeTab === "steg" && (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Step list */}
          <div className="flex flex-col gap-2">
            {steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveStep(i)}
                className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  i === activeStep
                    ? "bg-dark text-white"
                    : "bg-background text-foreground hover:bg-border/30"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{s.title}</span>
                  <span className="text-xs opacity-60">{s.fields.length} felt</span>
                </div>
              </button>
            ))}
            <button
              onClick={addStep}
              className="px-4 py-3 rounded-lg text-sm font-medium text-teal border-2 border-dashed border-teal/30 hover:border-teal transition-colors cursor-pointer"
            >
              + Legg til steg
            </button>
          </div>

          {/* Field editor */}
          <div>
            {/* Step settings */}
            <div className="flex gap-4 mb-5">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs font-semibold text-dark uppercase tracking-wider">Steg-tittel</label>
                <input
                  value={currentStep.title}
                  onChange={(e) => updateStep(activeStep, "title", e.target.value)}
                  className="border-2 border-border rounded-md px-3 py-2 text-sm outline-none focus:border-teal"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs font-semibold text-dark uppercase tracking-wider">Beskrivelse</label>
                <input
                  value={currentStep.description}
                  onChange={(e) => updateStep(activeStep, "description", e.target.value)}
                  className="border-2 border-border rounded-md px-3 py-2 text-sm outline-none focus:border-teal"
                />
              </div>
              {steps.length > 1 && (
                <button
                  onClick={() => removeStep(activeStep)}
                  className="self-end px-3 py-2 text-error text-xs font-semibold hover:bg-error/10 rounded-md transition-colors cursor-pointer"
                >
                  Slett steg
                </button>
              )}
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-3 mb-5">
              {currentStep.fields.map((field, fi) => (
                <div key={field.id} className="border-2 border-border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{FIELD_TYPES.find((t) => t.value === field.field_type)?.label}</Badge>
                      <span className="text-sm font-semibold text-dark">{field.label}</span>
                      {field.required && <Badge variant="warning">Påkrevd</Badge>}
                      {field.mapping && <Badge variant="default">{field.mapping}</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveField(fi, -1)} disabled={fi === 0}
                        className="px-2 py-1 text-xs text-muted hover:text-foreground disabled:opacity-30 cursor-pointer disabled:cursor-default">
                        &#9650;
                      </button>
                      <button onClick={() => moveField(fi, 1)} disabled={fi === currentStep.fields.length - 1}
                        className="px-2 py-1 text-xs text-muted hover:text-foreground disabled:opacity-30 cursor-pointer disabled:cursor-default">
                        &#9660;
                      </button>
                      <button onClick={() => removeField(fi)}
                        className="px-2 py-1 text-xs text-error hover:bg-error/10 rounded cursor-pointer">
                        Slett
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted uppercase">Label</label>
                      <input value={field.label} onChange={(e) => updateField(fi, { label: e.target.value })}
                        className="border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-teal" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted uppercase">Placeholder</label>
                      <input value={field.placeholder} onChange={(e) => updateField(fi, { placeholder: e.target.value })}
                        className="border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-teal" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-muted uppercase">Mapping</label>
                      <select value={field.mapping || ""} onChange={(e) => updateField(fi, { mapping: e.target.value || null })}
                        className="border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-teal">
                        {MAPPINGS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={field.required} onChange={(e) => updateField(fi, { required: e.target.checked })}
                          className="accent-teal" />
                        <span className="text-xs">Påkrevd</span>
                      </label>
                    </div>
                  </div>

                  {/* Options editor for select/radio/checkbox */}
                  {(field.field_type === "select" || field.field_type === "radio" || field.field_type === "checkbox") && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <label className="text-[10px] font-semibold text-muted uppercase mb-2 block">Alternativer</label>
                      <div className="flex flex-col gap-1.5">
                        {field.options.map((opt, oi) => (
                          <div key={oi} className="flex gap-2 items-center">
                            <input
                              value={opt.label}
                              onChange={(e) => {
                                const updated = [...field.options]
                                updated[oi] = { value: e.target.value, label: e.target.value }
                                updateField(fi, { options: updated })
                              }}
                              className="flex-1 border border-border rounded px-2 py-1 text-xs outline-none focus:border-teal"
                            />
                            <button onClick={() => updateField(fi, { options: field.options.filter((_, i) => i !== oi) })}
                              className="text-error text-xs cursor-pointer hover:bg-error/10 px-1.5 py-1 rounded">
                              x
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => updateField(fi, { options: [...field.options, { value: `Alternativ ${field.options.length + 1}`, label: `Alternativ ${field.options.length + 1}` }] })}
                          className="text-teal text-xs font-semibold cursor-pointer self-start mt-1"
                        >
                          + Legg til alternativ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add field */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase mb-2">Legg til felt</p>
              <div className="flex flex-wrap gap-2">
                {FIELD_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => addField(t.value)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border-2 border-border hover:border-teal hover:text-dark transition-colors cursor-pointer"
                  >
                    + {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
