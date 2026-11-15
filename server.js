// Entry point: `npm run backend` (API lang) o `npm start` (API + built frontend sa iisang port).
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { createApp } from './server/app.js'
const PORT = Number(process.env.PORT || 8080);

const root = path.dirname(fileURLToPath(import.meta.url))
// Load simple .env values without an extra package; existing shell variables take priority.
const envFile = path.join(root, '.env')
if (existsSync(envFile)) for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') }
const port = Number(process.env.PORT) || 3001
const { server } = createApp({
  dataDir: process.env.DATA_DIR || path.join(root, 'data'),
  distDir: path.join(root, 'dist'),
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  minLeadHours: Number(process.env.MIN_LEAD_HOURS) || 3,
})
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[PORT ERROR] Port ${port} is already in use. Close the other Chabakes/Node terminal or set PORT=3002 in .env.`)
  } else {
    console.error('[SERVER ERROR]', error.message)
  }
  process.exitCode = 1
})
server.listen(port, () => console.log(`Chabakes running at http://localhost:${port}`))
