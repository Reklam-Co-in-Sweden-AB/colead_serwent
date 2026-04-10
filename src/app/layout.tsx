import type { Metadata } from "next"
import { DM_Sans, Playfair_Display, DM_Mono } from "next/font/google"
import { DynamicStyles } from "@/components/settings/DynamicStyles"
import { getSettings } from "@/actions/settings"
import "./globals.css"

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
})

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700"],
})

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  title: "Serwent — Bestillingstømming",
  description: "Bestill slamsuging eller septiktømming fra Serwent",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const settings = await getSettings()

  return (
    <html lang="no">
      <body className={`${dmSans.variable} ${playfair.variable} ${dmMono.variable} antialiased`}>
        <DynamicStyles colors={settings.colors} />
        {children}
      </body>
    </html>
  )
}
