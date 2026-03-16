export interface SiteColors {
  dark: string
  darkLight: string
  teal: string
  tealDark: string
  background: string
}

export interface SiteSettings {
  colors: SiteColors
  logoUrl: string | null
  infoBox: string | null
}

// Standardfärger (matchar globals.css)
export const DEFAULT_COLORS: SiteColors = {
  dark: "#143b59",
  darkLight: "#1a4d72",
  teal: "#45b7a9",
  tealDark: "#3a9e92",
  background: "#F2F5F7",
}
