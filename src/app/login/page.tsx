import { login } from "@/actions/auth"
import { Card, CardContent } from "@/components/ui/card"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-dark rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <h1 className="text-dark text-xl font-bold">
              Administratortilgang
            </h1>
            <p className="text-muted text-sm mt-1">
              Logg inn for å se og eksportere bestillinger.
            </p>
          </div>

          {error && (
            <div className="bg-error/10 border-2 border-error/20 rounded-md px-4 py-2.5 text-sm text-error mb-4">
              Feil e-post eller passord
            </div>
          )}

          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-dark uppercase tracking-wider">
                E-post
              </label>
              <input
                name="email"
                type="email"
                required
                className="border-2 border-border rounded-md px-3.5 py-2.5 text-sm text-foreground bg-white outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-dark uppercase tracking-wider">
                Passord
              </label>
              <input
                name="password"
                type="password"
                required
                className="border-2 border-border rounded-md px-3.5 py-2.5 text-sm text-foreground bg-white outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all"
              />
            </div>
            <button
              type="submit"
              className="bg-teal text-dark font-bold uppercase tracking-wider rounded-md py-2.5 text-sm hover:bg-teal-dark transition-colors cursor-pointer mt-2 border-2 border-teal hover:border-teal-dark"
            >
              Logg inn
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
