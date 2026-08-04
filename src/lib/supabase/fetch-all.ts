/**
 * Hämtar ALLA rader från en Supabase-query genom sidindelning med .range().
 *
 * Bakgrund: PostgREST (Supabase) returnerar som standard max 1000 rader per
 * anrop. En query utan paginering misslyckas inte — den returnerar tyst bara
 * de första 1000 raderna. För aggregat och statistik ger det felaktiga siffror
 * som ser rimliga ut, vilket är svårt att upptäcka.
 *
 * Anropas med en fabrik som bygger queryn på nytt för varje sida. Sortera alltid
 * på en unik kolumn (t.ex. id) i queryn, annars är radordningen mellan sidorna
 * odefinierad och rader kan dupliceras eller hoppas över.
 *
 * Exempel:
 *   const { data, error } = await fetchAllRows(() =>
 *     supabase.from("tabell").select("*").eq("aar", 2026).order("id")
 *   )
 */

interface RangeQuery<T> {
  range(
    from: number,
    to: number
  ): PromiseLike<{ data: T[] | null; error: { message: string } | null }>
}

const PAGE_SIZE = 1000
// Skyddsräcke mot oändlig loop om en query beter sig oväntat.
const MAX_PAGES = 200

export async function fetchAllRows<T>(
  build: () => RangeQuery<T>,
  pageSize: number = PAGE_SIZE
): Promise<{ data: T[]; error: { message: string } | null; truncated: boolean }> {
  const rows: T[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * pageSize
    const { data, error } = await build().range(from, from + pageSize - 1)

    if (error) return { data: rows, error, truncated: false }

    const batch = data || []
    rows.push(...batch)

    // Kortare sida än begärt = sista sidan
    if (batch.length < pageSize) {
      return { data: rows, error: null, truncated: false }
    }
  }

  console.warn(
    `[fetchAllRows] Nådde sidgränsen (${MAX_PAGES} sidor / ${MAX_PAGES * pageSize} rader) — resultatet kan vara ofullständigt`
  )
  return { data: rows, error: null, truncated: true }
}
