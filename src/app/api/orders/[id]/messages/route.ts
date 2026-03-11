import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

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
