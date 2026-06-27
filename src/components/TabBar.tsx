/**
 * [TabBar 컴포넌트]
 *
 * 페이지 내부에서 여러 하위 화면(탭)을 전환할 때 쓰는 공용 탭 네비게이션 바.
 *
 * 설계 원칙:
 *   - 순수 표현 컴포넌트(Presentational Component): 상태를 직접 들고 있지 않고,
 *     부모가 넘긴 `active`와 `onChange`로만 동작한다.
 *   - 탭 수에 제한이 없고, 넘치면 가로 스크롤(scrollbar-hide로 스크롤바 숨김)로 처리.
 *   - 활성 탭: 민트 계열 배경 + 민트 텍스트 / 비활성 탭: muted 색상 + hover 효과.
 *
 * 사용 예시:
 *   const TABS = [{ id: 'a', label: 'A탭' }, { id: 'b', label: 'B탭' }]
 *   const [active, setActive] = useState('a')
 *   <TabBar tabs={TABS} active={active} onChange={setActive} />
 *
 * 탭 상태는 이 컴포넌트 밖(부모 or localStorage)에서 관리하는 것을 권장.
 * localStorage 키는 부모 페이지마다 달리해서 탭 위치를 앱 재시작 후에도 복원.
 */

/** 개별 탭 항목의 데이터 구조 */
interface Tab {
  /** 탭을 식별하는 고유 문자열 (영문 소문자 권장, e.g. 'bot', 'alerts') */
  id: string
  /** 화면에 표시할 한글 레이블 */
  label: string
}

/** TabBar 컴포넌트가 받는 props */
interface TabBarProps {
  /** 렌더링할 탭 목록 (순서대로 왼쪽부터 표시) */
  tabs: Tab[]
  /** 현재 활성 탭의 id */
  active: string
  /** 탭 클릭 시 호출되는 콜백 — 클릭된 탭의 id를 인자로 전달 */
  onChange: (id: string) => void
}

/**
 * 탭 바 컴포넌트.
 * 페이지 최상단에 배치하고, 아래에 탭에 해당하는 컨텐츠를 조건부 렌더링한다.
 *
 * 레이아웃 고려사항:
 *   - `shrink-0`: 부모 flex 컨테이너에서 이 바가 압축되지 않도록 고정.
 *     탭 바 아래의 콘텐츠 영역에 `flex-1 min-h-0`을 주면 탭 바 높이를 뺀
 *     나머지를 콘텐츠가 꽉 채우게 된다.
 *   - `overflow-x-auto scrollbar-hide`: 탭이 많아 가로로 넘칠 경우 스크롤.
 *     scrollbar-hide는 Tailwind 커스텀 유틸리티(scrollbar-width: none).
 */
export default function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-bg-card border-b border-border shrink-0 overflow-x-auto scrollbar-hide">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0
            ${active === t.id
              /* 활성 탭: 민트 색 강조 */
              ? 'bg-accent-mint/15 text-accent-mint'
              /* 비활성 탭: 흐린 색, hover 시 약간 밝아짐 */
              : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
            }
          `}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
