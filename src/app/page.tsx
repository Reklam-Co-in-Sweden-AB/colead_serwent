import { Card, CardContent } from "@/components/ui/card"
import { DynamicForm } from "@/components/order/DynamicForm"
import { getPublishedForm } from "@/actions/forms"
import { OrderForm } from "@/components/order/OrderForm"

export default async function Home() {
  // Try loading the dynamic form from database
  const form = await getPublishedForm("bestilling")

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-dark px-4 sm:px-8">
        <div className="max-w-[900px] mx-auto flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base">S</span>
            </div>
            <span className="text-white text-lg font-semibold tracking-tight">
              Serwent
            </span>
            <span className="text-teal text-sm hidden sm:inline">
              / Bestillingstømming
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-dark to-dark-light px-4 sm:px-8 py-10 pb-8">
        <div className="max-w-[900px] mx-auto">
          <h1 className="text-white text-3xl font-bold mb-2 tracking-tight">
            {form?.headline || "Bestill tømming"}
          </h1>
          <p className="text-teal text-base">
            {form?.description || "Fyll ut skjemaet nedenfor for å bestille slamsuging eller septiktømming."}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-[900px] mx-auto px-4 sm:px-5 py-8">
        <Card>
          <CardContent className="p-6 sm:p-8">
            {form ? <DynamicForm form={form} /> : <OrderForm />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
