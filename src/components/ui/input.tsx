import { forwardRef, type InputHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-dark uppercase tracking-wider">
            {label}
            {props.required && <span className="text-orange ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`
            border-2 rounded-md px-3.5 py-2.5 text-sm
            text-foreground bg-white outline-none
            transition-all duration-200
            focus:border-teal focus:ring-2 focus:ring-teal/20
            ${error ? "border-error" : "border-border"}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-error text-xs">{error}</span>}
      </div>
    )
  }
)

Input.displayName = "Input"
export { Input }
