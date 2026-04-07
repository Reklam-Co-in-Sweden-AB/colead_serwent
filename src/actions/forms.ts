"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import type { Form, FormStep, FormField, FieldOption } from "@/types/forms"

export async function getForms() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("forms")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[getForms]", error)
    return []
  }
  return data || []
}

export async function getFormWithSteps(formId: string): Promise<Form | null> {
  const supabase = await createClient()

  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("*")
    .eq("id", formId)
    .single()

  if (formError || !form) return null

  const { data: steps } = await supabase
    .from("form_steps")
    .select("*, form_fields(*)")
    .eq("form_id", formId)
    .order("position")

  const sortedSteps = (steps || []).map((step: FormStep) => ({
    ...step,
    form_fields: (step.form_fields || []).sort(
      (a: FormField, b: FormField) => a.position - b.position
    ),
  }))

  return { ...form, form_steps: sortedSteps } as Form
}

export async function getPublishedForm(slug: string): Promise<Form | null> {
  const supabase = await createClient()

  const { data: form } = await supabase
    .from("forms")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  if (!form) return null

  const { data: steps } = await supabase
    .from("form_steps")
    .select("*, form_fields(*)")
    .eq("form_id", form.id)
    .order("position")

  const sortedSteps = (steps || []).map((step: FormStep) => ({
    ...step,
    form_fields: (step.form_fields || []).sort(
      (a: FormField, b: FormField) => a.position - b.position
    ),
  }))

  return { ...form, form_steps: sortedSteps } as Form
}

export async function createForm(name: string, slug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("forms")
    .insert({ name, slug, status: "draft" })
    .select()
    .single()

  if (error) {
    console.error("[createForm]", error)
    return { error: error.message }
  }

  // Create a default first step
  await supabase.from("form_steps").insert({
    form_id: data.id,
    title: "Steg 1",
    position: 0,
  })

  revalidatePath("/admin")
  return { form: data }
}

export async function updateForm(
  formId: string,
  updates: {
    name?: string
    headline?: string
    description?: string
    thank_you_title?: string
    thank_you_message?: string
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("forms")
    .update(updates)
    .eq("id", formId)

  if (error) return { error: error.message }

  revalidatePath("/admin")
  return { success: true }
}

export async function toggleFormStatus(formId: string, status: "draft" | "published") {
  const supabase = await createClient()

  const { error } = await supabase
    .from("forms")
    .update({ status })
    .eq("id", formId)

  if (error) return { error: error.message }

  revalidatePath("/admin")
  revalidatePath("/")
  return { success: true }
}

export async function deleteForm(formId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("forms").delete().eq("id", formId)

  if (error) return { error: error.message }

  revalidatePath("/admin")
  return { success: true }
}

export async function saveFormStructure(
  formId: string,
  steps: {
    id?: string
    title: string
    description?: string
    position: number
    fields: {
      id?: string
      field_type: string
      label: string
      placeholder?: string
      required: boolean
      options?: FieldOption[]
      position: number
      mapping?: string | null
    }[]
  }[]
) {
  const supabase = createAdminClient()

  // Radera befintliga steg och fält (cascade raderar fält)
  await supabase.from("form_steps").delete().eq("form_id", formId)

  // Insert new steps with fields
  for (const step of steps) {
    const { data: newStep, error: stepError } = await supabase
      .from("form_steps")
      .insert({
        form_id: formId,
        title: step.title,
        description: step.description || null,
        position: step.position,
      })
      .select()
      .single()

    if (stepError || !newStep) {
      console.error("[saveFormStructure] Step error:", stepError)
      continue
    }

    if (step.fields.length > 0) {
      const fieldsToInsert = step.fields.map((f) => ({
        step_id: newStep.id,
        field_type: f.field_type,
        label: f.label,
        placeholder: f.placeholder || null,
        required: f.required,
        options: f.options && f.options.length > 0 ? f.options : null,
        position: f.position,
        mapping: f.mapping || null,
      }))

      const { error: fieldsError } = await supabase
        .from("form_fields")
        .insert(fieldsToInsert)

      if (fieldsError) {
        console.error("[saveFormStructure] Fields error:", fieldsError)
      }
    }
  }

  revalidatePath("/admin")
  revalidatePath("/")
  return { success: true }
}
