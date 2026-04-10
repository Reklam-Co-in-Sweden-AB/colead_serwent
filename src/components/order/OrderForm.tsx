"use client"

import { useState } from "react"
import { TØMMINGER } from "@/lib/constants"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { AddressLookup } from "@/components/order/AddressLookup"

interface FormData {
  kommune: string
  tomming_type: string
  navn: string
  epost: string
  telefon: string
  adresse: string
  gnr: string
  bnr: string
  tank_storrelse_m3: string
  kommentar: string
}

const EMPTY_FORM: FormData = {
  kommune: "",
  tomming_type: "",
  navn: "",
  epost: "",
  telefon: "",
  adresse: "",
  gnr: "",
  bnr: "",
  tank_storrelse_m3: "",
  kommentar: "",
}

interface OrderFormProps {
  kommuner?: string[]
}

export function OrderForm({ kommuner = [] }: OrderFormProps) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [orderId, setOrderId] = useState("")
  const [orderEmail, setOrderEmail] = useState("")

  const update = (key: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: "" }))
  }

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}
    if (!form.kommune) e.kommune = "Velg kommune"
    if (!form.tomming_type) e.tomming_type = "Velg type tømming"
    if (!form.navn.trim()) e.navn = "Navn er påkrevd"
    if (!form.epost.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.epost = "Ugyldig e-post"
    if (!form.telefon.trim()) e.telefon = "Telefon er påkrevd"
    if (!form.adresse.trim()) e.adresse = "Adresse er påkrevd"
    if (!form.gnr.trim()) e.gnr = "Gnr er påkrevd"
    if (!form.bnr.trim()) e.bnr = "Bnr er påkrevd"
    return e
  }

  const handleSubmit = async () => {
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/orders/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors)
        }
        setLoading(false)
        return
      }

      setOrderId(data.order_id)
      setOrderEmail(data.epost)
      setSubmitted(true)
    } catch {
      setErrors({ submit: "Noe gikk galt. Prøv igjen." })
    }
    setLoading(false)
  }

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
            Bestilling mottatt
          </h2>
          <p className="text-muted text-sm">
            Referanse: <strong className="text-dark">{orderId}</strong>
          </p>
        </div>

        <div className="bg-background border-2 border-border rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
            <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-muted">
              En kvittering er sendt til <strong className="text-dark">{orderEmail}</strong>
            </span>
          </div>
          <p className="text-sm font-bold text-foreground mb-2">
            Takk for din bestilling.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            Din bestilling er mottatt og vil bli håndtert av vårt serviceteam.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            Tømming vil bli utført iht. tidsfrister satt i rammeverk mellom
            oppdragsgiver og kommune, for den aktuelle tømmingen.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Har du spørsmål til tidsfrist for din tømming, ber vi deg sjekke
            hjemmesiden til den aktuelle kommunen.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setForm(EMPTY_FORM)
            setSubmitted(false)
            setErrors({})
            setOrderId("")
            setOrderEmail("")
          }}
        >
          Ny bestilling
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Select
          label="Kommune"
          options={kommuner}
          value={form.kommune}
          onChange={(e) => update("kommune", e.target.value)}
          error={errors.kommune}
          required
        />
        <Select
          label="Type tømming"
          options={TØMMINGER}
          value={form.tomming_type}
          onChange={(e) => update("tomming_type", e.target.value)}
          error={errors.tomming_type}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input
          label="Fullt navn"
          value={form.navn}
          onChange={(e) => update("navn", e.target.value)}
          error={errors.navn}
          required
        />
        <Input
          label="E-postadresse"
          type="email"
          value={form.epost}
          onChange={(e) => update("epost", e.target.value)}
          error={errors.epost}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input
          label="Telefon"
          type="tel"
          value={form.telefon}
          onChange={(e) => update("telefon", e.target.value)}
          error={errors.telefon}
          required
        />
        <AddressLookup
          value={form.adresse}
          onChange={(adresse, gnr, bnr) => {
            setForm((f) => ({ ...f, adresse, gnr, bnr }))
            setErrors((e) => ({ ...e, adresse: "", gnr: "", bnr: "" }))
          }}
          error={errors.adresse}
        />
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Input
          label="Gnr"
          value={form.gnr}
          onChange={(e) => update("gnr", e.target.value)}
          error={errors.gnr}
          required
        />
        <Input
          label="Bnr"
          value={form.bnr}
          onChange={(e) => update("bnr", e.target.value)}
          error={errors.bnr}
          required
        />
      </div>

      <Input
        label="Tankstørrelse (m³)"
        type="number"
        placeholder="F.eks. 4"
        value={form.tank_storrelse_m3}
        onChange={(e) => update("tank_storrelse_m3", e.target.value)}
        error={errors.tank_storrelse_m3}
      />

      <div className="bg-teal/5 border-2 border-teal/20 rounded-md px-4 py-3 text-xs text-dark leading-relaxed">
        <strong>Tips:</strong> Gnr og Bnr fylles ut automatisk når du velger en
        adresse fra listen. Du kan også finne dem på{" "}
        <a
          href="https://seeiendom.kartverket.no"
          target="_blank"
          rel="noreferrer"
          className="underline text-teal"
        >
          seeiendom.kartverket.no
        </a>
        .
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-dark uppercase tracking-wider">
          Kommentar
        </label>
        <textarea
          value={form.kommentar}
          onChange={(e) => update("kommentar", e.target.value)}
          rows={3}
          className="border-2 border-border rounded-md px-3.5 py-2.5 text-sm text-foreground bg-white outline-none resize-y transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/20"
        />
      </div>

      {errors.submit && (
        <div className="bg-error/10 border-2 border-error/20 rounded-md px-4 py-3 text-sm text-error">
          {errors.submit}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={loading}
        size="lg"
        className="self-start"
      >
        {loading ? "Sender bestilling..." : "Send bestilling"}
      </Button>

      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground leading-relaxed p-3 bg-background rounded-md border-l-3 border-border">
          Ved å sende inn dette bestillingsskjema samtykkes det til eventuelle
          ekstra kostnader som måtte påløpe. Har dere spørsmål knyttet til ekstra
          kostnad ved bestillingstømming må den aktuelle kommune kontaktes. Alle
          tømminger vil bli utført iht. tidsfrister satt i rammeverk mellom
          oppdragsgiver og kommune, for den aktuelle tømmingen.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed p-3 bg-background rounded-md border-l-3 border-border">
          Når stat eller kommune sender deg ett vedtak eller andre brev med viktig
          innhold, blir du varslet på det mobilnummeret eller den e-postadressen du
          har lagt inn i Kontakt- og reservasjonsregisteret.
        </p>
        <a
          href="https://www.norge.no/nb/oppdater-eller-sjekk-kontaktinformasjon/42"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2.5 bg-dark text-white rounded-md px-5 py-3 text-xs font-bold uppercase tracking-wider no-underline self-start hover:bg-dark-light transition-colors"
        >
          Elektronisk varsling
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
    </div>
  )
}
