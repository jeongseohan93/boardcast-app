import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
}

export default function Card({ children, className = '', title }: CardProps) {
  return (
    <div className={`bg-bg-card border border-border rounded-xl p-4 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">{title}</h2>}
      {children}
    </div>
  )
}
