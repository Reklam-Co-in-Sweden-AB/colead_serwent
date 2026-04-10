export type OrderStatus = "ny" | "under_behandling" | "utfort"

export interface Order {
  id: string
  order_id: string
  kommune: string
  tomming_type: string
  navn: string
  epost: string
  telefon: string
  adresse: string
  gnr: string
  bnr: string
  kommentar: string | null
  tank_storrelse_m3: number | null
  intern_kommentar: string | null
  status: OrderStatus
  colead_synced: boolean
  colead_lead_id: string | null
  planlagt_dato: string | null
  created_at: string
  updated_at: string
}

export interface OrderInsert {
  order_id: string
  kommune: string
  tomming_type: string
  navn: string
  epost: string
  telefon: string
  adresse: string
  gnr: string
  bnr: string
  kommentar?: string | null
  tank_storrelse_m3?: number | null
  status?: OrderStatus
}

export interface OrderUpdate {
  order_id?: string
  kommune?: string
  tomming_type?: string
  navn?: string
  epost?: string
  telefon?: string
  adresse?: string
  gnr?: string
  bnr?: string
  kommentar?: string | null
  tank_storrelse_m3?: number | null
  intern_kommentar?: string | null
  status?: OrderStatus
  colead_synced?: boolean
  colead_lead_id?: string | null
}

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: Order
        Insert: OrderInsert
        Update: OrderUpdate
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
