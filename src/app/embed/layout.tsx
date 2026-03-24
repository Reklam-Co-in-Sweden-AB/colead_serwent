// Minimal layout för inbäddade formulär — transparent bakgrund
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="!bg-transparent">
      <style>{`html, body { background: transparent !important; }`}</style>
      {children}
    </div>
  )
}
