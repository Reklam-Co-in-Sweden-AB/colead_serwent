// Typer för Serwent Produksjon & Ruteplanlegger

export interface RodeNotat {
  id: string
  sone_id: string
  aar: number
  notat: string
  forfatter: string | null
  created_at: string
  updated_at: string
}

export interface Sone {
  id: string
  kommune: string
  navn: string
  gruppe: string | null
  farge: string
  sort_order: number
  aktiv: boolean
  created_at: string
}

export interface SoneInsert {
  kommune: string
  navn: string
  gruppe?: string | null
  farge?: string
  sort_order?: number
  aktiv?: boolean
}

export interface Ruteplan {
  id: string
  sone_id: string
  aar: number
  uke: number
  planlagt: number
  status: "Utkast" | "Publisert"
  created_at: string
}

export interface RuteplanWithSone extends Ruteplan {
  serwent_soner: Sone
}

export interface Produksjon {
  id: string
  sone_id: string
  aar: number
  uke: number
  kjort_rute: number
  kjort_best: number
  registrert_av: string | null
  oppdatert: string
}

export interface ProduksjonUpdate {
  sone_id: string
  aar: number
  uke: number
  kjort_rute: number
  kjort_best: number
}

// Aggregerade typer för dashboard
export interface WeekSummary {
  uke: number
  planlagt: number
  kjort_rute: number
  kjort_best: number
  restanse: number
}

export interface ProduksjonStats {
  totalPlanlagt: number
  totalKjort: number
  totalBestilling: number
  restanse: number
}

export interface ZoneWeekEntry {
  planlagt: number
  kjort_rute: number
  kjort_best: number
}

export interface ZoneWeekData {
  sone: Sone
  planlagt: number
  kjort_rute: number
  kjort_best: number
}
