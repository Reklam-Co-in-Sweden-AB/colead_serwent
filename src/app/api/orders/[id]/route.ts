import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ORDER_STATUSES } from "@/lib/constants"
import { runAutomations } from "@/lib/automations"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !ORDER_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Ugyldig status" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Hent nåværende status før oppdatering
    const { data: currentOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("id", id)
      .single()

    const fromStatus = currentOrder?.status

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)

    if (error) {
      console.error("[UpdateStatus] Error:", error)
      return NextResponse.json(
        { error: "Kunne ikke oppdatere status" },
        { status: 500 }
      )
    }

    // Kjør automasjoner ved statusendring (asynkront)
    if (fromStatus && fromStatus !== status) {
      Promise.allSettled([
        runAutomations("status_change", id, {
          from_status: fromStatus,
          to_status: status,
        }),
      ]).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[UpdateStatus] Unexpected error:", error)
    return NextResponse.json(
      { error: "En uventet feil oppstod" },
      { status: 500 }
    )
  }
}
