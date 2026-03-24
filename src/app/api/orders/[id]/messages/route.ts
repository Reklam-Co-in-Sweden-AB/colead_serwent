import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Autentiseringskontroll
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 })
  }

  const { id } = await params

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, channel, recipient, subject, body, status, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: "Kunne ikke hente meldinger" }, { status: 500 })
  }

  return NextResponse.json({ messages: messages || [] })
}
