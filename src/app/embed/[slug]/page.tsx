import { DynamicForm } from "@/components/order/DynamicForm"
import { getPublishedForm } from "@/actions/forms"

export default async function EmbedFormPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const form = await getPublishedForm(slug)

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
    </div>
  )
}
