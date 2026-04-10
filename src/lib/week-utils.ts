// Hjälpfunktioner för ISO 8601-veckonummer

/**
 * Returnerar ISO-veckonumret för ett givet datum.
 * Norsk/europeisk standard: veckan börjar på måndag.
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Returnerar aktuell vecka (ISO 8601).
 */
export function getCurrentWeek(): number {
  return getISOWeekNumber(new Date())
}

/**
 * Returnerar aktuellt år.
 */
export function getCurrentYear(): number {
  return new Date().getFullYear()
}

/**
 * Returnerar antal ISO-veckor för ett givet år (52 eller 53).
 */
export function getWeeksInYear(year: number): number {
  const dec28 = new Date(year, 11, 28)
  return getISOWeekNumber(dec28)
}

/**
 * Returnerar en array med veckonummer [1, 2, ..., 52/53] för ett år.
 */
export function getWeekRange(year: number): number[] {
  const count = getWeeksInYear(year)
  return Array.from({ length: count }, (_, i) => i + 1)
}

/**
 * Månadsnamn (norska) med ungefärliga veckonummer.
 * Används för Gantt-headers.
 */
export const MONTH_WEEKS: { label: string; endWeek: number }[] = [
  { label: "Jan", endWeek: 4 },
  { label: "Feb", endWeek: 9 },
  { label: "Mar", endWeek: 13 },
  { label: "Apr", endWeek: 17 },
  { label: "Mai", endWeek: 22 },
  { label: "Jun", endWeek: 26 },
  { label: "Jul", endWeek: 30 },
  { label: "Aug", endWeek: 35 },
  { label: "Sep", endWeek: 39 },
  { label: "Okt", endWeek: 44 },
  { label: "Nov", endWeek: 48 },
  { label: "Des", endWeek: 52 },
]
