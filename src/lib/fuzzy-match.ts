// Enkel Levenshtein-distanse for fuzzy-matching av sonenavn
// Brukes for å fange opp tastefeil i Comtech-eksport (f.eks. "Biri 1" vs "Biri1")

export function levenshtein(a: string, b: string): number {
  const al = a.length
  const bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al

  const prev = new Array(bl + 1)
  const curr = new Array(bl + 1)
  for (let j = 0; j <= bl; j++) prev[j] = j

  for (let i = 1; i <= al; i++) {
    curr[0] = i
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,       // sletting
        curr[j - 1] + 1,   // innsetting
        prev[j - 1] + cost // substitusjon
      )
    }
    for (let j = 0; j <= bl; j++) prev[j] = curr[j]
  }

  return prev[bl]
}

// Returnerer beste mulige match blant kandidater hvis distanse er ≤ terskel
export function bestFuzzyMatch(
  needle: string,
  candidates: string[],
  maxDistance = 2
): { match: string; distance: number } | null {
  let best: { match: string; distance: number } | null = null
  for (const c of candidates) {
    // Ignorer eksakte (case-insensitive) matcher — de er ikke fuzzy
    if (c.toLowerCase() === needle.toLowerCase()) continue
    const d = levenshtein(needle, c)
    if (d <= maxDistance && (best === null || d < best.distance)) {
      best = { match: c, distance: d }
    }
  }
  return best
}
