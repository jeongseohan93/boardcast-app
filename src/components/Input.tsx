/**
 * [공통 입력 컴포넌트]
 *
 * 레이블, 에러 메시지를 포함한 앱 공통 텍스트 입력 컴포넌트.
 * forwardRef 로 구현되어 있어 부모 컴포넌트에서 ref 를 통한 직접 DOM 접근이 가능하다.
 *
 * ── forwardRef 사용 이유 ──────────────────────────────────────────────────
 *   일부 사용처에서 focus() 나 value 읽기를 위해 ref 가 필요하다.
 *   Input.displayName = 'Input' 을 명시해 React DevTools 에서 컴포넌트 이름이 올바르게 표시되도록 한다.
 *   (forwardRef 래핑 시 익명 컴포넌트로 표시되는 것을 방지)
 *
 * ── error prop ────────────────────────────────────────────────────────────
 *   error 문자열이 전달되면 입력창 아래에 빨간 텍스트로 에러 메시지를 표시한다.
 *   또한 입력창 테두리 색상도 에러 상태를 나타내는 border-accent-danger 로 변경된다.
 */
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
