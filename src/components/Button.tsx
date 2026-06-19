import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variantClass = {
  primary: 'bg-accent-mint text-bg-outer font-semibold hover:brightness-110 active:scale-[0.97]',
  secondary: 'border border-accent-mint text-accent-mint hover:bg-accent-mint/10 active:scale-[0.97]',
  danger: 'bg-accent-danger text-white hover:brightness-110 active:scale-[0.97]',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-white/5 active:scale-[0.97]',
}

const sizeClass = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-2.5 text-sm rounded-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        ${variantClass[variant]} ${sizeClass[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}
