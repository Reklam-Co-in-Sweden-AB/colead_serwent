export const KOMMUNER = [
  "Vestre Toten",
  "Østre Toten",
  "Nordre Land",
  "Søndre Land",
  "Stange",
  "Lillehammer",
  "Gjøvik",
  "Gausdal",
  "Øyer",
] as const

export const TØMMINGER = [
  "Lukket tank",
  "Lukket tank ekstratømming (ekstra kostnader vil påløpe)",
  "Slamavskiller / Infiltrasjonsanlegg",
  "Slamavskiller ekstratømming (ekstra kostnader vil påløpe)",
  "Minirenseanlegg",
  "Saneringstømming med rengjøring",
  "Saneringstømming uten rengjøring",
  "Nødtømming (ekstra kostnader vil påløpe)",
  "Tømming av delvis koblet anlegg",
] as const

export const ORDER_STATUSES = ["ny", "under_behandling", "utfort"] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  ny: "Ny",
  under_behandling: "Under behandling",
  utfort: "Utført",
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  ny: "#E8321E",
  under_behandling: "#f59e0b",
  utfort: "#22c55e",
}
