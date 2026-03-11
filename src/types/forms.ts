export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "address_lookup"

export type FieldMapping =
  | "navn"
  | "epost"
  | "telefon"
  | "adresse"
  | "gnr"
  | "bnr"
  | "kommune"
  | "tomming_type"
  | "kommentar"
  | null

export type FieldOption = { value: string; label: string }

export interface FormField {
  id: string
  step_id: string
  field_type: FieldType
  label: string
  placeholder: string | null
  required: boolean
  options: FieldOption[] | null
  position: number
  mapping: FieldMapping
}

export interface FormStep {
  id: string
  form_id: string
  title: string
  description: string | null
  position: number
  form_fields: FormField[]
}

export interface Form {
  id: string
  name: string
  slug: string
  status: "draft" | "published"
  headline: string | null
  description: string | null
  thank_you_title: string | null
  thank_you_message: string | null
  form_steps: FormStep[]
}
