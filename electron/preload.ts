/**
 * [Preload 스크립트]
 *
 * Electron의 보안 모델:
 *   렌더러(React)는 순수 브라우저 환경이라 Node.js API에 접근 불가.
 *   preload.ts는 렌더러가 로드되기 전에 실행되며,
 *   contextBridge.exposeInMainWorld()로 허용된 함수만 window.electronAPI에 노출한다.
 *
 * 통신 방향:
 *   렌더러 → 메인:  ipcRenderer.invoke('채널명', ...args) → main.ts의 ipcMain.handle()
 *   메인 → 렌더러:  ipcRenderer.on('채널명', callback)   ← main.ts의 webContents.send()
 */

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // ── OAuth ────────────────────────────────────────────────────────────────
  // CHZZK 로그인 팝업 창 열기. 팝업 안에서 로그인 완료되면 code가 onOAuthCode로 전달됨
  openOAuthWindow: (url: string) => ipcRenderer.invoke('open-oauth-window', url),

  // 메인 프로세스가 OAuth code를 보내면 콜백으로 수신
  onOAuthCode: (callback: (code: string, state: string) => void) =>
    ipcRenderer.on('oauth-code', (_event, code, state) => callback(code, state)),

  // 리스너 등록 해제 (컴포넌트 언마운트 시 호출)
  removeOAuthListener: () => ipcRenderer.removeAllListeners('oauth-code'),

  // ── 유틸리티 ──────────────────────────────────────────────────────────────
  // 시스템 기본 브라우저로 외부 링크 열기
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // OS 네이티브 알림 표시
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', title, body),

  // ── 보안 저장소 (safeStorage + electron-store) ──────────────────────────
  // 토큰, 시크릿 등 민감 정보 — OS 암호화 사용
  secureStore: {
    set: (key: string, value: string) => ipcRenderer.invoke('secure-store-set', key, value),
    get: (key: string) => ipcRenderer.invoke('secure-store-get', key),
    delete: (key: string) => ipcRenderer.invoke('secure-store-delete', key),
  },

  // ── 일반 저장소 (electron-store JSON) ─────────────────────────────────────
  // 방송 제목 히스토리, UI 설정 등 암호화 불필요한 값
  store: {
    set: (key: string, value: unknown) => ipcRenderer.invoke('store-set', key, value),
    get: (key: string) => ipcRenderer.invoke('store-get', key),
    delete: (key: string) => ipcRenderer.invoke('store-delete', key),
  },

  // ── 앱 정보 ───────────────────────────────────────────────────────────────
  getVersion: () => ipcRenderer.invoke('get-version'),
  getServerPort: () => ipcRenderer.invoke('get-server-port'),

  // ── 네트워크 ──────────────────────────────────────────────────────────────
  // Windows 방화벽에 포트 3001 인바운드 허용 규칙 추가 (송출컴 접근용)
  addFirewallRule: () => ipcRenderer.invoke('add-firewall-rule') as Promise<{ ok: boolean; error?: string }>,

  // ── 창 컨트롤 (커스텀 타이틀바) ─────────────────────────────────────────
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized') as Promise<boolean>,
  onWindowMaximizeChange: (callback: (maximized: boolean) => void) => {
    ipcRenderer.on('window-maximized', (_e, v: boolean) => callback(v))
  },
})
