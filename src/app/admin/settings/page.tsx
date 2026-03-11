import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function SettingsPage() {
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
