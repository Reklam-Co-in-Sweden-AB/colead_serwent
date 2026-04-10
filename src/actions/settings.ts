"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { DEFAULT_COLORS, type SiteColors, type SiteSettings } from "@/types/settings"

export async function getSettings(): Promise<SiteSettings> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["colors", "logo_url", "info_box"])

  const settings: SiteSettings = {
    colors: DEFAULT_COLORS,
    logoUrl: null,
    infoBox: null,
  }

  if (data) {
    for (const row of data) {
      if (row.key === "colors") {
        settings.colors = { ...DEFAULT_COLORS, ...(row.value as SiteColors) }
      }
      if (row.key === "logo_url") {
        settings.logoUrl = (row.value as { url: string }).url || null
      }
      if (row.key === "info_box") {
        settings.infoBox = (row.value as { text: string }).text || null
      }
    }
  }

  return settings
}

export async function saveColors(colors: SiteColors) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "colors", value: colors as unknown as Record<string, unknown> }, { onConflict: "key" })

  if (error) {
    console.error("[saveColors] Error:", error)
    return { error: "Kunne ikke lagre farger" }
  }

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/admin/settings")
  return { success: true }
}

export async function uploadLogo(formData: FormData) {
  const supabase = await createClient()

  const file = formData.get("logo") as File
  if (!file || file.size === 0) {
    return { error: "Ingen fil valgt" }
  }

  // Validera filtyp
  const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return { error: "Ugyldig filtype. Bruk PNG, JPG, SVG eller WebP." }
  }

  // Max 2MB
  if (file.size > 2 * 1024 * 1024) {
    return { error: "Filen er for stor. Maks 2MB." }
  }

  const ext = file.name.split(".").pop()
  const fileName = `logo-${Date.now()}.${ext}`

  // Ladda upp till Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(fileName, file, { upsert: true })

  if (uploadError) {
    console.error("[uploadLogo] Upload error:", uploadError)
    return { error: "Kunne ikke laste opp logoen" }
  }

  // Hämta publik URL
  const { data: urlData } = supabase.storage
    .from("logos")
    .getPublicUrl(fileName)

  const logoUrl = urlData.publicUrl

  // Spara URL i settings
  const { error: saveError } = await supabase
    .from("site_settings")
    .upsert({ key: "logo_url", value: { url: logoUrl } }, { onConflict: "key" })

  if (saveError) {
    console.error("[uploadLogo] Save error:", saveError)
    return { error: "Logoen ble lastet opp, men kunne ikke lagre innstillingen" }
  }

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/admin/settings")
  return { success: true, logoUrl }
}

export async function saveInfoBox(text: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "info_box", value: { text: text || null } }, { onConflict: "key" })

  if (error) {
    console.error("[saveInfoBox] Error:", error)
    return { error: "Kunne ikke lagre informasjonstekst" }
  }

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/admin/settings")
  return { success: true }
}

// Hämta kommunlistan — från site_settings, faller tillbaka på standardlistan
export async function getKommuner(): Promise<string[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "kommuner")
    .single()

  if (data?.value && Array.isArray((data.value as { list: string[] }).list)) {
    return (data.value as { list: string[] }).list
  }

  // Standardlista om inget finns i databasen
  return [
    "Vestre Toten", "Østre Toten", "Nordre Land", "Søndre Land",
    "Stange", "Lillehammer", "Gjøvik", "Gausdal", "Øyer",
  ]
}

// Spara kommunlistan
export async function saveKommuner(kommuner: string[]) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { key: "kommuner", value: { list: kommuner } },
      { onConflict: "key" }
    )

  if (error) {
    console.error("[saveKommuner] Error:", error)
    return { error: "Kunne ikke lagre kommuner" }
  }

  revalidatePath("/")
  revalidatePath("/admin")
  return { success: true }
}

export async function removeLogo() {
  const supabase = await createClient()

  // Ta bort URL från settings
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "logo_url", value: { url: null } }, { onConflict: "key" })

  if (error) {
    console.error("[removeLogo] Error:", error)
    return { error: "Kunne ikke fjerne logoen" }
  }

  revalidatePath("/")
  revalidatePath("/admin")
  revalidatePath("/admin/settings")
  return { success: true }
}
