import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Bot,
  Bell,
  Users,
  CircleDot,
  Sparkles,
  PartyPopper,
  Monitor,
  SlidersHorizontal,
  Vote,
  Gamepad2,
  BarChart2,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  ShieldBan,
  Megaphone,
  Clapperboard,
  Target,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    title: '방송',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: '방송 관리' },
      { to: '/notice', icon: Megaphone, label: '공지 작성' },
      { to: '/video-donation', icon: Clapperboard, label: '영도 관리' },
      { to: '/mission', icon: Target, label: '미션' },
      { to: '/vote', icon: Vote, label: '투표' },
    ],
  },
  {
    title: '채널 관리',
    items: [
      { to: '/history', icon: Bell, label: '알림 기록' },
      { to: '/statistics', icon: BarChart2, label: '통계' },
      { to: '/followers', icon: Users, label: '팔로우 목록' },
      { to: '/restrictions', icon: ShieldBan, label: '활동 제한' },
      { to: '/bot', icon: Bot, label: '봇 설정' },
    ],
  },
  {
    title: '참여 도구',
    items: [
      { to: '/roulette', icon: CircleDot, label: '룰렛' },
      { to: '/tamagotchi', icon: Sparkles, label: '다마고치' },
      { to: '/emote-party', icon: PartyPopper, label: '이모티콘 파티' },
      { to: '/pubg', icon: Gamepad2, label: '배틀그라운드 전적' },
    ],
  },
  {
    title: '오버레이',
    items: [
      { to: '/overlay', icon: Monitor, label: '오버레이 URL' },
      { to: '/overlay-settings', icon: SlidersHorizontal, label: '오버레이 설정' },
    ],
  },
]

function NavItem({
  to,
  icon: Icon,
  label,
  expanded,
}: {
  to: string
  icon: React.ElementType
  label: string
  expanded: boolean
}) {
  return (
    <NavLink
      to={to}
      title={expanded ? undefined : label}
      className={({ isActive }) =>
        `relative group flex items-center h-10 rounded-xl transition-colors
         ${expanded ? 'w-full justify-start gap-3 px-3' : 'w-10 justify-center'}
         ${isActive
           ? 'text-accent-mint bg-accent-mint/10'
           : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
         }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent-mint rounded-r" />
          )}
          <Icon size={18} className="shrink-0" />
          {expanded && (
            <span className="min-w-0 truncate text-xs font-medium">{label}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const [expanded, setExpanded] = useState(() => {
    return localStorage.getItem('sidebarExpanded') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebarExpanded', String(expanded))
  }, [expanded])

  return (
    <nav className={`flex flex-col bg-bg-sidebar border-r border-border shrink-0 transition-[width] duration-200 ${expanded ? 'w-52' : 'w-14'}`}>
      <div className={`flex items-center h-14 shrink-0 px-3 ${expanded ? 'justify-between' : 'justify-center'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <img src="/logo.png" alt="BOARDCAST" className="w-8 h-8 rounded-xl object-cover shrink-0 shadow-sm" />
          {expanded && <span className="text-xs font-bold text-text-secondary truncate">BOARDCAST</span>}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center py-1 overflow-y-auto scrollbar-hide">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.title} className="w-full flex flex-col items-center">
            {gi > 0 && (
              <div className={`${expanded ? 'w-[calc(100%-24px)]' : 'w-6'} h-px bg-border/60 my-1.5`} />
            )}
            {expanded && (
              <div className="w-full px-3 pt-1 pb-1 text-[10px] font-semibold text-text-muted uppercase tracking-wide">
                {group.title}
              </div>
            )}
            <div className="flex flex-col items-center gap-0 w-full px-2">
              {group.items.map(({ to, icon, label }) => (
                <NavItem key={to} to={to} icon={icon} label={label} expanded={expanded} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1 px-2 pb-3 shrink-0">
        <NavItem to="/settings" icon={Settings} label="환경설정" expanded={expanded} />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center h-10 rounded-xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-colors ${expanded ? 'w-full justify-start gap-3 px-3' : 'w-10 justify-center'}`}
          title={expanded ? '사이드바 접기' : '사이드바 펼치기'}
        >
          {expanded ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
          {expanded && <span className="text-xs font-medium">사이드바 접기</span>}
        </button>
      </div>
    </nav>
  )
}
