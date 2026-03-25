import { DynamicForm } from "@/components/order/DynamicForm"
import { getPublishedForm } from "@/actions/forms"
import { getSettings } from "@/actions/settings"

export default async function EmbedFormPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [form, settings] = await Promise.all([
    getPublishedForm(slug),
    getSettings(),
  ])

  if (!form) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <p className="text-muted text-sm">Skjemaet finnes ikke eller er ikke publisert.</p>
      </div>
    )
  }

  return (
    <div className="p-2">
      <DynamicForm form={form} />

      {/* Informationsruta */}
      {settings.infoBox && (
        <div className="mt-6">
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
