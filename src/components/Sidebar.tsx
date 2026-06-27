/**
 * [사이드바 컴포넌트]
 *
 * 앱 전체의 메인 네비게이션. 왼쪽에 고정되어 페이지 간 이동을 담당한다.
 *
 * 구조:
 *   ┌─────────────────────┐
 *   │  로고 + 앱 이름     │  ← 헤더 (h-14)
 *   ├─────────────────────┤
 *   │  메인 네비 그룹     │  ← 스크롤 가능한 nav 영역 (flex-1)
 *   │    대시보드         │
 *   │    방송 관리        │
 *   │    방송 설정        │
 *   │    채널 분석        │
 *   │    오버레이         │
 *   │    배그 전적        │
 *   ├─────────────────────┤
 *   │  환경설정           │  ← 하단 고정 (shrink-0)
 *   │  사이드바 접기      │
 *   └─────────────────────┘
 *
 * 접기/펼치기:
 *   - 펼침(expanded=true) : 너비 w-52, 아이콘 + 텍스트 표시
 *   - 접힘(expanded=false): 너비 w-14, 아이콘만 표시 (title 속성으로 툴팁)
 *   - 상태는 localStorage('sidebarExpanded')에 저장해 재시작 후에도 유지
 *   - 200ms CSS 트랜지션(transition-[width])으로 부드럽게 전환
 *
 * 활성 표시:
 *   - NavLink의 isActive를 이용해 현재 라우트에 해당하는 항목 강조
 *   - 활성 항목: 왼쪽 가장자리 2px 민트 바 + 민트 텍스트 + 민트 배경
 *   - 비활성 항목: muted 색상, hover 시 약간 밝아짐
 *
 * 사이드바를 6개로 줄인 이유:
 *   원래 20개 이상의 항목이 있었으나, 비슷한 기능들을 허브 페이지로 묶고
 *   허브 내부에서 TabBar로 전환하도록 리팩터링했다.
 *   스크롤 없이 모든 메뉴가 한눈에 들어오고, 방송 중 빠른 탐색이 가능하다.
 */

import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,  // 대시보드 아이콘
  Radio,            // 방송 관리 아이콘
  SlidersHorizontal,// 방송 설정 아이콘
  Monitor,          // 오버레이 아이콘
  Gamepad2,         // 배그 전적 아이콘
  BarChart2,        // 채널 분석 아이콘
  Settings,         // 환경설정 아이콘
  ChevronsLeft,     // 사이드바 접기 아이콘
  ChevronsRight,    // 사이드바 펼치기 아이콘
} from 'lucide-react'

/**
 * 메인 네비게이션 그룹 목록.
 *
 * 각 그룹은 { title, items[] } 구조이며, title이 빈 문자열이면 그룹 라벨을 숨긴다.
 * items 간 구분선은 첫 번째 이후 그룹 사이에만 자동으로 그려진다(gi > 0).
 *
 * 탭 허브 페이지 매핑:
 *   /broadcast       → BroadcastManagePage (공지/미션/투표/영도)
 *   /stream-settings → StreamSettingsPage  (봇/후원/팔로워/이모티콘/룰렛/다마고치)
 *   /channel         → ChannelPage         (통계/활동제한)
 *   /overlay-hub     → OverlayHubPage      (URL목록/오버레이설정)
 */
const NAV_GROUPS = [
  {
    title: '',
    items: [
      { to: '/dashboard',       icon: LayoutDashboard,   label: '대시보드' },
      { to: '/broadcast',       icon: Radio,             label: '방송 관리' },
      { to: '/stream-settings', icon: SlidersHorizontal, label: '방송 설정' },
      { to: '/channel',         icon: BarChart2,         label: '채널 분석' },
      { to: '/overlay-hub',     icon: Monitor,           label: '오버레이' },
      { to: '/pubg',            icon: Gamepad2,          label: '배그 전적' },
    ],
  },
]

/** localStorage에서 사이드바 펼침 상태를 저장/복원할 때 쓰는 키 */
const SIDEBAR_STORAGE_KEY = 'sidebarExpanded'

/**
 * 개별 Nav 항목 컴포넌트.
 *
 * NavLink를 wrapping해 활성 상태에 따른 스타일을 자동으로 적용한다.
 * 접힘 모드에서는 title 속성을 이용해 OS 기본 툴팁으로 레이블을 표시.
 */
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
      /* 접힌 상태에서는 title 속성으로 OS 툴팁 표시; 펼쳐진 상태에선 텍스트가 이미 보임 */
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
          {/* 활성 항목 왼쪽 강조 바 (2px × 20px, 절대 위치) */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent-mint rounded-r" />
          )}

          {/* 아이콘은 펼침/접힘 모두 항상 표시 */}
          <Icon size={18} className="shrink-0" />

          {/* 텍스트 레이블은 펼쳐진 상태에서만 표시 */}
          {expanded && (
            <span className="min-w-0 truncate text-xs font-medium">{label}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  /**
   * 펼침/접힘 상태.
   * localStorage에서 초기값을 읽어 재시작 후에도 사용자 선택을 유지.
   * 기본값은 false(접힘) — 빠른 배그 방송 환경에서 화면 공간 우선.
   */
  const [expanded, setExpanded] = useState<boolean>(() => {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  })

  /* expanded 상태가 바뀔 때마다 localStorage에 동기 저장 */
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(expanded))
  }, [expanded])

  return (
    <nav
      className={`
        flex flex-col bg-bg-sidebar border-r border-border shrink-0
        transition-[width] duration-200
        ${expanded ? 'w-52' : 'w-14'}
      `}
    >
      {/* ── 헤더: 로고 + 앱 이름 ─────────────────────────────── */}
      <div className={`flex items-center h-14 shrink-0 px-3 ${expanded ? 'justify-between' : 'justify-center'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/logo.png"
            alt="BOARDCAST"
            className="w-8 h-8 rounded-xl object-cover shrink-0 shadow-sm"
          />
          {/* 앱 이름은 펼침 상태에서만 표시 */}
          {expanded && (
            <span className="text-xs font-bold text-text-secondary truncate">BOARDCAST</span>
          )}
        </div>
      </div>

      {/* ── 메인 네비게이션 영역 (스크롤 가능) ──────────────── */}
      <div className="flex-1 flex flex-col items-center py-1 overflow-y-auto scrollbar-hide">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.title} className="w-full flex flex-col items-center">
            {/* 첫 그룹 이후에는 구분선을 표시 */}
            {gi > 0 && (
              <div className={`${expanded ? 'w-[calc(100%-24px)]' : 'w-6'} h-px bg-border/60 my-1.5`} />
            )}

            {/* 그룹 타이틀 (title이 빈 문자열이면 렌더링 안 됨) */}
            {expanded && group.title && (
              <div className="w-full px-3 pt-1 pb-1 text-[10px] font-semibold text-text-muted uppercase tracking-wide">
                {group.title}
              </div>
            )}

            {/* 항목 목록 */}
            <div className="flex flex-col items-center gap-0 w-full px-2">
              {group.items.map(({ to, icon, label }) => (
                <NavItem key={to} to={to} icon={icon} label={label} expanded={expanded} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── 하단 고정 영역: 환경설정 + 접기 버튼 ─────────────── */}
      <div className="flex flex-col items-center gap-1 px-2 pb-3 shrink-0">
        <NavItem to="/settings" icon={Settings} label="환경설정" expanded={expanded} />

        {/* 사이드바 접기/펼치기 토글 버튼 */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`
            flex items-center h-10 rounded-xl
            text-text-muted hover:text-text-secondary hover:bg-white/5 transition-colors
            ${expanded ? 'w-full justify-start gap-3 px-3' : 'w-10 justify-center'}
          `}
          title={expanded ? '사이드바 접기' : '사이드바 펼치기'}
        >
          {expanded ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
          {expanded && <span className="text-xs font-medium">사이드바 접기</span>}
        </button>
      </div>
    </nav>
  )
}
