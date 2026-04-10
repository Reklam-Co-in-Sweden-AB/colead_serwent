"use client"

import { useTransition, useState } from "react"
import { publishRuteplan } from "@/actions/ruteplan"

interface Props {
  kommune: string
  aar: number
  hasUtkast: boolean
}

export function PublishButton({ kommune, aar, hasUtkast }: Props) {
  const [isPending, startTransition] = useTransition()
  const [published, setPublished] = useState(false)

  const handlePublish = () => {
    if (!confirm(`Publisere ruteplanen for ${kommune} ${aar}? Dashboardet vil oppdateres.`)) return

    startTransition(async () => {
      const result = await publishRuteplan(kommune, aar)
      if (result.success) {
        setPublished(true)
        setTimeout(() => setPublished(false), 3000)
      }
    })
  }

  return (
    <button
      onClick={handlePublish}
      disabled={isPending || !hasUtkast}
      className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white cursor-pointer transition-colors disabled:opacity-50"
      style={{ background: published ? "#22c55e" : "var(--color-navy)" }}
    >
      {isPending ? "Publiserer..." : published ? "✓ Publisert" : "Publiser plan ▶"}
    </button>
  )
}
