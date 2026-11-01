// Start backend + Vite with clear errors on Windows/macOS/Linux.
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
let viteBin
try { viteBin = path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js') }
catch { console.error('[SETUP ERROR] Vite is missing. Run npm install in the folder containing package.json.'); process.exit(1) }
if (!existsSync(viteBin)) { console.error('[SETUP ERROR] Vite executable missing:', viteBin); console.error('Run: npm install'); process.exit(1) }

let closing = false
const children = []
function shutdown(code = 0) {
  if (closing) return
  closing = true
  for (const child of children) if (child && child.exitCode === null && !child.killed) child.kill()
  process.exitCode = code
}
function start(name, args) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true })
  children.push(child)
  child.on('error', (error) => { console.error(`[${name} START ERROR] ${error.message}`); shutdown(1) })
  child.on('exit', (code, signal) => {
    if (closing) return
    if (signal) console.error(`[${name}] stopped by ${signal}`)
    else if (code !== 0) console.error(`[${name}] exited with code ${code}`)
    shutdown(code ?? 1)
  })
  return child
}
start('backend', ['server.js'])
start('frontend', [viteBin, '--host', '0.0.0.0'])
process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
