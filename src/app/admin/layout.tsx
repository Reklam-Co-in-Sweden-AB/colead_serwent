import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/order/Sidebar"
import { logout } from "@/actions/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="bg-dark px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-base">S</span>
          </div>
          <span className="text-white text-lg font-semibold tracking-tight">Serwent</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-xs hidden sm:inline">{user.email}</span>
          <form action={logout}>
            <button
              type="submit"
              className="text-white/50 text-sm hover:text-white transition-colors bg-transparent border border-white/15 rounded-md px-3 py-1.5 cursor-pointer"
            >
              Logg ut
            </button>
          </form>
        </div>
      </header>

      {/* Body */}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 sm:p-8 min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>
    </div>
  )
}
