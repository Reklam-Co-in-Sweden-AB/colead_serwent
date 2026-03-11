import { forwardRef, type ButtonHTMLAttributes } from "react"

type Variant = "primary" | "secondary" | "destructive" | "ghost" | "dark"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-teal text-dark font-bold uppercase tracking-wider hover:bg-teal-dark border-2 border-teal hover:border-teal-dark",
  secondary:
    "bg-transparent text-muted border-2 border-border hover:border-border-hover hover:text-foreground",
  destructive:
    "bg-error text-white hover:opacity-90",
  ghost:
    "bg-transparent text-muted hover:text-foreground hover:bg-dark/5",
  dark:
    "bg-dark text-white font-bold uppercase tracking-wider hover:bg-dark-light border-2 border-dark hover:border-dark-light",
}

const sizeStyles: Record<Size, string> = {
  sm: "px-4 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3 text-sm",
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center gap-2
          rounded-md
          transition-all duration-200 cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"
export { Button }
