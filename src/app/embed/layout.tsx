// Minimal layout för inbäddade formulär — transparent bakgrund
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="!bg-transparent">
      <style>{`
        :root { --color-background: transparent !important; }
        html, body { background: transparent !important; margin: 0; padding: 0; }
      `}</style>
      {children}
    </div>
  )
}
