const fs = require('fs')
const path = require('path')

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const dstPath = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath)
    } else {
      fs.copyFileSync(srcPath, dstPath)
    }
  }
}

const srcOverlay = path.join(__dirname, '..', 'electron', 'server', 'overlay')
const dstOverlay = path.join(__dirname, '..', 'dist-electron', 'server', 'overlay')

if (fs.existsSync(srcOverlay)) {
  copyDir(srcOverlay, dstOverlay)
  console.log('[copy-overlays] Copied overlay HTML files to dist-electron/server/overlay/')
}

const srcThemes = path.join(__dirname, '..', 'public', '룰렛')
const dstThemes = path.join(dstOverlay, 'roulette-themes')

if (fs.existsSync(srcThemes)) {
  copyDir(srcThemes, dstThemes)
  console.log('[copy-overlays] Copied roulette theme images to dist-electron/server/overlay/roulette-themes/')
}
