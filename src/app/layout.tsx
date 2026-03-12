import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import { DynamicStyles } from "@/components/settings/DynamicStyles"
import { getSettings } from "@/actions/settings"
import "./globals.css"

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
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
      <body className={`${dmSans.variable} antialiased`}>
        <DynamicStyles colors={settings.colors} />
        {children}
      </body>
    </html>
  )
}
