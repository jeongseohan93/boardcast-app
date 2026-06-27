/**
 * [타이틀 바 컴포넌트]
 *
 * Electron 커스텀 타이틀 바. 최소화·최대화/복원·닫기 창 제어 버튼과 드래그 영역을 제공한다.
 *
 * ── -webkit-app-region: drag / no-drag ───────────────────────────────────
 *   Electron 의 frameless 창에서 마우스 드래그로 창을 이동하려면
 *   드래그 가능 영역에 `-webkit-app-region: drag` CSS 를 설정해야 한다.
 *   버튼 영역은 `-webkit-app-region: no-drag` 로 드래그 예외 처리해야 클릭 이벤트가 동작한다.
 *   이 CSS 는 Tailwind 클래스가 아닌 인라인 style 또는 커스텀 CSS 로만 설정 가능하다.
 *
 * ── 최대화 아이콘 전환 (Square ↔ Maximize2) ─────────────────────────────
 *   maximized 상태에 따라 아이콘을 전환한다.
 *   Square   → 최대화되지 않은 상태 (클릭 시 최대화)
 *   Maximize2 → 최대화된 상태 (클릭 시 복원)
 *
 * ── electronAPI.onWindowMaximizeChange ────────────────────────────────────
 *   Electron main 프로세스가 창 최대화 상태 변경을 IPC 로 알려주는 리스너.
 *   사용자가 OS 레벨에서 창을 최대화/복원해도 아이콘이 동기화된다.
 */
import { useEffect, useState } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI?.windowIsMaximized().then(setMaximized)
    window.electronAPI?.onWindowMaximizeChange(setMaximized)
  }, [])

  return (
    <div
      className="flex items-center justify-between h-9 shrink-0 bg-bg-outer border-b border-border select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3">
        <img src="/logo.png" alt="BOARDCAST" className="w-5 h-5 rounded object-cover shrink-0" />
        <span className="text-xs font-semibold text-text-muted tracking-wide">BOARDCAST</span>
      </div>

      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.electronAPI?.windowMinimize()}
          className="flex items-center justify-center w-11 h-full text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
          title="최소화"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.electronAPI?.windowMaximize()}
          className="flex items-center justify-center w-11 h-full text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
          title={maximized ? '이전 크기로' : '최대화'}
        >
          {maximized ? <Square size={12} /> : <Maximize2 size={12} />}
        </button>
        <button
          onClick={() => window.electronAPI?.windowClose()}
          className="flex items-center justify-center w-11 h-full text-text-muted hover:text-white hover:bg-red-500/80 transition-colors"
          title="닫기"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
