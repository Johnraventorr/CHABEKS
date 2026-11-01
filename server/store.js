// Simpleng file database (data/db.json). Atomic ang save: sinusulat muna sa temp file bago i-rename,
// kaya hindi masisira ang data kahit mawalan ng kuryente habang nagsa-save.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

export function createStore(dir) {
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'db.json')
  let db = { nextNumber: 1001, secret: randomBytes(32).toString('hex'), users: [], orders: [], menu: {} }
  if (existsSync(file)) {
    try {
      const saved = JSON.parse(readFileSync(file, 'utf8'))
      db = { ...db, ...saved }
    } catch (e) {
      // Huwag burahin ang sirang file — i-backup at magsimula ulit.
      renameSync(file, `${file}.corrupt-${Date.now()}`)
      console.error('[STORAGE] Sira ang db.json, na-backup at gumawa ng bago:', e.message)
    }
  }
  const save = () => {
    const tmp = `${file}.tmp`
    writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8')
    renameSync(tmp, file)
  }
  save()
  return { db, save }
}
