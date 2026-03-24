import "@/app/globals.css"

// Minimal layout för inbäddade formulär — ingen header, footer eller navigation
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-white min-h-screen">
      {children}
    </div>
  )
}
