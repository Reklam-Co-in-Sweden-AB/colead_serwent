import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rate-limit"

/**
 * Kartverket address lookup proxy
 * Searches Norwegian addresses and returns suggestions with Gnr/Bnr
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")

  if (!query || query.length < 3) {
    return NextResponse.json({ suggestions: [] })
  }

  // Rate limit: 30 lookups per IP per minute
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const { success } = rateLimit(`address:${ip}`, 30)
  if (!success) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const url = new URL("https://ws.geonorge.no/adresser/v1/sok")
    url.searchParams.set("sok", query)
    url.searchParams.set("treffPerSide", "5")
    url.searchParams.set("utkoordsys", "4258")

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    })

    if (!res.ok) {
      return NextResponse.json({ suggestions: [] })
    }

    const data = await res.json()

    const suggestions = (data.adresser || []).map(
      (adr: {
        adressenavn: string
        nummer: number
        bokstav: string
        postnummer: string
        poststed: string
        gardsnummer: number
        bruksnummer: number
        kommunenavn: string
      }) => ({
        adressenavn: adr.adressenavn,
        nummer: adr.nummer,
        bokstav: adr.bokstav || "",
        postnummer: adr.postnummer,
        poststed: adr.poststed,
        gardsnummer: adr.gardsnummer,
        bruksnummer: adr.bruksnummer,
        kommunenavn: adr.kommunenavn,
      })
    )

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("[Address] Lookup error:", error)
    return NextResponse.json({ suggestions: [] })
  }
}
