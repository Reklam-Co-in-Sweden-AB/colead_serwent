import { Card, CardContent } from "@/components/ui/card"
import { FormList } from "@/components/order/FormList"
import { getForms } from "@/actions/forms"

export default async function FormsPage() {
  const forms = await getForms()

  return (
    <div>
      <h1 className="text-dark text-2xl font-bold mb-6">Skjemaer</h1>
      <Card>
        <CardContent className="p-6">
          <FormList forms={forms} />
        </CardContent>
      </Card>
    </div>
  )
}
