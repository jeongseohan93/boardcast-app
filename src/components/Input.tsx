import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-text-secondary">{label}</label>
        )}
        <input
          ref={ref}
          className={`
            bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary
            placeholder:text-text-muted
            focus:outline-none focus:border-accent-mint focus:ring-1 focus:ring-accent-mint/20
            transition-colors
            ${error ? 'border-accent-danger' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-accent-danger">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
