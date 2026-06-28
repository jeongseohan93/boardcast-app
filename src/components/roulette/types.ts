/**
 * [룰렛 공유 타입·상수]
 *
 * RoulettePage 및 하위 패널 컴포넌트가 모두 참조하는
 * 인터페이스, 상수, 색상 팔레트를 한 곳에 모은다.
 */

export interface RouletteItem {
  id: string
  label: string
  weight: number
}

export interface RouletteConfig {
  id: string
  name: string
  enabled: boolean
  triggerAmounts: number[]
  items: RouletteItem[]
  theme: string
  mode: 'wheel' | 'slot'
  listItemId?: string
}

export interface RouletteListItem {
  id: string
  name: string
  type: 'numeric' | 'count'
  total: number
  entries: { label: string; count: number; value: number }[]
}

/** 룰렛 항목 색상 팔레트 — 인덱스 순환으로 색상 배분 */
export const COLORS = [
  '#00FFA3', '#A78BFA', '#F4A261', '#72EFDD',
  '#FF6B9D', '#FFD166', '#06D6A0', '#C77DFF',
]

/** 새 룰렛 생성 시 사용하는 기본값 */
export const DEFAULT_ROULETTE: Omit<RouletteConfig, 'id'> = {
  name: '새 룰렛',
  enabled: false,
  triggerAmounts: [],
  items: [
    { id: '1', label: '항목 1', weight: 1 },
    { id: '2', label: '항목 2', weight: 1 },
    { id: '3', label: '항목 3', weight: 1 },
  ],
  theme: 'default',
  mode: 'wheel',
}

export const ROULETTE_THEMES = [
  { id: 'default',    name: '기본' },
  { id: '레트로',     name: '레트로' },
  { id: '마법',       name: '마법' },
  { id: '베이커리',   name: '베이커리' },
  { id: '사이버펑크', name: '사이버펑크' },
  { id: '숲 컨셉',    name: '숲 컨셉' },
  { id: '칠판',       name: '칠판' },
  { id: '해적',       name: '해적' },
]

/**
 * 테마 미리보기 이미지 기본 경로.
 * Electron file:// 환경에서는 window.location.hostname이 빈 문자열이므로
 * 'localhost' 로 폴백한다.
 */
const host =
  typeof window !== 'undefined'
    ? window.location.hostname || 'localhost'
    : 'localhost'
export const THEME_BASE = `http://${host}:3001/overlay/roulette-themes`
