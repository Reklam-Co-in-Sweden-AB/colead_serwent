import { Card, CardContent } from "@/components/ui/card"
import { FormList } from "@/components/order/FormList"
import { getForms } from "@/actions/forms"

export default async function FormsPage() {
  const forms = await getForms()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

  return (
    <div>
      <h1 className="text-dark text-2xl font-bold mb-6">Skjemaer</h1>
      <Card>
        <CardContent className="p-6">
          <FormList forms={forms} siteUrl={siteUrl} />
        </CardContent>
      </Card>
    </div>
  )
}
