import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import "./globals.css"

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Serwent — Bestillingstømming",
  description: "Bestill slamsuging eller septiktømming fra Serwent",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="no">
      <body className={`${dmSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
