import { Card, CardContent } from "@/components/ui/card"
import { DynamicForm } from "@/components/order/DynamicForm"
import { getPublishedForm } from "@/actions/forms"
import { OrderForm } from "@/components/order/OrderForm"
import { getSettings } from "@/actions/settings"

export default async function Home() {
  // Hämta formulär och design-inställningar
  const [form, settings] = await Promise.all([
    getPublishedForm("bestilling"),
    getSettings(),
  ])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-dark px-4 sm:px-8">
        <div className="max-w-[900px] mx-auto flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Serwent"
                className="h-9 object-contain"
              />
            ) : (
              <>
                <div className="w-9 h-9 bg-teal rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-base">S</span>
                </div>
                <span className="text-white text-lg font-semibold tracking-tight">
                  Serwent
                </span>
              </>
            )}
            <span className="text-teal text-sm hidden sm:inline">
              / Bestillingstømming
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-dark to-dark-light px-4 sm:px-8 py-10 pb-8">
        <div className="max-w-[900px] mx-auto px-0">
          <h1 className="text-white text-3xl font-bold mb-2 tracking-tight">
            {form?.headline || "Bestill tømming"}
          </h1>
          <p className="text-teal text-base">
            {form?.description || "Fyll ut skjemaet nedenfor for å bestille slamsuging eller septiktømming."}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-[1100px] mx-auto py-8 px-4 sm:px-8">
        <Card>
          <CardContent className="p-6 sm:p-10">
            {form ? <DynamicForm form={form} /> : <OrderForm />}
          </CardContent>
        </Card>
      </div>

      {/* Informationsruta */}
      {settings.infoBox && (
        <div className="max-w-[1100px] mx-auto pb-8 px-4 sm:px-8">
          <div className="bg-white border-2 border-teal/20 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-teal shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-dark leading-relaxed whitespace-pre-line">
                {settings.infoBox}
              </p>
            </div>
            <a
              href="https://www.norge.no/nb/oppdater-eller-sjekk-kontaktinformasjon/42"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2.5 bg-dark text-white rounded-md px-5 py-3 text-xs font-bold uppercase tracking-wider no-underline self-start hover:bg-dark/85 transition-colors ml-8"
            >
              Elektronisk varsling
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
