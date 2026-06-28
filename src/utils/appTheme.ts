/**
 * [앱 테마 유틸리티]
 *
 * 앱 전체 색상 테마(midnight / mint / violet / light)를 정의하고 적용하는 유틸 모듈.
 *
 * ── document.documentElement.dataset.appTheme ────────────────────────────
 *   테마 전환은 <html> 요소의 data-app-theme 어트리뷰트 변경으로 이루어진다.
 *   CSS 파일에서 `[data-app-theme="mint"] { --color-accent: ... }` 형태로 테마별 변수를 정의하므로
 *   이 어트리뷰트 하나를 바꾸면 모든 CSS 변수가 즉시 교체된다.
 *
 * ── localStorage 키 ('appTheme') ─────────────────────────────────────────
 *   선택한 테마는 localStorage 에 'appTheme' 키로 저장된다.
 *   앱 진입 시 getStoredAppTheme 으로 읽어 마지막 테마를 복원한다.
 *   값이 없거나 유효하지 않으면 기본 테마 'midnight' 를 사용한다.
 *
 * ── isAppTheme (타입 가드) ────────────────────────────────────────────────
 *   localStorage 에서 읽은 임의의 문자열이 유효한 AppTheme 인지 런타임에서 검증한다.
 *   TypeScript 의 타입 좁히기(narrowing)와 함께 사용해 안전한 값만 applyAppTheme 에 전달한다.
 *
 * ── APP_THEMES ────────────────────────────────────────────────────────────
 *   SettingsPage 에서 테마 선택 UI 를 렌더링할 때 사용하는 메타 정보 레코드.
 *   swatches 배열에는 해당 테마의 대표 색상 hex 값이 담겨 미리보기 원형 스와치를 표시한다.
 */
export type AppTheme = 'midnight' | 'mint' | 'violet' | 'light'

export const APP_THEMES: Record<AppTheme, { label: string; description: string; swatches: string[] }> = {
  midnight: {
    label: '미드나이트',
    description: '기본 다크 테마',
    swatches: ['#17191D', '#252830', '#00FFA3'],
  },
  mint: {
    label: '민트',
    description: '선명한 민트 포인트',
    swatches: ['#10201D', '#18312B', '#34D399'],
  },
  violet: {
    label: '바이올렛',
    description: '보라색 포인트',
    swatches: ['#191628', '#28223A', '#A78BFA'],
  },
  light: {
    label: '라이트',
    description: '밝은 작업용 테마',
    swatches: ['#F6F7FB', '#FFFFFF', '#0EA5E9'],
  },
}

const KEY = 'appTheme'

export function getStoredAppTheme(): AppTheme {
  const saved = localStorage.getItem(KEY)
  return isAppTheme(saved) ? saved : 'midnight'
}

export function applyAppTheme(theme: AppTheme) {
  document.documentElement.dataset.appTheme = theme
  localStorage.setItem(KEY, theme)
}

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === 'string' && value in APP_THEMES
}
