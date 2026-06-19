/**
 * Electron 실행 래퍼
 *
 * ELECTRON_RUN_AS_NODE=1 이 환경변수로 남아있으면 Electron이 Node.js 모드로 실행돼
 * require('electron')이 API 대신 경로 문자열을 반환한다.
 *
 * 또한 tsc는 TypeScript만 컴파일하므로 overlay HTML 파일이
 * dist-electron/server/overlay/ 에 복사되지 않는다.
 * Electron 실행 전 여기서 복사한다.
 */

const { spawn } = require('child_process')
const electronPath = require('electron')
const fs = require('fs')
const path = require('path')

// overlay HTML 파일을 dist-electron/server/overlay/ 로 복사
const srcOverlay = path.join(__dirname, '..', 'electron', 'server', 'overlay')
const dstOverlay = path.join(__dirname, '..', 'dist-electron', 'server', 'overlay')

if (fs.existsSync(srcOverlay)) {
  fs.mkdirSync(dstOverlay, { recursive: true })
  for (const file of fs.readdirSync(srcOverlay)) {
    fs.copyFileSync(path.join(srcOverlay, file), path.join(dstOverlay, file))
  }
  console.log('[launch] Copied overlay HTML files to dist-electron/server/overlay/')
}

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE  // 완전히 제거

const proc = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env,
})

proc.on('exit', (code) => process.exit(code ?? 0))
