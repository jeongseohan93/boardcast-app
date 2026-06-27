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
