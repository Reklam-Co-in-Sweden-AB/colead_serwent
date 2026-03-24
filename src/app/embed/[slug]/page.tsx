import { Card, CardContent } from "@/components/ui/card"
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
    <div className="p-4">
      {/* Kompakt header för inbäddat formulär */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-3">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="h-8 object-contain"
            />
          ) : (
            <div className="w-8 h-8 bg-dark rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
          )}
          <h1 className="text-dark text-xl font-bold">
            {form.headline || "Bestill tømming"}
          </h1>
        </div>
        {form.description && (
          <p className="text-muted text-sm">{form.description}</p>
        )}
      </div>

      {/* Formuläret */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <DynamicForm form={form} />
        </CardContent>
      </Card>

      {/* Powered by-länk */}
      <div className="mt-3 text-center">
        <a
          href={process.env.NEXT_PUBLIC_SITE_URL || "/"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted hover:text-dark transition-colors no-underline"
        >
          Powered by Serwent
        </a>
      </div>
    </div>
  )
}
