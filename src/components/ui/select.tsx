import { forwardRef, type SelectHTMLAttributes } from "react"

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: readonly string[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder = "– Velg –", className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-dark uppercase tracking-wider">
            {label}
            {props.required && <span className="text-orange ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`
            border-2 rounded-md px-3.5 py-2.5 text-sm
            bg-white outline-none
            transition-all duration-200
            focus:border-teal focus:ring-2 focus:ring-teal/20
            ${error ? "border-error" : "border-border"}
            ${props.value ? "text-foreground" : "text-muted"}
            ${className}
          `}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {error && <span className="text-error text-xs">{error}</span>}
      </div>
    )
  }
)

Select.displayName = "Select"
export { Select }
