import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Komtek-import — tar emot tömningshistorik och upsertar i serwent_produksjon.
 * Matchar Rodenavn mot befintliga soner, skapar nya vid behov.
 * Aggregerar tömningar per sone/år/vecka.
 *
 * Autentisering: antingen via x-import-secret (script) eller Supabase-session (admin-UI).
 */

interface KomtekRow {
  kommune: string
  tomme_dato: string // ISO-datum
  anlegg: string | null
  kunde: string | null
  adresse: string | null
  postnummer: string | null
  poststed: string | null
  eiendom: string | null
  anleggstype: string | null
  avtaletype: string | null
  type_tomming: string | null
  bil: string | null
  adkomst: string | null
  tomt: string | null
  tomme_volum: number | null
  slangeutlegg: number | null
  hoydeforskjell: number | null
  tommer: string | null
  merknad: string | null
  avvik: string | null
  rodenavn: string
}

// Beräkna ISO-veckonummer från datum
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// Beräkna ISO-veckoår (kan skilja sig från kalenderår kring nyår)
function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  return d.getUTCFullYear()
}

export async function POST(request: NextRequest) {
  // Autentisering — antingen via secret (script) eller session (admin-UI)
  const secret = request.headers.get("x-import-secret")
  if (secret === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // OK — script-autentisering
  } else {
    // Försök session-baserad autentisering
    const supabaseSession = await createClient()
    const { data: { user } } = await supabaseSession.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const { rows, kommune, filnamn } = (await request.json()) as {
    rows: KomtekRow[]
    kommune: string
    filnamn?: string
  }

  if (!rows?.length || !kommune) {
    return NextResponse.json(
      { error: "Saknar rows eller kommune" },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Hämta befintliga soner för kommunen
  const { data: existingSoner, error: sonerErr } = await supabase
    .from("serwent_soner")
    .select("id, navn")
    .eq("kommune", kommune)

  if (sonerErr) {
    return NextResponse.json(
      { error: `Kunde inte hämta soner: ${sonerErr.message}` },
      { status: 500 }
    )
  }

  // Bygg namnuppslagning (case-insensitiv)
  const soneMap = new Map<string, string>()
  for (const s of existingSoner || []) {
    soneMap.set(s.navn.toLowerCase(), s.id)
  }

  // Standardfärger för nya soner
  const COLORS = ["#1B3A6B", "#E8321E", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#ec4899", "#14b8a6"]
  let nextSort = (existingSoner?.length || 0) + 1

  // Samla unika Rodenavn och skapa soner som saknas
  const uniqueRoder = new Set<string>()
  for (const row of rows) {
    if (row.rodenavn) uniqueRoder.add(row.rodenavn)
  }

  const createdSoner: string[] = []
  for (const rodeNavn of uniqueRoder) {
    if (!soneMap.has(rodeNavn.toLowerCase())) {
      const { data: newSone, error: createErr } = await supabase
        .from("serwent_soner")
        .insert({
          kommune,
          navn: rodeNavn,
          farge: COLORS[(nextSort - 1) % COLORS.length],
          sort_order: nextSort++,
          aktiv: true,
        })
        .select("id")
        .single()

      if (createErr) {
        return NextResponse.json(
          { error: `Kunde inte skapa sone "${rodeNavn}": ${createErr.message}` },
          { status: 500 }
        )
      }

      soneMap.set(rodeNavn.toLowerCase(), newSone.id)
      createdSoner.push(rodeNavn)
    }
  }

  // Skapa importlogg-ID i förväg för att knyta enskilda rader
  const { data: logEntry } = await supabase
    .from("serwent_komtek_log")
    .insert({
      kommune,
      filnamn: filnamn || "okänd fil",
      total_rader: rows.length,
      importerade: 0,
      hoppade_over: 0,
      sone_uker: 0,
      skapade_soner: createdSoner,
      soner: [...soneMap.keys()],
      importert_av: "admin",
    })
    .select("id")
    .single()

  const importId = logEntry?.id || null

  // Aggregera: sone_id + år + vecka → antal tömningar
  // Importen ERSÄTTER tidigare värden för samma sone+vecka (idempotent — körs filen
  // två gånger blir resultatet samma som vid en körning, inte dubbelt).
  const aggMap = new Map<string, number>()
  let skippedRows = 0

  // Samla enskilda tömningar för batch-insert
  const tommodelRows: {
    sone_id: string
    kommune: string
    aar: number
    uke: number
    tomme_dato: string
    kunde: string | null
    adresse: string | null
    postnummer: string | null
    poststed: string | null
    eiendom: string | null
    anleggstype: string | null
    type_tomming: string | null
    tomme_volum: number | null
    tommer: string | null
    avvik: string | null
    rodenavn: string
    import_id: string | null
  }[] = []

  for (const row of rows) {
    if (!row.rodenavn || !row.tomme_dato) {
      skippedRows++
      continue
    }

    const soneId = soneMap.get(row.rodenavn.toLowerCase())
    if (!soneId) {
      skippedRows++
      continue
    }

    const date = new Date(row.tomme_dato)
    if (isNaN(date.getTime())) {
      skippedRows++
      continue
    }

    const aar = getISOWeekYear(date)
    const uke = getISOWeek(date)
    const key = `${soneId}:${aar}:${uke}`
    aggMap.set(key, (aggMap.get(key) || 0) + 1)

    // Spara enskild tömning
    tommodelRows.push({
      sone_id: soneId,
      kommune,
      aar,
      uke,
      tomme_dato: date.toISOString(),
      kunde: row.kunde,
      adresse: row.adresse,
      postnummer: row.postnummer,
      poststed: row.poststed,
      eiendom: row.eiendom,
      anleggstype: row.anleggstype,
      type_tomming: row.type_tomming,
      tomme_volum: row.tomme_volum,
      tommer: row.tommer,
      avvik: row.avvik,
      rodenavn: row.rodenavn,
      import_id: importId,
    })
  }

  // Rensa tidigare tömningsrader (per detalj) för de sone+år+vecka som finns i denna import,
  // så att en återimport inte dubblerar individuella tömningsposter.
  for (const key of aggMap.keys()) {
    const [sId, aStr, uStr] = key.split(":")
    await supabase
      .from("serwent_komtek_tomming")
      .delete()
      .eq("sone_id", sId)
      .eq("aar", parseInt(aStr))
      .eq("uke", parseInt(uStr))
  }

  // Batch-insert enskilda tömningar (50 åt gången)
  const BATCH = 50
  for (let i = 0; i < tommodelRows.length; i += BATCH) {
    await supabase.from("serwent_komtek_tomming").insert(tommodelRows.slice(i, i + BATCH))
  }

  // Upsert aggregerade tömningar till serwent_produksjon
  let upserted = 0
  const errors: string[] = []

  for (const [key, count] of aggMap) {
    const [soneId, aarStr, ukeStr] = key.split(":")
    const aar = parseInt(aarStr)
    const uke = parseInt(ukeStr)

    // Försök hämta befintlig rad för att addera till eventuella befintliga värden
    const { data: existing } = await supabase
      .from("serwent_produksjon")
      .select("id, kjort_rute")
      .eq("sone_id", soneId)
      .eq("aar", aar)
      .eq("uke", uke)
      .maybeSingle()

    if (existing) {
      // Uppdatera befintlig rad — ERSÄTT (importen är auktoritativ, inte additiv).
      // Tidigare logik adderade vilket dubblerade siffrorna vid återimport.
      const { error } = await supabase
        .from("serwent_produksjon")
        .update({
          kjort_rute: count,
          registrert_av: "komtek-import",
          oppdatert: new Date().toISOString(),
        })
        .eq("id", existing.id)

      if (error) {
        errors.push(`Uppdatering sone ${soneId} v${uke} ${aar}: ${error.message}`)
      } else {
        upserted++
      }
    } else {
      // Skapa ny rad
      const { error } = await supabase.from("serwent_produksjon").insert({
        sone_id: soneId,
        aar,
        uke,
        kjort_rute: count,
        kjort_best: 0,
        registrert_av: "komtek-import",
      })

      if (error) {
        errors.push(`Insert sone ${soneId} v${uke} ${aar}: ${error.message}`)
      } else {
        upserted++
      }
    }
  }

  // Uppdatera importloggen med slutresultat
  if (importId) {
    const dates = rows
      .filter((r) => r.tomme_dato)
      .map((r) => new Date(r.tomme_dato))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())

    await supabase
      .from("serwent_komtek_log")
      .update({
        importerade: upserted,
        hoppade_over: skippedRows,
        sone_uker: aggMap.size,
        skapade_soner: createdSoner,
        soner: [...soneMap.keys()],
        period_fra: dates.length > 0 ? dates[0].toISOString().slice(0, 10) : null,
        period_til: dates.length > 0 ? dates[dates.length - 1].toISOString().slice(0, 10) : null,
      })
      .eq("id", importId)
  }

  return NextResponse.json({
    success: true,
    total_rows: rows.length,
    skipped: skippedRows,
    aggregated_weeks: aggMap.size,
    upserted,
    errors,
    created_soner: createdSoner,
    matched_soner: [...soneMap.entries()].map(([navn, id]) => ({ navn, id })),
  })
}
