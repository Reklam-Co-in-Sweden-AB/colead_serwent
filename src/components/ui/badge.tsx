import type { HTMLAttributes } from "react"

type Variant = "default" | "success" | "error" | "warning" | "info"

const variantStyles: Record<Variant, string> = {
  default: "bg-navy/10 text-navy border-navy/20",
  success: "bg-success/10 text-success border-success/20",
  error: "bg-error/10 text-error border-error/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-info/10 text-info border-info/20",
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
}

export function Badge({ variant = "default", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5
        text-xs font-semibold rounded border
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    />
  )
}
