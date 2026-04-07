/**
 * CoLead integration — syncs orders to CoLead as leads
 */

interface CoLeadSyncData {
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
  order_id: string
}

export async function syncToCoLead(data: CoLeadSyncData): Promise<{ success: boolean; lead_id?: string }> {
  const coleadUrl = process.env.COLEAD_API_URL
  const coleadFormId = process.env.COLEAD_FORM_ID

  if (!coleadUrl || !coleadFormId) {
    console.log("[CoLead] Sync disabled — COLEAD_API_URL or COLEAD_FORM_ID not configured")
    return { success: false }
  }

  try {
    const res = await fetch(`${coleadUrl}/api/leads/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form_id: coleadFormId,
        form_data: {
          kommune: data.kommune,
          tomming_type: data.tomming_type,
          adresse: data.adresse,
          gnr: data.gnr,
          bnr: data.bnr,
          kommentar: data.kommentar || "",
          tank_storrelse_m3: data.tank_storrelse_m3,
          order_id: data.order_id,
        },
        // CoLead extracts these automatically from form field types
        // but we can include them in form_data too
      }),
    })

    if (!res.ok) {
      console.error("[CoLead] Sync failed:", res.status, await res.text())
      return { success: false }
    }

    const result = await res.json()
    return { success: true, lead_id: result.lead_id }
  } catch (error) {
    console.error("[CoLead] Sync error:", error)
    return { success: false }
  }
}
