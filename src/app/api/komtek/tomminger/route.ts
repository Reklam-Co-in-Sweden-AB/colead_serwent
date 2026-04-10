import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Hämta enskilda tömningar för en sone/år/vecka.
 * GET /api/komtek/tomminger?sone_id=xxx&aar=2026&uke=10
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const soneId = searchParams.get("sone_id")
  const aar = searchParams.get("aar")
  const uke = searchParams.get("uke")

  if (!soneId || !aar || !uke) {
    return NextResponse.json({ error: "Saknar sone_id, aar eller uke" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("serwent_komtek_tomming")
    .select("id, tomme_dato, kunde, adresse, postnummer, poststed, anleggstype, type_tomming, tomme_volum, tommer, avvik, rodenavn")
    .eq("sone_id", soneId)
    .eq("aar", parseInt(aar))
    .eq("uke", parseInt(uke))
    .order("tomme_dato", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Beräkna total volym
  const totalVolum = (data || []).reduce((sum, t) => sum + (t.tomme_volum || 0), 0)

  return NextResponse.json({
    tomminger: data || [],
    total: data?.length || 0,
    total_volum: totalVolum,
  })
}
