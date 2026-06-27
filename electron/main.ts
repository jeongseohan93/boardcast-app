/**
 * [Electron 메인 프로세스]
 *
 * 앱의 진입점. Node.js 환경에서 실행되며 세 가지 역할을 한다:
 *   1. BrowserWindow 생성 — React UI를 보여주는 창
 *   2. Express 서버 시작 — localhost:3001 (DB, Socket.IO, CHZZK API 포함)
 *   3. IPC 핸들러 등록 — 렌더러(React)가 Node.js API를 쓸 수 있게 브릿지 역할
 *
 * 보안 구조:
 *   렌더러는 nodeIntegration: false + contextIsolation: true 이므로
 *   Node.js/Electron API에 직접 접근 불가. preload.ts의 contextBridge를 통해서만 호출 가능.
 */

import { app, BrowserWindow, ipcMain, shell, Notification, safeStorage } from 'electron'
import { exec } from 'child_process'
import path from 'path'
import Store from 'electron-store'

// electron-store: 일반 설정(channelId, 제목 히스토리 등)을 JSON 파일로 저장
// OS별 경로: Windows → %APPDATA%/broadcast-assistant/config.json
const store = new Store()

const SERVER_PORT = 3001

let mainWindow: BrowserWindow | null = null

// ─── 창 생성 ──────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 880,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: '#17191D', // 로딩 전 깜빡임 방지용 기본 배경색
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // contextBridge 설정 스크립트
      contextIsolation: true,  // 렌더러와 Node.js 컨텍스트 분리 (보안)
      nodeIntegration: false,  // 렌더러에서 require() 사용 금지 (보안)
    },
  })

  // 개발: Vite 개발 서버(5173)에서 핫리로드, 프로덕션: 빌드된 index.html 로드
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window-maximized', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window-maximized', false))
}

// ─── 서버 시작 ────────────────────────────────────────────────────────────────

async function startServer() {
  // 동적 import: better-sqlite3(네이티브 모듈)가 있어 정적 import 시 일부 환경에서 문제 발생
  const { startExpressServer } = await import('./server/index')
  await startExpressServer(SERVER_PORT)
}

// ─── 앱 라이프사이클 ──────────────────────────────────────────────────────────

// Electron이 초기화 완료 후 실행. 순서: 서버 시작 → 창 생성
app.whenReady().then(async () => {
  await startServer()
  createWindow()

  // macOS: Dock 아이콘 클릭 시 창이 없으면 새로 생성
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Windows/Linux: 모든 창 닫히면 앱 종료 (macOS는 Dock에 남아있어야 해서 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC 핸들러 ───────────────────────────────────────────────────────────────
// ipcMain.handle: 렌더러의 ipcRenderer.invoke() 호출을 처리, 결과를 Promise로 반환

/**
 * OAuth 팝업 창 열기
 * 흐름: 렌더러가 CHZZK 인증 URL을 보냄 → 팝업 창에서 로그인 →
 *       CHZZK가 localhost:3001/auth/callback으로 리디렉션 →
 *       code, state를 메인 창 렌더러로 전달 → 팝업 닫힘
 */
ipcMain.handle('open-oauth-window', async (_event, url: string) => {
  const oauthWin = new BrowserWindow({
    width: 600,
    height: 700,
    parent: mainWindow || undefined,
    modal: true, // 메인 창 위에 고정
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  oauthWin.loadURL(url)

  return new Promise<void>((resolve) => {
    let handled = false

    // OAuth 콜백 URL을 감지하면 code를 추출해 렌더러로 전달
    const handleUrl = (_e: unknown, targetUrl: string) => {
      if (handled) return
      if (!targetUrl.startsWith('http://localhost:3001/auth/callback')) return

      handled = true
      const urlObj = new URL(targetUrl)
      const code = urlObj.searchParams.get('code') || ''
      const state = urlObj.searchParams.get('state') || ''
      mainWindow?.webContents.send('oauth-code', code, state)
      oauthWin.close()
      resolve()
    }

    // will-redirect: HTTP 3xx 리다이렉트 (서버 측 리다이렉트)
    oauthWin.webContents.on('will-redirect', handleUrl)
    // will-navigate: JavaScript window.location 변경 또는 링크 클릭
    oauthWin.webContents.on('will-navigate', handleUrl)
    // did-navigate: 위 두 이벤트를 모두 놓쳤을 경우 최종 방어선
    oauthWin.webContents.on('did-navigate', handleUrl)

    oauthWin.on('closed', () => resolve())
  })
})


// 외부 브라우저로 URL 열기 — http/https 프로토콜만 허용
ipcMain.handle('open-external', (_event, url: string) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return
  shell.openExternal(url)
})

// OS 네이티브 알림 (도네이션/구독 발생 시 앱이 백그라운드에 있어도 표시)
ipcMain.handle('show-notification', (_event, title: string, body: string) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
})

/**
 * safeStorage: OS 키체인/자격증명 저장소를 사용해 암호화
 * - Windows: DPAPI (데이터 보호 API)
 * - 암호화 실패 시 평문 폴백(_plain 키)으로 저장
 * 저장 대상: accessToken, refreshToken, clientId, clientSecret
 */
ipcMain.handle('secure-store-set', (_event, key: string, value: string) => {
  try {
    const encrypted = safeStorage.encryptString(value)
    store.set(`secure_${key}`, encrypted.toString('base64'))
  } catch {
    // safeStorage 사용 불가 환경(일부 Linux 등)에서 평문 폴백
    store.set(`secure_${key}_plain`, value)
  }
})

ipcMain.handle('secure-store-get', (_event, key: string) => {
  try {
    const b64 = store.get(`secure_${key}`) as string | undefined
    if (!b64) {
      // 암호화된 값 없으면 평문 폴백 시도
      const plain = store.get(`secure_${key}_plain`) as string | undefined
      return plain || null
    }
    const buf = Buffer.from(b64, 'base64')
    return safeStorage.decryptString(buf)
  } catch {
    return null
  }
})

ipcMain.handle('secure-store-delete', (_event, key: string) => {
  store.delete(`secure_${key}` as never)
  store.delete(`secure_${key}_plain` as never)
})

// electron-store 일반 값 — 렌더러가 쓸 수 있는 키를 명시적으로 허용
const ALLOWED_STORE_KEYS = new Set(['overlayThemes', 'overlaySettings', 'sidebarExpanded', 'appTheme'])
ipcMain.handle('store-set', (_event, key: string, value: unknown) => {
  if (!ALLOWED_STORE_KEYS.has(key)) return
  store.set(key, value)
})

ipcMain.handle('store-get', (_event, key: string) => {
  return store.get(key) ?? null
})

ipcMain.handle('store-delete', (_event, key: string) => {
  store.delete(key as never)
})

// 앱 버전 (package.json의 version 필드)
ipcMain.handle('get-version', () => app.getVersion())

// Express 서버 포트 (렌더러의 Axios가 올바른 포트로 요청하도록)
ipcMain.handle('get-server-port', () => SERVER_PORT)

// 커스텀 타이틀바 창 컨트롤
ipcMain.handle('window-minimize', () => mainWindow?.minimize())
ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window-close', () => mainWindow?.close())
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false)

// Windows 방화벽에 3001 포트 인바운드 허용 규칙 추가
// 송출컴(다른 PC)에서 오버레이에 접근할 수 있도록
ipcMain.handle('add-firewall-rule', () => {
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const cmd = [
      'netsh advfirewall firewall add rule',
      'name="방송도우미 오버레이 (3001)"',
      'dir=in action=allow protocol=TCP localport=3001',
    ].join(' ')
    exec(cmd, (err) => {
      if (err) resolve({ ok: false, error: err.message })
      else resolve({ ok: true })
    })
  })
})
