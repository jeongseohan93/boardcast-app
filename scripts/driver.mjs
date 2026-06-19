import { _electron as electron } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(__dirname, '..')
const SHOT_DIR = process.env.SCREENSHOT_DIR || 'C:\\boardcast-app\\screenshots'
fs.mkdirSync(SHOT_DIR, { recursive: true })

const electronBin = path.join(APP_DIR, 'node_modules', 'electron', 'dist', 'electron.exe')

console.log('Launching Electron from:', electronBin)
console.log('App dir:', APP_DIR)

const app = await electron.launch({
  executablePath: electronBin,
  args: ['.'],
  cwd: APP_DIR,
  env: { ...process.env, NODE_ENV: 'development', ELECTRON_RUN_AS_NODE: '' },
  timeout: 30000,
})

console.log('Electron launched. Waiting for window...')
await new Promise(r => setTimeout(r, 6000))

const windows = app.windows()
console.log('Windows count:', windows.length)
for (const w of windows) console.log(' URL:', w.url())

const page = windows.find(w => !w.url().startsWith('devtools://')) ?? await app.firstWindow()
console.log('Using page:', page.url())

// 온보딩 페이지 스크린샷
const shot1 = path.join(SHOT_DIR, 'onboarding.png')
await page.screenshot({ path: shot1 })
console.log('Screenshot saved:', shot1)

// 페이지 제목 확인
const title = await page.title()
console.log('Page title:', title)

// 주요 텍스트 확인
const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500))
console.log('Body text preview:', bodyText)

await app.close()
console.log('Done.')
