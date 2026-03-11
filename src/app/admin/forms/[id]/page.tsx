import { Card, CardContent } from "@/components/ui/card"
import { FormBuilder } from "@/components/order/FormBuilder"
import { getFormWithSteps } from "@/actions/forms"
import { redirect } from "next/navigation"

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const form = await getFormWithSteps(id)

  if (!form) {
    redirect("/admin/forms")
  }

  return (
    <div>
      <div className="mb-6">
        <a href="/admin/forms" className="text-teal text-sm font-semibold no-underline hover:underline">
          &larr; Tilbake til skjemaer
        </a>
      </div>
      <Card>
        <CardContent className="p-6">
          <FormBuilder form={form} />
        </CardContent>
      </Card>
    </div>
  )
}
