/**
 * [공통 카드 컴포넌트]
 *
 * 컨텐츠를 bg-bg-card 배경과 border-border 테두리로 감싸는 기본 카드 래퍼 컴포넌트.
 *
 * ── title prop ────────────────────────────────────────────────────────────
 *   title 이 전달되면 카드 상단에 헤더 영역을 렌더링한다.
 *   헤더 텍스트는 uppercase + tracking-wide 스타일로 섹션 레이블처럼 표시된다.
 *   title 이 없으면 헤더 영역 자체가 렌더링되지 않아 children 이 카드 내부를 자유롭게 채운다.
 *
 * ── className prop ────────────────────────────────────────────────────────
 *   기본 카드 클래스에 추가 클래스를 병합할 수 있어 특수 레이아웃에 유연하게 대응한다.
 */
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
