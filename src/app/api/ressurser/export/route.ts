import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import ExcelJS from "exceljs"

/**
 * Eksport av enskild operatør eller bil till Excel.
 *
 * Query params:
 *   type=operator|bil — vilken kolonne det filtreres på
 *   navn=...          — operatørnavn eller bilnummer
 *   aar=2026          — år (default: innevarende år)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const navn = searchParams.get("navn")
  const aarStr = searchParams.get("aar")

  if (!type || (type !== "operator" && type !== "bil")) {
    return NextResponse.json({ error: "Ogyldig type" }, { status: 400 })
  }
  if (!navn) {
    return NextResponse.json({ error: "Mangler navn" }, { status: 400 })
  }

  const aar = aarStr ? parseInt(aarStr, 10) : new Date().getFullYear()

  // Joina med serwent_soner för att få sone-namn
  const filterColumn = type === "operator" ? "tommer" : "bil"
  const { data, error } = await supabase
    .from("serwent_komtek_tomming")
    .select(`
      tomme_dato, kunde, adresse, anleggstype, tomme_volum,
      tommer, bil, kommune, avvik, slangeutlegg, hoydeforskjell,
      serwent_soner(navn)
    `)
    .eq(filterColumn, navn)
    .eq("aar", aar)
    .order("tomme_dato", { ascending: true })

  if (error) {
    console.error("[ressurser/export]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type Row = {
    tomme_dato: string
    kunde: string | null
    adresse: string | null
    anleggstype: string | null
    tomme_volum: number | null
    tommer: string | null
    bil: string | null
    kommune: string
    avvik: string | null
    slangeutlegg: number | null
    hoydeforskjell: number | null
    serwent_soner: { navn: string } | { navn: string }[] | null
  }

  const rows = (data || []) as Row[]

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(navn.substring(0, 30))

  ws.columns = [
    { header: "Dato", key: "dato", width: 12 },
    { header: "Operatør", key: "tommer", width: 26 },
    { header: "Bil", key: "bil", width: 12 },
    { header: "Kommune", key: "kommune", width: 16 },
    { header: "Sone", key: "sone", width: 28 },
    { header: "Anleggstype", key: "anleggstype", width: 16 },
    { header: "Kunde", key: "kunde", width: 28 },
    { header: "Adresse", key: "adresse", width: 32 },
    { header: "Volum (m³)", key: "volum", width: 11 },
    { header: "Avvik", key: "avvik", width: 14 },
    { header: "Slangeutlegg (m)", key: "slange", width: 16 },
    { header: "Høydeforskjell (m)", key: "hoyde", width: 18 },
  ]

  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1B3A6B" },
  }

  for (const r of rows) {
    const sone = Array.isArray(r.serwent_soner) ? r.serwent_soner[0]?.navn : r.serwent_soner?.navn
    ws.addRow({
      dato: new Date(r.tomme_dato).toLocaleDateString("nb-NO"),
      tommer: r.tommer ?? "",
      bil: r.bil ?? "",
      kommune: r.kommune,
      sone: sone ?? "",
      anleggstype: r.anleggstype ?? "",
      kunde: r.kunde ?? "",
      adresse: r.adresse ?? "",
      volum: r.tomme_volum ?? null,
      avvik: r.avvik ?? "",
      slange: r.slangeutlegg ?? null,
      hoyde: r.hoydeforskjell ?? null,
    })
  }

  // Totalrad
  const totalRow = ws.addRow({
    dato: "Totalt",
    volum: rows.reduce((s, r) => s + (r.tomme_volum || 0), 0),
  })
  totalRow.font = { bold: true }
  totalRow.getCell(9).numFmt = "0.00"

  // Filnamn — sanera ej-tillåtna tegn
  const safeName = navn.replace(/[\\/?*[\]:]/g, "_").substring(0, 80)
  const filnamn = `${safeName}_${aar}.xlsx`

  const buffer = await wb.xlsx.writeBuffer()

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filnamn}"`,
    },
  })
}
