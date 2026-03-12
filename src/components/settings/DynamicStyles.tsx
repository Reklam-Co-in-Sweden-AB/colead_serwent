import type { SiteColors } from "@/types/settings"

// Server-komponent som injicerar dynamiska CSS-variabler
export function DynamicStyles({ colors }: { colors: SiteColors }) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root {
  --color-dark: ${colors.dark};
  --color-dark-light: ${colors.darkLight};
  --color-teal: ${colors.teal};
  --color-teal-dark: ${colors.tealDark};
  --color-background: ${colors.background};
}`,
      }}
    />
  )
}
