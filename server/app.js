// Chabakes API — walang external dependency (Node built-ins lang).
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { existsSync, createReadStream, statSync } from 'node:fs'
import path from 'node:path'
import { categories, STATUSES, PAYMENTS, FULFILLMENT, optKey } from '../shared/menu.js'
import { createStore } from './store.js'
import { hashPassword, readToken, signToken, verifyPassword } from './auth.js'

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2', '.map': 'application/json' }
const TZ_OFFSET = '+08:00' // Manila
const HOUR = 3600 * 1000

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
const fail = (status, message) => { throw new HttpError(status, message) }

export function createApp({ dataDir, distDir, adminPassword = 'admin123', minLeadHours = 3, log = console.log } = {}) {
  const { db, save } = createStore(dataDir)

  // ---- Seed admin ----
  if (!db.users.some((u) => u.role === 'admin')) {
    db.users.push({ id: randomUUID(), name: 'Administrator', username: 'admin', contact: '', role: 'admin', password: hashPassword(adminPassword), createdAt: new Date().toISOString() })
    save()
    log(`[SETUP] Gumawa ng admin account: admin / ${adminPassword}`)
  }

  // ---- Menu (static + admin overrides) ----
  const catalog = new Map()
  for (const c of categories) for (const it of c.items) for (const [label, price] of it.opts) catalog.set(optKey(it.name, label), { item: it.name, label, price, category: c.title })
  const priceOf = (key) => { const o = db.menu[key]; return Number.isFinite(o?.price) ? o.price : catalog.get(key).price }
  const availableOf = (key) => db.menu[key]?.available !== false
  const menuView = () => categories.map((c) => ({
    ...c,
    items: c.items.map((it) => ({ ...it, opts: it.opts.map(([label]) => { const key = optKey(it.name, label); return { label, price: priceOf(key), available: availableOf(key) } }) })),
  }))

  // ---- Helpers ----
  const publicUser = (u) => ({ id: u.id, name: u.name, username: u.username, email: u.email || '', contact: u.contact || '', address: u.address || '', street: u.street || '', barangay: u.barangay || '', municipality: u.municipality || '', province: u.province || '', postalCode: u.postalCode || '', landmark: u.landmark || '', role: u.role })
  const clean = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)
  const stamp = () => new Date().toISOString()

  const attempts = new Map() // ip+username -> {n, until}
  function throttle(key) {
    const a = attempts.get(key)
    if (a && a.until > Date.now() && a.n >= 8) fail(429, 'Masyadong maraming maling subok. Maghintay ng 5 minuto bago ulit.')
  }
  const failedLogin = (key) => { const a = attempts.get(key); const n = (a && a.until > Date.now() ? a.n : 0) + 1; attempts.set(key, { n, until: Date.now() + 5 * 60 * 1000 }) }

  function authUser(req, required = true) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '')
    const p = m && readToken(db.secret, m[1])
    const user = p && db.users.find((u) => u.id === p.sub)
    if (!user && required) fail(401, 'Mag-login muna para magpatuloy.')
    return user || null
  }
  const adminOnly = (user) => { if (user.role !== 'admin') fail(403, 'Para lang ito sa admin.') }

  function orderView(o) { return o }

  // ---- Route handlers ----
  const routes = []
  const route = (method, pattern, handler) => routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), handler })

  route('GET', '/api/health', () => ({ ok: true, service: 'Chabakes Ordering System' }))
  route('GET', '/api/menu', () => ({ categories: menuView(), minLeadHours }))

  route('POST', '/api/auth/register', ({ req, body }) => {
    const name = clean(body.name, 60), username = clean(body.username, 30), email = clean(body.email, 254).toLowerCase(), contact = clean(body.contact, 20), address = clean(body.address, 250)
    const password = String(body.password ?? '')
    if (name.length < 2) fail(400, 'Ilagay ang buong pangalan.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Maglagay ng valid na email address.')
    if (!/^[A-Za-z0-9._-]{3,30}$/.test(username)) fail(400, 'Ang username ay 3–30 characters: letters, numbers, . _ - lang.')
    if (!/^[0-9+\s-]{7,20}$/.test(contact)) fail(400, 'Maglagay ng valid na contact number (hal. 09171234567).')
    if (address.length < 8) fail(400, 'Ilagay ang address kasama ang barangay at municipality/city.')
    if (password.length < 6) fail(400, 'Ang password ay dapat hindi bababa sa 6 characters.')
    if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) fail(409, 'May gumagamit na ng username na ito.')
    if (db.users.some((u) => u.email && u.email.toLowerCase() === email)) fail(409, 'May account na gamit ang email na ito.')
    const user = { id: randomUUID(), name, username, email, contact, address, street: clean(body.street, 120), barangay: clean(body.barangay, 80), municipality: clean(body.municipality, 80), province: clean(body.province, 80), postalCode: clean(body.postalCode, 12), landmark: clean(body.landmark, 120), role: 'user', password: hashPassword(password), createdAt: stamp() }
    db.users.push(user); save()
    log(`[ACCOUNT] Bagong customer: ${username}`)
    return { status: 201, body: { token: signToken(db.secret, { sub: user.id }), user: publicUser(user) } }
  })

  route('POST', '/api/auth/login', ({ req, body }) => {
    const username = clean(body.username, 30).toLowerCase()
    const key = `${req.socket.remoteAddress}|${username}`
    throttle(key)
    const user = db.users.find((u) => u.username.toLowerCase() === username)
    if (!user || !verifyPassword(String(body.password ?? ''), user.password)) { failedLogin(key); fail(401, 'Mali ang username o password.') }
    attempts.delete(key)
    return { token: signToken(db.secret, { sub: user.id }), user: publicUser(user) }
  })

  route('POST', '/api/auth/google', async ({ body }) => {
    const credential = String(body.credential || '')
    const projectId = process.env.FIREBASE_PROJECT_ID || 'chabakes-7059c'
    if (!credential || credential.length > 12000) fail(400, 'Hindi valid ang Firebase Google credential. Subukan ulit.')
    let claims
    try {
      const parts = credential.split('.')
      if (parts.length !== 3) fail(401, 'Hindi valid ang Firebase ID token.')
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
      claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
      if (header.alg !== 'RS256' || !header.kid) fail(401, 'Hindi valid ang token signature.')
      const certResponse = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')
      if (!certResponse.ok) fail(503, 'Hindi makuha ang Firebase verification certificates.')
      const certs = await certResponse.json()
      const cert = certs[header.kid]
      if (!cert) fail(401, 'Expired o hindi valid ang Google session. Mag-login ulit.')
      const { verify: verifySignature } = await import('node:crypto')
      const validSignature = verifySignature('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), cert, Buffer.from(parts[2], 'base64url'))
      const now = Math.floor(Date.now() / 1000)
      if (!validSignature || claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}` || !claims.sub || claims.sub.length > 128 || !claims.exp || claims.exp <= now || !claims.iat || claims.iat > now + 300 || !claims.email || claims.email_verified !== true) fail(401, 'Hindi verified ang Google account. Mag-login ulit.')
    } catch (e) {
      if (e instanceof HttpError) throw e
      fail(401, 'Hindi ma-verify ang Google account. Tiyaking naka-enable ang Google provider sa Firebase.')
    }
    const email = clean(claims.email, 254).toLowerCase()
    let user = db.users.find((u) => (u.googleSub && u.googleSub === claims.sub) || (u.email && u.email.toLowerCase() === email))
    if (!user) {
      const base = (email.split('@')[0].replace(/[^A-Za-z0-9._-]/g, '').slice(0, 22) || 'googleuser').padEnd(3, '0')
      let username = base, suffix = 1
      while (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) username = `${base.slice(0, 25)}${suffix++}`
      user = { id: randomUUID(), name: clean(claims.name || email.split('@')[0], 60), username, email, contact: '', address: '', street: '', barangay: '', municipality: '', province: '', postalCode: '', landmark: '', role: 'user', googleSub: claims.sub, password: '', createdAt: stamp() }
      db.users.push(user)
    } else {
      if (!user.googleSub) user.googleSub = claims.sub
      if (!user.email) user.email = email
      if (!user.name && claims.name) user.name = clean(claims.name, 60)
    }
    save()
    log(`[AUTH] Firebase Google login: ${user.email}`)
    return { token: signToken(db.secret, { sub: user.id }), user: publicUser(user) }
  })

  route('GET', '/api/auth/me', ({ req }) => ({ user: publicUser(authUser(req)) }))

  route('PATCH', '/api/auth/me', ({ req, body }) => {
    const user = authUser(req)
    if (body.name !== undefined) { const n = clean(body.name, 60); if (n.length < 2) fail(400, 'Ilagay ang pangalan.'); user.name = n }
    for (const field of ['street', 'barangay', 'municipality', 'province', 'postalCode', 'landmark']) if (body[field] !== undefined) user[field] = clean(body[field], field === 'street' ? 120 : 80)
    if (body.contact !== undefined) { const c = clean(body.contact, 20); if (!/^[0-9+\s-]{7,20}$/.test(c)) fail(400, 'Hindi valid ang contact number.'); user.contact = c }
    if (body.address !== undefined) { const a = clean(body.address, 250); if (a.length < 8) fail(400, 'Ilagay ang address kasama ang barangay at municipality/city.'); user.address = a }
    if (body.newPassword !== undefined) {
      if (!verifyPassword(String(body.currentPassword ?? ''), user.password)) fail(400, 'Mali ang kasalukuyang password.')
      if (String(body.newPassword).length < 6) fail(400, 'Ang bagong password ay dapat 6+ characters.')
      user.password = hashPassword(String(body.newPassword))
    }
    save()
    return { user: publicUser(user) }
  })

  route('GET', '/api/orders', ({ req }) => {
    const user = authUser(req)
    const list = user.role === 'admin' ? db.orders : db.orders.filter((o) => o.userId === user.id)
    return [...list].reverse().map(orderView)
  })

  route('GET', '/api/orders/:id', ({ req, params }) => {
    const user = authUser(req)
    const o = db.orders.find((x) => x.id === params.id)
    if (!o || (user.role !== 'admin' && o.userId !== user.id)) fail(404, 'Hindi makita ang order.')
    return orderView(o)
  })

  route('POST', '/api/orders', ({ req, body }) => {
    const user = authUser(req)
    if (user.role === 'admin') fail(403, 'Customer account ang kailangan para mag-order.')
    const customer = clean(body.customer, 60), contact = clean(body.contact, 20)
    const fulfillment = FULFILLMENT.includes(body.fulfillment) ? body.fulfillment : fail(400, 'Pumili ng Pickup o Delivery.')
    const payment = PAYMENTS.includes(body.payment) ? body.payment : fail(400, 'Pumili ng payment method.')
    const address = clean(body.address, 250)
    if (customer.length < 2) fail(400, 'Ilagay ang pangalan.')
    if (!/^[0-9+\s-]{7,20}$/.test(contact)) fail(400, 'Maglagay ng valid na contact number.')
    if (address.length < 8) fail(400, 'Ilagay ang kumpletong address kasama ang barangay at municipality/city.')
    const paymentProof = String(body.paymentProof || '')
    if (payment === 'GCash' && !/^data:image\/(jpeg|png|webp);base64,/.test(paymentProof)) fail(400, 'Kailangan ang screenshot ng GCash payment.')
    if (payment === 'GCash' && paymentProof.length > 950_000) fail(413, 'Masyadong malaki ang screenshot. Pumili ng mas maliit na image.')

    const when = Date.parse(`${clean(body.pickupDate, 16)}:00${TZ_OFFSET}`)
    if (!Number.isFinite(when)) fail(400, 'Ilagay ang petsa at oras.')
    if (when < Date.now() + minLeadHours * HOUR) fail(400, `Kailangan ng at least ${minLeadHours} oras na paghahanda. Pumili ng mas huling oras.`)
    if (when > Date.now() + 60 * 24 * HOUR) fail(400, 'Hanggang 60 araw lang ang advance order.')

    if (!Array.isArray(body.items) || !body.items.length) fail(400, 'Walang laman ang order.')
    if (body.items.length > 40) fail(400, 'Masyadong maraming items sa isang order.')
    const merged = new Map()
    for (const i of body.items) {
      const key = optKey(String(i.item), String(i.label))
      if (!catalog.has(key)) fail(400, `Wala sa menu: ${clean(i.item, 60)}.`)
      const n = Math.floor(Number(i.n))
      if (!(n >= 1 && n <= 100)) fail(400, 'Hindi valid ang dami (1–100).')
      merged.set(key, (merged.get(key) || 0) + n)
    }
    const items = []
    for (const [key, n] of merged) {
      const c = catalog.get(key)
      if (!availableOf(key)) fail(409, `Sold out muna: ${c.item} (${c.label}). Alisin ito sa order.`)
      items.push({ item: c.item, label: c.label, n, price: priceOf(key) })
    }
    const total = items.reduce((s, i) => s + i.n * i.price, 0)
    const now = stamp()
    const order = {
      id: randomUUID(), receiptNo: `CHB-${db.nextNumber++}`, userId: user.id, username: user.username,
      customer, contact, fulfillment, address,
      pickupAt: new Date(when).toISOString(), payment, paid: false, paymentProof: payment === 'GCash' ? String(body.paymentProof || '') : '', notes: clean(body.notes, 300),
      items, total, status: 'Pending', createdAt: now,
      history: [{ status: 'Pending', at: now }],
    }
    db.orders.push(order)
    try { save() } catch (e) { db.orders.pop(); db.nextNumber--; fail(500, 'Hindi ma-save ang order. Subukan ulit.') }
    log(`[ORDER] ${order.receiptNo} · ${customer} · ${items.map((i) => `${i.n}× ${i.item} (${i.label})`).join(', ')} · ₱${total}`)
    return { status: 201, body: { message: 'Order submitted successfully', order } }
  })

  route('PATCH', '/api/orders/:id', ({ req, params, body }) => {
    const user = authUser(req)
    const o = db.orders.find((x) => x.id === params.id)
    if (!o || (user.role !== 'admin' && o.userId !== user.id)) fail(404, 'Hindi makita ang order.')
    const before = JSON.stringify(o)
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) fail(400, 'Invalid status.')
      if (body.status !== o.status) {
        if (user.role !== 'admin') {
          if (!(body.status === 'Cancelled' && o.status === 'Pending')) fail(403, 'Makakansela mo lang ang order na Pending pa. Makipag-ugnayan sa Chabakes para sa iba.')
        }
        o.status = body.status
        o.history.push({ status: o.status, at: stamp() })
        if (o.status === 'Completed') o.paid = true
      }
    }
    if (body.paid !== undefined) { adminOnly(user); o.paid = Boolean(body.paid) }
    if (JSON.stringify(o) !== before) {
      try { save() } catch { fail(500, 'Hindi ma-save ang pagbabago.') }
      log(`[ORDER UPDATE] ${o.receiptNo} -> ${o.status}${o.paid ? ' · PAID' : ''}`)
    }
    return orderView(o)
  })

  route('PATCH', '/api/menu', ({ req, body }) => {
    adminOnly(authUser(req))
    const key = optKey(String(body.item), String(body.label))
    if (!catalog.has(key)) fail(404, 'Wala sa menu ang item na iyon.')
    const o = { ...(db.menu[key] || {}) }
    if (body.available !== undefined) o.available = Boolean(body.available)
    if (body.price !== undefined && key === optKey('Assorted Cookies', 'box of 6') && Number(body.price) !== 300) fail(400, 'Fixed ang presyo ng Assorted Cookies box of 6 sa ₱300.')
    if (body.price !== undefined) {
      const p = Number(body.price)
      if (!Number.isFinite(p) || p < 1 || p > 100000) fail(400, 'Hindi valid ang presyo.')
      o.price = Math.round(p)
    }
    db.menu[key] = o; save()
    return { categories: menuView() }
  })

  route('GET', '/api/admin/users', ({ req }) => {
    adminOnly(authUser(req))
    return db.users.filter((u) => u.role !== 'admin').map((u) => ({ ...publicUser(u), createdAt: u.createdAt }))
  })

  // ---- HTTP plumbing ----
  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = []
      req.on('data', (c) => { size += c.length; if (size > 1_100_000) { reject(new HttpError(413, 'Masyadong malaki ang request.')); req.destroy() } else chunks.push(c) })
      req.on('end', () => {
        if (!chunks.length) return resolve({})
        try { const b = JSON.parse(Buffer.concat(chunks).toString('utf8')); resolve(b && typeof b === 'object' ? b : {}) } catch { reject(new HttpError(400, 'Sirang JSON.')) }
      })
      req.on('error', reject)
    })
  }
  const allowedOrigin = process.env.FRONTEND_ORIGIN || ''
  const corsHeaders = (req) => {
    const origin = req.headers.origin || ''
    const allowed = !allowedOrigin || origin === allowedOrigin || /^https?:\/\/localhost(:\d+)?$/.test(origin)
    return { ...(allowed && origin ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}), 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' }
  }
  const send = (res, status, data, extra = {}, req = null) => {
    const body = JSON.stringify(data)
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(req ? corsHeaders(req) : {}), ...extra })
    res.end(body)
  }

  function serveStatic(req, res, pathname) {
    if (!distDir || !existsSync(distDir)) return send(res, 404, { error: 'Hindi pa na-build ang frontend. Patakbuhin ang "npm run build" (o gamitin ang "npm run dev").' })
    let file = path.join(distDir, path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, ''))
    if (!file.startsWith(distDir)) return send(res, 403, { error: 'Forbidden' })
    let isAsset = true
    if (!existsSync(file) || statSync(file).isDirectory()) { file = path.join(distDir, 'index.html'); isAsset = false } // SPA fallback
    const ext = path.extname(file).toLowerCase()
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': isAsset && file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache', 'X-Content-Type-Options': 'nosniff' })
    createReadStream(file).pipe(res)
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    if (url.pathname.startsWith('/api/') && req.method === 'OPTIONS') { res.writeHead(204, corsHeaders(req)); return res.end() }
    if (!url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' })
      return serveStatic(req, res, url.pathname)
    }
    try {
      const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname))
      if (!r) {
        if (routes.some((x) => x.re.test(url.pathname))) fail(405, 'Method not allowed')
        fail(404, 'Hindi makita ang API route.')
      }
      const params = r.re.exec(url.pathname).groups || {}
      const body = req.method === 'GET' ? {} : await readBody(req)
      const out = await r.handler({ req, params, body })
      if (out && out.status && out.body) send(res, out.status, out.body)
      else send(res, 200, out, {}, req)
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message }, {}, req)
      console.error('[ERROR]', e)
      send(res, 500, { error: 'May nangyaring problema sa server.' }, {}, req)
    }
  })

  return { server, db }
}
