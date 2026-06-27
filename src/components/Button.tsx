/**
 * [공통 버튼 컴포넌트]
 *
 * 앱 전반에서 사용되는 기본 버튼 컴포넌트.
 * variant 와 size 조합으로 다양한 스타일을 적용하고, HTML button 의 모든 props 를 그대로 지원한다.
 *
 * ── variantClass / sizeClass ──────────────────────────────────────────────
 *   variant 와 size 를 key 로 갖는 lookup 객체를 통해 className 을 결정한다.
 *   조건부 if/else 체인 대신 객체 조회 방식을 사용해 새 variant 추가가 간단하다.
 *
 * ── disabled:active:scale-100 ────────────────────────────────────────────
 *   기본 active 상태에서는 scale(0.97) 클릭 애니메이션이 있지만,
 *   disabled 상태에서는 scale 변환이 일어나지 않도록 `disabled:active:scale-100` 을 추가한다.
 *   이 클래스가 없으면 disabled 버튼을 클릭했을 때도 눌린 느낌이 생긴다.
 */
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
