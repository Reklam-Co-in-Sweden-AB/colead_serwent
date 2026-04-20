// Normaliserar fritextbeskrivning av anleggstype / tömningstyp till en kortare
// kategori-nyckel. Används för att matcha ekstra-tömninger mot rätt anlegg
// på samma adress (t.ex. "Lukket tank" och "Lukket tank ekstratømming" räknas
// som samma anlegg, medan "Slamavskiller" räknas som ett separat anlegg).

export function normalizeAnleggsType(value: string | null | undefined): string {
  if (!value) return "ukjent"
  const t = value.toLowerCase().trim()

  if (t.includes("lukket") || t.includes("tett tank") || t.includes("tettank")) {
    return "lukket_tank"
  }
  if (t.includes("slamavskiller") || t.includes("infiltrasjon") || t.includes("septik")) {
    return "slamavskiller"
  }
  if (t.includes("minirense")) return "minirense"
  if (t.includes("sanering")) return "sanering"
  if (t.includes("nød")) return "nodtomming"
  if (t.includes("delvis")) return "delvis_tilkoblet"

  // Fallback — kortad version av första betydande ord
  return t.split(/[\s/]/)[0].slice(0, 20) || "ukjent"
}
