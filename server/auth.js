import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':')
  if (!salt || !hash) return false
  const a = Buffer.from(hash, 'hex')
  const b = scryptSync(password, salt, 64)
  return a.length === b.length && timingSafeEqual(a, b)
}

const b64 = (s) => Buffer.from(s).toString('base64url')

/** Signed token (parang JWT, pero simple): payload.signature */
export function signToken(secret, payload, ttlMs = 7 * 24 * 3600 * 1000) {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + ttlMs }))
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function readToken(secret, token) {
  const [body, sig] = String(token || '').split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(sig), b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    return p.exp > Date.now() ? p : null
  } catch { return null }
}
