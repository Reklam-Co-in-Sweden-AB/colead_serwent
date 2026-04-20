// Genererer URL-slug fra kommune-navn (bokmål) for bestillingslenker per kommune.
// F.eks. "Østre Toten" → "ostre-toten", "Gjøvik" → "gjovik".
export function kommuneToSlug(navn: string): string {
  return navn
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

// Finner kommune-navn i en gitt liste basert på slug.
export function slugToKommune(slug: string, kommuner: string[]): string | null {
  const match = kommuner.find((k) => kommuneToSlug(k) === slug)
  return match || null
}
