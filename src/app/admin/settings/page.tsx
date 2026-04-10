import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DesignSettings } from "@/components/settings/DesignSettings"
import { ChangePassword } from "@/components/settings/ChangePassword"
import { KommuneManager } from "@/components/settings/KommuneManager"
import { getSettings, getKommuner } from "@/actions/settings"

export default async function SettingsPage() {
  const [settings, kommuner] = await Promise.all([
    getSettings(),
    getKommuner(),
  ])

  const hasElks = !!(process.env.ELKS_API_USER && process.env.ELKS_API_PASSWORD)
  const hasResend = !!process.env.RESEND_API_KEY
  const hasCoLead = !!(process.env.COLEAD_API_URL && process.env.COLEAD_FORM_ID)
  const hasNotifyPhone = !!process.env.NOTIFY_PHONE
  const hasNotifyEmail = !!process.env.NOTIFY_EMAIL
  const hasEmailFrom = !!process.env.EMAIL_FROM
  const hasCronSecret = !!process.env.CRON_SECRET

  return (
    <div>
      <h1 className="text-dark text-2xl font-bold mb-6">Innstillinger</h1>

      <div className="flex flex-col gap-6">
        {/* Design — Färger och logga */}
        <div>
          <h2 className="text-dark text-lg font-bold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
            </svg>
            Design
          </h2>
          <DesignSettings
            initialColors={settings.colors}
            initialLogoUrl={settings.logoUrl}
            initialInfoBox={settings.infoBox}
          />
        </div>

        <hr className="border-border" />

        {/* Kommuner */}
        <div>
          <h2 className="text-dark text-lg font-bold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            Kommuner
          </h2>
          <KommuneManager initialKommuner={kommuner} />
        </div>

        <hr className="border-border" />

        {/* Endre passord (eget) */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-dark text-lg font-bold mb-2">Endre ditt passord</h3>
            <p className="text-muted text-sm mb-4">
              Oppdater passordet for din brukerkonto.
            </p>
            <ChangePassword />
          </CardContent>
        </Card>

        <hr className="border-border" />

        {/* Konverteringsspårning */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-dark text-lg font-bold">Konverteringssporing</h3>
              <Badge variant={!!(process.env.META_PIXEL_ID || process.env.GA_MEASUREMENT_ID) ? "success" : "default"}>
                {!!(process.env.META_PIXEL_ID || process.env.GA_MEASUREMENT_ID) ? "Aktiv" : "Ikke konfigurert"}
              </Badge>
            </div>
            <p className="text-muted text-sm mb-4">
              Sporer formulærvisninger og bestillinger via Meta Pixel og Google Analytics.
              Fungerer automatisk i iframe — konverteringer sendes til parent-sidens pixler via postMessage.
            </p>
            <div className="flex flex-col gap-3 max-w-lg">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-dark uppercase tracking-wider">Meta Pixel ID</label>
                  <Badge variant={!!process.env.META_PIXEL_ID ? "success" : "default"}>
                    {!!process.env.META_PIXEL_ID ? "Satt" : "Mangler"}
                  </Badge>
                </div>
                <input
                  value={process.env.META_PIXEL_ID ? "********" : ""}
                  readOnly
                  placeholder="Ikke konfigurert"
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-background text-muted"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-dark uppercase tracking-wider">Meta Access Token (CAPI)</label>
                  <Badge variant={!!process.env.META_ACCESS_TOKEN ? "success" : "default"}>
                    {!!process.env.META_ACCESS_TOKEN ? "Satt" : "Mangler"}
                  </Badge>
                </div>
                <input
                  value={process.env.META_ACCESS_TOKEN ? "********" : ""}
                  readOnly
                  placeholder="Ikke konfigurert"
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-background text-muted"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-dark uppercase tracking-wider">Google Analytics (GA4)</label>
                  <Badge variant={!!process.env.GA_MEASUREMENT_ID ? "success" : "default"}>
                    {!!process.env.GA_MEASUREMENT_ID ? "Satt" : "Mangler"}
                  </Badge>
                </div>
                <input
                  value={process.env.GA_MEASUREMENT_ID || ""}
                  readOnly
                  placeholder="Ikke konfigurert (G-XXXXXXXXXX)"
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-background text-muted"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-dark uppercase tracking-wider">Google Ads Conversion ID</label>
                  <Badge variant={!!process.env.GOOGLE_CONVERSION_ID ? "success" : "default"}>
                    {!!process.env.GOOGLE_CONVERSION_ID ? "Satt" : "Mangler"}
                  </Badge>
                </div>
                <input
                  value={process.env.GOOGLE_CONVERSION_ID || ""}
                  readOnly
                  placeholder="Ikke konfigurert"
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-background text-muted"
                />
              </div>
            </div>
            <p className="text-xs text-muted mt-3">
              Konfigureres via miljøvariabler. Server-side (Meta CAPI): META_PIXEL_ID, META_ACCESS_TOKEN.
              Client-side pixler installeres på serwent.no — iframe sender postMessage ved konvertering.
            </p>
          </CardContent>
        </Card>

        <hr className="border-border" />

        {/* SMS-integration */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-dark text-lg font-bold">SMS (46elks)</h3>
              <Badge variant={hasElks ? "success" : "error"}>
                {hasElks ? "Konfigurert" : "Ikke konfigurert"}
              </Badge>
            </div>
            <p className="text-muted text-sm mb-4">
              Send SMS til kunder og motta varsler via 46elks.
            </p>
            <div className="flex flex-col gap-3 max-w-lg">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-dark uppercase tracking-wider">API-bruker</label>
                <input
                  value={process.env.ELKS_API_USER ? "********" : ""}
                  readOnly
                  placeholder="Ikke konfigurert"
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-background text-muted"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-dark uppercase tracking-wider">API-passord</label>
                <input
                  value={process.env.ELKS_API_PASSWORD ? "********" : ""}
                  readOnly
                  placeholder="Ikke konfigurert"
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-background text-muted"
                />
              </div>
            </div>
            <p className="text-xs text-muted mt-3">
              Konfigureres via miljøvariabler (ELKS_API_USER, ELKS_API_PASSWORD).
            </p>
          </CardContent>
        </Card>

        {/* E-post-integration */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-dark text-lg font-bold">E-post (Resend)</h3>
              <Badge variant={hasResend ? "success" : "error"}>
                {hasResend ? "Konfigurert" : "Ikke konfigurert"}
              </Badge>
            </div>
            <p className="text-muted text-sm mb-4">
              Send e-post til kunder og motta varsler via Resend.
            </p>
            <div className="flex flex-col gap-3 max-w-lg">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-dark uppercase tracking-wider">Resend API-nøkkel</label>
                <input
                  value={process.env.RESEND_API_KEY ? "********" : ""}
                  readOnly
                  placeholder="Ikke konfigurert"
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-background text-muted"
                />
              </div>
            </div>
            <p className="text-xs text-muted mt-3">
              Konfigureres via miljøvariabler (RESEND_API_KEY).
            </p>
          </CardContent>
        </Card>

        {/* Avsändaradress */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-dark text-lg font-bold">Avsenderadresse</h3>
              <Badge variant={hasEmailFrom ? "success" : "default"}>
                {hasEmailFrom ? "Tilpasset" : "Standard"}
              </Badge>
            </div>
            <p className="text-muted text-sm mb-4">
              Avsenderadresse for e-post sendt til kunder og bedriften.
            </p>
            <div className="flex flex-col gap-3 max-w-lg">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-dark uppercase tracking-wider">E-post fra</label>
                <input
                  value={process.env.EMAIL_FROM || "Serwent <noreply@serwent.no>"}
                  readOnly
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-background text-muted"
                />
              </div>
            </div>
            <p className="text-xs text-muted mt-3">
              Konfigureres via miljøvariabel (EMAIL_FROM). Format: Navn &lt;epost@domene.no&gt;
            </p>
          </CardContent>
        </Card>

        {/* Varsler */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-dark text-lg font-bold mb-2">Varsler til bedriften</h3>
            <p className="text-muted text-sm mb-4">
              Motta varsler om nye bestillinger via SMS og/eller e-post.
            </p>
            <div className="flex flex-col gap-3 max-w-lg">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-dark uppercase tracking-wider">Varsel-telefon (SMS)</label>
                  <Badge variant={hasNotifyPhone ? "success" : "default"}>
                    {hasNotifyPhone ? "Aktiv" : "Ikke satt"}
                  </Badge>
                </div>
                <input
                  value={process.env.NOTIFY_PHONE || ""}
                  readOnly
                  placeholder="Ikke konfigurert"
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-background text-muted"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-dark uppercase tracking-wider">Varsel-e-post</label>
                  <Badge variant={hasNotifyEmail ? "success" : "default"}>
                    {hasNotifyEmail ? "Aktiv" : "Ikke satt"}
                  </Badge>
                </div>
                <input
                  value={process.env.NOTIFY_EMAIL || ""}
                  readOnly
                  placeholder="Ikke konfigurert"
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-background text-muted"
                />
              </div>
            </div>
            <p className="text-xs text-muted mt-3">
              Konfigureres via miljøvariabler (NOTIFY_PHONE, NOTIFY_EMAIL).
            </p>
          </CardContent>
        </Card>

        {/* CoLead */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-dark text-lg font-bold">CoLead-integrasjon</h3>
              <Badge variant={hasCoLead ? "success" : "default"}>
                {hasCoLead ? "Konfigurert" : "Ikke konfigurert"}
              </Badge>
            </div>
            <p className="text-muted text-sm mb-4">
              Synkroniser bestillinger til CoLead-plattformen automatisk.
            </p>
            <div className="flex flex-col gap-3 max-w-lg">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-dark uppercase tracking-wider">CoLead API URL</label>
                <input
                  value={process.env.COLEAD_API_URL || ""}
                  readOnly
                  placeholder="Ikke konfigurert"
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-background text-muted"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-dark uppercase tracking-wider">CoLead Form ID</label>
                <input
                  value={process.env.COLEAD_FORM_ID || ""}
                  readOnly
                  placeholder="Ikke konfigurert"
                  className="border-2 border-border rounded-md px-3 py-2 text-sm bg-background text-muted"
                />
              </div>
            </div>
            <p className="text-xs text-muted mt-3">
              Konfigureres via miljøvariabler (COLEAD_API_URL, COLEAD_FORM_ID).
            </p>
          </CardContent>
        </Card>

        {/* Oversikt */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-dark text-lg font-bold mb-4">Miljøvariabler</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-xs font-semibold text-muted uppercase tracking-wider">Variabel</th>
                    <th className="text-left py-2 text-xs font-semibold text-muted uppercase tracking-wider">Beskrivelse</th>
                    <th className="text-left py-2 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {[
                    { key: "META_PIXEL_ID", desc: "Meta Pixel ID (server-side CAPI)", set: !!process.env.META_PIXEL_ID },
                    { key: "META_ACCESS_TOKEN", desc: "Meta Conversions API token", set: !!process.env.META_ACCESS_TOKEN },
                    { key: "GA_MEASUREMENT_ID", desc: "Google Analytics 4 Measurement ID", set: !!process.env.GA_MEASUREMENT_ID },
                    { key: "GOOGLE_CONVERSION_ID", desc: "Google Ads Conversion ID", set: !!process.env.GOOGLE_CONVERSION_ID },
                    { key: "GOOGLE_CONVERSION_LABEL", desc: "Google Ads Conversion Label", set: !!process.env.GOOGLE_CONVERSION_LABEL },
                    { key: "ELKS_API_USER", desc: "46elks API-bruker", set: !!process.env.ELKS_API_USER },
                    { key: "ELKS_API_PASSWORD", desc: "46elks API-passord", set: !!process.env.ELKS_API_PASSWORD },
                    { key: "RESEND_API_KEY", desc: "Resend API-nøkkel", set: !!process.env.RESEND_API_KEY },
                    { key: "NOTIFY_PHONE", desc: "Telefon for SMS-varsler", set: !!process.env.NOTIFY_PHONE },
                    { key: "NOTIFY_EMAIL", desc: "E-post for varsler", set: !!process.env.NOTIFY_EMAIL },
                    { key: "EMAIL_FROM", desc: "Avsenderadresse for e-post", set: hasEmailFrom },
                    { key: "CRON_SECRET", desc: "Hemmelighet for planlagte automationer", set: hasCronSecret },
                    { key: "COLEAD_API_URL", desc: "CoLead API URL", set: !!process.env.COLEAD_API_URL },
                    { key: "COLEAD_FORM_ID", desc: "CoLead Form ID", set: !!process.env.COLEAD_FORM_ID },
                  ].map((v) => (
                    <tr key={v.key} className="border-b border-border/50">
                      <td className="py-2 font-mono text-dark">{v.key}</td>
                      <td className="py-2 text-muted">{v.desc}</td>
                      <td className="py-2">
                        <Badge variant={v.set ? "success" : "default"}>
                          {v.set ? "Satt" : "Mangler"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
