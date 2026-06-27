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
