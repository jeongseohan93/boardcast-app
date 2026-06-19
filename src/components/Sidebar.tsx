import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Bot,
  Bell,
  CircleDot,
  Monitor,
  Settings,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: '방송 관리' },
  { to: '/bot',       icon: Bot,             label: '봇 설정' },
  { to: '/history',   icon: Bell,            label: '알림 히스토리' },
  { to: '/roulette',  icon: CircleDot,       label: '룰렛' },
  { to: '/overlay',   icon: Monitor,         label: '오버레이 URL' },
]

export default function Sidebar() {
  return (
    <nav className="flex flex-col w-14 bg-bg-sidebar border-r border-border shrink-0">
      {/* 로고 */}
      <div className="flex items-center justify-center h-14 shrink-0">
        <div className="w-7 h-7 rounded-full bg-accent-mint flex items-center justify-center">
          <span className="text-bg-outer font-black text-xs">치</span>
        </div>
      </div>

      {/* 메인 메뉴 */}
      <div className="flex-1 flex flex-col items-center gap-1 pt-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `relative group flex items-center justify-center w-10 h-10 rounded-lg transition-colors
               ${isActive
                 ? 'text-accent-mint'
                 : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
               }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-accent-mint rounded-r" />
                )}
                <Icon size={20} />
                {/* 툴팁 */}
                <span className="absolute left-full ml-3 px-2 py-1 bg-bg-card border border-border rounded text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* 하단 환경설정 */}
      <div className="flex items-center justify-center pb-4">
        <NavLink
          to="/settings"
          title="환경설정"
          className={({ isActive }) =>
            `relative group flex items-center justify-center w-10 h-10 rounded-lg transition-colors
             ${isActive
               ? 'text-accent-mint'
               : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
             }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-accent-mint rounded-r" />
              )}
              <Settings size={20} />
              <span className="absolute left-full ml-3 px-2 py-1 bg-bg-card border border-border rounded text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                환경설정
              </span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  )
}
