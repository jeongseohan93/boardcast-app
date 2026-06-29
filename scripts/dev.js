const { spawn } = require('child_process')
const net = require('net')
const path = require('path')

const root = path.join(__dirname, '..')
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const electronLauncher = path.join(root, 'scripts', 'launch-electron.js')

const children = new Set()
let shuttingDown = false

function spawnNode(args) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  })

  children.add(child)
  child.once('exit', () => children.delete(child))
  return child
}

function stopChildren() {
  for (const child of children) {
    if (!child.killed) child.kill()
  }
}

function finish(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  stopChildren()
  setTimeout(() => process.exit(code), 100).unref()
}

function canConnect(port, host) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host })

    socket.once('connect', () => {
      socket.end()
      resolve(true)
    })

    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })

    socket.once('error', () => {
      socket.destroy()
      resolve(false)
    })

    socket.setTimeout(1000)
  })
}

async function waitForPort(port, hosts = ['localhost', '127.0.0.1', '::1'], timeoutMs = 30000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    for (const host of hosts) {
      if (await canConnect(port, host)) return
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for port ${port} on ${hosts.join(', ')}`)
}

async function main() {
  const vite = spawnNode([viteBin])
  let electron = null
  let viteExited = false

  vite.once('exit', (code) => {
    viteExited = true
    if (!shuttingDown) finish(code ?? 0)
  })

  try {
    await waitForPort(5173)
    if (viteExited || shuttingDown) return

    electron = spawnNode([electronLauncher])
    electron.once('exit', (code) => {
      if (!shuttingDown) finish(code ?? 0)
    })
  } catch (error) {
    console.error('[dev]', error instanceof Error ? error.message : error)
    finish(1)
  }
}

process.once('SIGINT', () => finish(130))
process.once('SIGTERM', () => finish(143))

main()
