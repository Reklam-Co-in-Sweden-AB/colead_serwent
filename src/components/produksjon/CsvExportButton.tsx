"use client"

interface Props {
  kommune: string
  aar: number
}

export function CsvExportButton({ kommune, aar }: Props) {
  return (
    <a
      href={`/api/produksjon/export?kommune=${encodeURIComponent(kommune)}&aar=${aar}`}
      className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white no-underline cursor-pointer transition-colors hover:opacity-90"
      style={{ background: "var(--color-red)" }}
      download
    >
      Eksporter CSV
    </a>
  )
}
