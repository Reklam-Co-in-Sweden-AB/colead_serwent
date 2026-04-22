"use client"

import { useState, useEffect, useRef } from "react"
import type { Form, FormField, FormStep } from "@/types/forms"
import { AddressLookup } from "@/components/order/AddressLookup"
import { Button } from "@/components/ui/button"

interface DynamicFormProps {
  form: Form
}

export function DynamicForm({ form }: DynamicFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [orderId, setOrderId] = useState("")
  const [orderEmail, setOrderEmail] = useState("")

  const formRef = useRef<HTMLDivElement>(null)

  // Fånga UTM-parametrar och klick-ID:n från URL (parent eller iframe)
  const trackingRef = useRef<{
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    fbclid?: string
    gclid?: string
    referrer?: string
    session_id?: string
  }>({})

  useEffect(() => {
    // Hämta parametrar från parent (iframe) eller egen URL
    const params = new URLSearchParams(window.location.search)
    trackingRef.current = {
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      fbclid: params.get("fbclid") || undefined,
      gclid: params.get("gclid") || undefined,
      referrer: document.referrer || undefined,
      session_id: getSessionId(),
    }

    // Spåra formulärvisning
    fetch("/api/tracking/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form_id: form.id,
        ...trackingRef.current,
      }),
    }).catch(() => {})
  }, [form.id])

  // Skicka resize-meddelande till parent (för iframe-inbäddning)
  useEffect(() => {
    const sendHeight = () => {
      if (window.parent !== window) {
        const height = document.documentElement.scrollHeight
        window.parent.postMessage(
          JSON.stringify({ type: "serwent-resize", height }),
          "*"
        )
      }
    }
    sendHeight()
    const observer = new ResizeObserver(sendHeight)
    if (formRef.current) observer.observe(formRef.current)
    return () => observer.disconnect()
  }, [currentStep, submitted])

  const steps = form.form_steps
  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  const update = (fieldId: string, value: string) => {
    setFormData((d) => ({ ...d, [fieldId]: value }))
    setErrors((e) => ({ ...e, [fieldId]: "" }))
  }

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {}

    for (const field of step.form_fields) {
      const value = formData[field.id] || ""

      if (field.required && !value.trim()) {
        newErrors[field.id] = `${field.label} er påkrevd`
        continue
      }

      if (value.trim()) {
        if (field.field_type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors[field.id] = "Ugyldig e-post"
        }
        if (field.field_type === "phone" && !/^[+\d\s()-]{6,}$/.test(value)) {
          newErrors[field.id] = "Ugyldig telefonnummer"
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((s) => s + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep((s) => s - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep()) return

    setSubmitting(true)

    // Build mapped data from field mappings
    const mappedData: Record<string, string> = {}
    const allFields = steps.flatMap((s) => s.form_fields)

    for (const field of allFields) {
      if (field.mapping && formData[field.id]) {
        mappedData[field.mapping] = formData[field.id]
      }
    }

    // Bygg form_svar — label + verdi per felt. Bevarer både visningsetikett og
    // verdi slik at bestillingen forblir leselig även om skjemaet endres senere.
    const formSvar = allFields
      .filter((f) => {
        const v = formData[f.id]
        return v != null && String(v).trim() !== ""
      })
      .map((f) => ({
        label: f.label,
        value: String(formData[f.id]),
        mapping: f.mapping || null,
      }))

    try {
      const res = await fetch("/api/orders/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...mappedData,
          form_id: form.id,
          form_svar: formSvar,
          form_data: formData,
          // Koordinater från Kartverket
          lat: formData._lat ? parseFloat(formData._lat) : null,
          lng: formData._lng ? parseFloat(formData._lng) : null,
          // Tracking-data
          ...trackingRef.current,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const fieldErrors: Record<string, string> = {}

        if (data.errors) {
          for (const field of allFields) {
            if (field.mapping && data.errors[field.mapping]) {
              fieldErrors[field.id] = data.errors[field.mapping]
            }
          }
        }

        // Hoppa tillbaka till första steget som har ett felmeddelande — annars
        // står användaren kvar på sista steget och ser inga fält som är röda
        const erroredFieldIds = Object.keys(fieldErrors)
        if (erroredFieldIds.length > 0) {
          const firstErrorStepIndex = steps.findIndex((s) =>
            s.form_fields.some((f) => erroredFieldIds.includes(f.id))
          )
          if (firstErrorStepIndex !== -1 && firstErrorStepIndex !== currentStep) {
            setCurrentStep(firstErrorStepIndex)
          }
        }

        // Visa alltid ett generellt felmeddelande så det aldrig blir tyst —
        // täcker rate limit (429), serverfel (500) och fält som saknar mapping
        const generalMessage =
          data.error ||
          (erroredFieldIds.length > 0
            ? "Kontroller feltene markert med rødt og prøv igjen."
            : "Noe gikk galt. Prøv igjen.")
        fieldErrors._form = generalMessage

        setErrors(fieldErrors)
        setSubmitting(false)
        return
      }

      setOrderId(data.order_id)
      setOrderEmail(data.epost || mappedData.epost || "")
      setSubmitted(true)

      // Meddela parent (serwent.no) om konvertering för client-side pixlar
      if (window.parent !== window) {
        window.parent.postMessage(
          JSON.stringify({
            type: "serwent-conversion",
            event: "Lead",
            order_id: data.order_id,
          }),
          "*"
        )
      }
    } catch {
      setErrors({ _form: "Noe gikk galt. Prøv igjen." })
    }
    setSubmitting(false)
  }

  // ── Thank you ──
  if (submitted) {
    return (
      <div className="py-10 px-5 max-w-xl mx-auto">
        <div className="text-center mb-7">
          <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-dark text-2xl font-bold mb-1">
            {form.thank_you_title || "Bestilling mottatt"}
          </h2>
          <p className="text-muted text-sm">
            Referanse: <strong className="text-dark">{orderId}</strong>
          </p>
        </div>

        <div className="bg-background border-2 border-border rounded-xl p-5 mb-6">
          {orderEmail && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
              <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-muted">
                En kvittering er sendt til <strong className="text-dark">{orderEmail}</strong>
              </span>
            </div>
          )}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {form.thank_you_message || "Din bestilling er mottatt."}
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setFormData({})
            setSubmitted(false)
            setErrors({})
            setCurrentStep(0)
            setOrderId("")
            setOrderEmail("")
          }}
        >
          Ny bestilling
        </Button>
      </div>
    )
  }

  // ── Progress bar ──
  const ProgressBar = () => {
    if (steps.length <= 1) return null
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => i < currentStep && setCurrentStep(i)}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${i < currentStep
                  ? "bg-teal text-white cursor-pointer"
                  : i === currentStep
                    ? "bg-dark text-white"
                    : "bg-border text-muted cursor-default"
                }
              `}
            >
              {i < currentStep ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </button>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 ${i < currentStep ? "bg-teal" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div ref={formRef}>
      <ProgressBar />

      {/* Step header */}
      {steps.length > 1 && (
        <div className="mb-6">
          <h3 className="text-dark text-lg font-bold">{step.title}</h3>
          {step.description && (
            <p className="text-muted text-sm mt-1">{step.description}</p>
          )}
        </div>
      )}

      {/* Fields */}
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {step.form_fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={formData[field.id] || ""}
              error={errors[field.id]}
              onChange={(val) => update(field.id, val)}
              onAddressChange={(adresse, gnr, bnr, lat, lng) => {
                // Find gnr/bnr fields by mapping
                const allFields = steps.flatMap((s) => s.form_fields)
                const gnrField = allFields.find((f) => f.mapping === "gnr")
                const bnrField = allFields.find((f) => f.mapping === "bnr")
                update(field.id, adresse)
                if (gnrField) update(gnrField.id, gnr)
                if (bnrField) update(bnrField.id, bnr)
                // Spara koordinater för kartvisning
                if (lat && lng) {
                  setFormData((d) => ({ ...d, _lat: String(lat), _lng: String(lng) }))
                }
              }}
            />
          ))}
        </div>

        {errors._form && (
          <div className="bg-error/10 border-2 border-error/20 rounded-md px-4 py-3 text-sm text-error">
            {errors._form}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-2">
          {!isFirstStep && (
            <Button variant="secondary" onClick={handleBack}>
              Tilbake
            </Button>
          )}
          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={submitting} size="lg">
              {submitting ? "Sender bestilling..." : "Send bestilling"}
            </Button>
          ) : (
            <Button onClick={handleNext} size="lg">
              Neste
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Field Renderer ──
function FieldRenderer({
  field,
  value,
  error,
  onChange,
  onAddressChange,
}: {
  field: FormField
  value: string
  error?: string
  onChange: (val: string) => void
  onAddressChange?: (adresse: string, gnr: string, bnr: string, lat?: number | null, lng?: number | null) => void
}) {
  // Address lookup — special field type
  if (field.field_type === "address_lookup") {
    return (
      <div className="sm:col-span-2">
        <AddressLookup
          value={value}
          onChange={(adresse, gnr, bnr, lat, lng) => onAddressChange?.(adresse, gnr, bnr, lat, lng)}
          error={error}
        />
      </div>
    )
  }

  // Textarea
  if (field.field_type === "textarea") {
    return (
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label className="text-xs font-semibold text-dark uppercase tracking-wider">
          {field.label}
          {field.required && <span className="text-orange ml-0.5">*</span>}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || ""}
          rows={3}
          className={`border-2 rounded-md px-3.5 py-2.5 text-sm text-foreground bg-white outline-none resize-y transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/20 ${error ? "border-error" : "border-border"}`}
        />
        {error && <span className="text-error text-xs">{error}</span>}
      </div>
    )
  }

  // Select
  if (field.field_type === "select") {
    const options = (field.options || []) as { value: string; label: string }[]
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-dark uppercase tracking-wider">
          {field.label}
          {field.required && <span className="text-orange ml-0.5">*</span>}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`border-2 rounded-md px-3.5 py-2.5 text-sm bg-white outline-none transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/20 ${error ? "border-error" : "border-border"} ${value ? "text-foreground" : "text-muted"}`}
        >
          <option value="">{field.placeholder || "– Velg –"}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <span className="text-error text-xs">{error}</span>}
      </div>
    )
  }

  // Radio
  if (field.field_type === "radio") {
    const options = (field.options || []) as { value: string; label: string }[]
    return (
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label className="text-xs font-semibold text-dark uppercase tracking-wider">
          {field.label}
          {field.required && <span className="text-orange ml-0.5">*</span>}
        </label>
        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
                className="accent-teal"
              />
              <span className="text-sm text-foreground">{o.label}</span>
            </label>
          ))}
        </div>
        {error && <span className="text-error text-xs">{error}</span>}
      </div>
    )
  }

  // Checkbox
  if (field.field_type === "checkbox") {
    const options = (field.options || []) as { value: string; label: string }[]
    const selected = value ? value.split(",") : []
    return (
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label className="text-xs font-semibold text-dark uppercase tracking-wider">
          {field.label}
          {field.required && <span className="text-orange ml-0.5">*</span>}
        </label>
        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={(e) => {
                  const updated = e.target.checked
                    ? [...selected, o.value]
                    : selected.filter((v) => v !== o.value)
                  onChange(updated.join(","))
                }}
                className="accent-teal"
              />
              <span className="text-sm text-foreground">{o.label}</span>
            </label>
          ))}
        </div>
        {error && <span className="text-error text-xs">{error}</span>}
      </div>
    )
  }

  // Default: text, email, phone, number
  const inputType =
    field.field_type === "email" ? "email" :
    field.field_type === "phone" ? "tel" :
    field.field_type === "number" ? "number" :
    "text"

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-dark uppercase tracking-wider">
        {field.label}
        {field.required && <span className="text-orange ml-0.5">*</span>}
      </label>
      <input
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || ""}
        className={`border-2 rounded-md px-3.5 py-2.5 text-sm text-foreground bg-white outline-none transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/20 ${error ? "border-error" : "border-border"}`}
      />
      {error && <span className="text-error text-xs">{error}</span>}
    </div>
  )
}

// Session-ID för att koppla visning till konvertering
function getSessionId(): string {
  if (typeof window === "undefined") return ""
  let sid = sessionStorage.getItem("serwent_sid")
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    sessionStorage.setItem("serwent_sid", sid)
  }
  return sid
}
