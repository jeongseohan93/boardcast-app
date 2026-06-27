/**
 * [토스트 컨테이너 컴포넌트]
 *
 * toastStore 의 토스트 목록을 화면 우하단에 고정 표시하는 컨테이너 컴포넌트.
 *
 * ── 고정 위치 (fixed bottom-right) ───────────────────────────────────────
 *   `fixed bottom-4 right-4` 로 뷰포트 우하단에 항상 고정된다.
 *   다른 컨텐츠와 겹치지만 z-50 으로 최상위 레이어에 렌더링된다.
 *
 * ── pointer-events-none / pointer-events-auto ───────────────────────────
 *   컨테이너 자체는 `pointer-events-none` 으로 마우스 이벤트를 통과시킨다.
 *   토스트가 없을 때 컨테이너 영역이 하단 UI 클릭을 막는 것을 방지하기 위함이다.
 *   각 토스트 개별 요소에만 `pointer-events-auto` 를 부여해 X 버튼 클릭이 동작한다.
 *
 * ── BORDER_COLOR ──────────────────────────────────────────────────────────
 *   Toast.type 에 따라 왼쪽 테두리 색상을 달리해 이벤트 유형을 시각적으로 구분한다.
 *   donation=민트, subscription=보라, follow=초록, info=회색, error=빨강.
 *
 * ── animate-slide-in ─────────────────────────────────────────────────────
 *   토스트가 나타날 때 오른쪽에서 슬라이드인하는 CSS 애니메이션 클래스.
 *   tailwind.config.ts 의 extend.keyframes 에 정의된 커스텀 애니메이션이다.
 */
import { X } from 'lucide-react'
import { useToastStore, Toast } from '../store/toastStore'

const BORDER_COLOR: Record<Toast['type'], string> = {
  donation: 'border-accent-mint',
  subscription: 'border-accent-purple',
  follow: 'border-accent-success',
  info: 'border-border',
  error: 'border-accent-danger',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-xs w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto bg-bg-card border ${BORDER_COLOR[toast.type]} rounded-lg px-4 py-3 shadow-xl animate-slide-in flex items-start gap-3`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">{toast.title}</p>
            {toast.message && (
              <p className="text-xs text-text-secondary mt-0.5 truncate">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-text-muted hover:text-text-secondary transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
