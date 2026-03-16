"use client"

import { useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type SiteColors, DEFAULT_COLORS } from "@/types/settings"
import { saveColors, uploadLogo, removeLogo, saveInfoBox } from "@/actions/settings"

interface DesignSettingsProps {
  initialColors: SiteColors
  initialLogoUrl: string | null
  initialInfoBox: string | null
}

// Färgfält med label och beskrivning
const COLOR_FIELDS: { key: keyof SiteColors; label: string; desc: string }[] = [
  { key: "dark", label: "Primærfarge", desc: "Header, sidebar og bakgrunn" },
  { key: "darkLight", label: "Primær lys", desc: "Gradient og hover-effekter" },
  { key: "teal", label: "Aksentfarge", desc: "Knapper, lenker og aktive elementer" },
  { key: "tealDark", label: "Aksent mørk", desc: "Hover-tilstand på knapper" },
  { key: "background", label: "Bakgrunnsfarge", desc: "Sidens bakgrunn" },
]

export function DesignSettings({ initialColors, initialLogoUrl, initialInfoBox }: DesignSettingsProps) {
  const [colors, setColors] = useState<SiteColors>(initialColors)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [infoBox, setInfoBox] = useState(initialInfoBox || "")
  const [saving, setSaving] = useState(false)
  const [savingInfoBox, setSavingInfoBox] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleColorChange = (key: keyof SiteColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveColors = async () => {
    setSaving(true)
    setMessage(null)
    const result = await saveColors(colors)
    if (result.error) {
      setMessage({ type: "error", text: result.error })
    } else {
      setMessage({ type: "success", text: "Farger lagret!" })
    }
    setSaving(false)
  }

  const handleResetColors = () => {
    setColors(DEFAULT_COLORS)
    setMessage(null)
  }

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append("logo", file)

    const result = await uploadLogo(formData)
    if (result.error) {
      setMessage({ type: "error", text: result.error })
    } else {
      setLogoUrl(result.logoUrl || null)
      setMessage({ type: "success", text: "Logo lastet opp!" })
    }
    setUploading(false)

    // Nollställ inputfältet
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleRemoveLogo = async () => {
    setUploading(true)
    setMessage(null)
    const result = await removeLogo()
    if (result.error) {
      setMessage({ type: "error", text: result.error })
    } else {
      setLogoUrl(null)
      setMessage({ type: "success", text: "Logo fjernet!" })
    }
    setUploading(false)
  }

  const handleSaveInfoBox = async () => {
    setSavingInfoBox(true)
    setMessage(null)
    const result = await saveInfoBox(infoBox)
    if (result.error) {
      setMessage({ type: "error", text: result.error })
    } else {
      setMessage({ type: "success", text: "Informasjonstekst lagret!" })
    }
    setSavingInfoBox(false)
  }

  const hasInfoBoxChanges = infoBox !== (initialInfoBox || "")
  const hasChanges = JSON.stringify(colors) !== JSON.stringify(initialColors)

  return (
    <div className="flex flex-col gap-6">
      {/* Statusmeddelande */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-success/10 text-success border border-success/20"
              : "bg-error/10 text-error border border-error/20"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Logga */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-dark text-lg font-bold mb-2">Logo</h3>
          <p className="text-muted text-sm mb-4">
            Last opp bedriftens logo. Vises i header på bestillingsskjemaet og i adminpanelet.
          </p>

          <div className="flex items-start gap-6">
            {/* Förhandsvisning */}
            <div className="w-32 h-32 border-2 border-dashed border-border rounded-xl flex items-center justify-center bg-background shrink-0 overflow-hidden">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <div className="text-center text-muted">
                  <svg className="w-10 h-10 mx-auto mb-1 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                  </svg>
                  <span className="text-xs">Ingen logo</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleUploadLogo}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors
                    ${uploading ? "bg-border text-muted" : "bg-dark text-white hover:bg-dark-light"}`}
                >
                  {uploading ? "Laster opp..." : "Last opp logo"}
                </label>
              </div>
              <p className="text-xs text-muted">PNG, JPG, SVG eller WebP. Maks 2MB.</p>
              {logoUrl && (
                <button
                  onClick={handleRemoveLogo}
                  disabled={uploading}
                  className="text-error text-sm hover:underline text-left cursor-pointer disabled:opacity-50"
                >
                  Fjern logo
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informationsruta */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-dark text-lg font-bold mb-2">Informasjonsrute</h3>
          <p className="text-muted text-sm mb-4">
            Vis en informasjonsrute på bestillingssiden. La feltet stå tomt for å skjule ruten.
          </p>
          <textarea
            value={infoBox}
            onChange={(e) => setInfoBox(e.target.value)}
            placeholder="Skriv informasjonstekst her..."
            rows={4}
            className="w-full border-2 border-border rounded-md px-3.5 py-2.5 text-sm text-foreground bg-white outline-none resize-y transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/20 mb-4"
          />
          <Button onClick={handleSaveInfoBox} disabled={savingInfoBox || !hasInfoBoxChanges}>
            {savingInfoBox ? "Lagrer..." : "Lagre informasjonstekst"}
          </Button>
        </CardContent>
      </Card>

      {/* Färgval */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-dark text-lg font-bold mb-2">Farger</h3>
          <p className="text-muted text-sm mb-6">
            Tilpass fargene som brukes på bestillingsskjemaet og i adminpanelet.
          </p>

          {/* Förhandsvisning */}
          <div className="mb-6 rounded-xl overflow-hidden border border-border">
            <div
              className="px-5 py-3 flex items-center gap-3"
              style={{ backgroundColor: colors.dark }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 object-contain" />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: colors.teal }}
                >
                  <span className="text-white font-bold text-sm">S</span>
                </div>
              )}
              <span className="text-white text-sm font-semibold">Forhåndsvisning</span>
              <span className="text-sm ml-auto" style={{ color: colors.teal }}>/ Bestilling</span>
            </div>
            <div
              className="h-2"
              style={{ background: `linear-gradient(to right, ${colors.dark}, ${colors.darkLight})` }}
            />
            <div className="p-5 flex items-center gap-3" style={{ backgroundColor: colors.background }}>
              <button
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ backgroundColor: colors.teal }}
              >
                Primær knapp
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold border-2"
                style={{ borderColor: colors.teal, color: colors.teal }}
              >
                Sekundær knapp
              </button>
            </div>
          </div>

          {/* Färgfält */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            {COLOR_FIELDS.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border hover:border-border-hover transition-colors"
                    style={{ padding: "2px" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-sm font-semibold text-dark block">{label}</label>
                  <span className="text-xs text-muted block">{desc}</span>
                  <input
                    type="text"
                    value={colors[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="mt-1 text-xs font-mono text-muted bg-background border border-border rounded px-2 py-1 w-24"
                    maxLength={7}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Knappar */}
          <div className="flex items-center gap-3 mt-6">
            <Button onClick={handleSaveColors} disabled={saving || !hasChanges}>
              {saving ? "Lagrer..." : "Lagre farger"}
            </Button>
            <button
              onClick={handleResetColors}
              className="text-sm text-muted hover:text-dark transition-colors cursor-pointer"
            >
              Tilbakestill til standard
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
