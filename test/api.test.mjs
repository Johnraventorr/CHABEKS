import { createApp } from '../server/app.js'
import { rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
const tmp = path.join(mkdtempSync(path.join(tmpdir(), 'chabakes-')), 'db')
const { server } = createApp({ dataDir: tmp, log: () => {} })
await new Promise(r => server.listen(0, r))
const base = `http://localhost:${server.address().port}`
let pass = 0, bad = 0
const call = async (m, p, body, tok) => { const r = await fetch(base + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, b: await r.json().catch(() => null) } }
const ok = (name, c) => { c ? pass++ : (bad++, console.log('FAIL', name)) }
const future = (h) => { const d = new Date(Date.now() + h * 3600e3 + 8 * 3600e3); return d.toISOString().slice(0, 16) }

ok('menu', (await call('GET', '/api/menu')).b.categories.length === 4)
ok('orders need auth', (await call('GET', '/api/orders')).s === 401)
let r = await call('POST', '/api/auth/register', { name: 'Ana Cruz', username: 'ana', email: 'ana@example.com', contact: '09171234567', address: 'Poblacion, Mansalay, Oriental Mindoro', password: 'secret1' })
ok('register', r.s === 201); const ana = r.b.token
ok('dup user', (await call('POST', '/api/auth/register', { name: 'X Y', username: 'ANA', email: 'ana2@example.com', contact: '09171234567', address: 'Poblacion, Mansalay, Oriental Mindoro', password: 'secret1' })).s === 409)
ok('short pw', (await call('POST', '/api/auth/register', { name: 'X Y', username: 'bob', email: 'bob@example.com', contact: '09171234567', address: 'Poblacion, Mansalay, Oriental Mindoro', password: '123' })).s === 400)
r = await call('POST', '/api/auth/register', { name: 'Ben Reyes', username: 'ben', email: 'ben@example.com', contact: '09171234568', address: 'Poblacion, Mansalay, Oriental Mindoro', password: 'secret2' }); const ben = r.b.token
ok('bad login', (await call('POST', '/api/auth/login', { username: 'ana', password: 'nope' })).s === 401)
ok('login', (await call('POST', '/api/auth/login', { username: 'ana', password: 'secret1' })).s === 200)
r = await call('POST', '/api/auth/login', { username: 'admin', password: 'admin123' }); const adm = r.b.token; ok('admin login', r.b.user.role === 'admin')
ok('forged token', (await call('GET', '/api/auth/me', null, ana.slice(0, -2) + 'xx')).s === 401)

const good = { customer: 'Ana Cruz', contact: '09171234567', fulfillment: 'Delivery', address: '12 Rizal St, Manila', payment: 'GCash', paymentProof: 'data:image/jpeg;base64,ZmFrZQ==', pickupDate: future(30), notes: 'hi', items: [{ item: 'OG Choco Chip', label: 'box of 6', n: 2, price: 1 }, { item: 'Classic Brownie', label: 'box of 6', n: 1 }] }
r = await call('POST', '/api/orders', good, ana)
ok('order ok', r.s === 201 && r.b.order.total === 750) // price from server, not client
const oid = r.b.order.id
ok('no token', (await call('POST', '/api/orders', good)).s === 401)
ok('admin cant order', (await call('POST', '/api/orders', good, adm)).s === 403)
ok('too soon', (await call('POST', '/api/orders', { ...good, pickupDate: future(1) }, ana)).s === 400)
ok('past', (await call('POST', '/api/orders', { ...good, pickupDate: '2020-01-01T10:00' }, ana)).s === 400)
ok('fake item', (await call('POST', '/api/orders', { ...good, items: [{ item: 'Hack', label: 'x', n: 1 }] }, ana)).s === 400)
ok('neg qty', (await call('POST', '/api/orders', { ...good, items: [{ item: 'OG Choco Chip', label: 'box of 6', n: -3 }] }, ana)).s === 400)
ok('delivery needs address', (await call('POST', '/api/orders', { ...good, address: '' }, ana)).s === 400)
ok('pickup requires customer location', (await call('POST', '/api/orders', { ...good, fulfillment: 'Pickup', address: '' }, ana)).s === 400)
ok('pickup with location', (await call('POST', '/api/orders', { ...good, fulfillment: 'Pickup', address: 'Poblacion, Mansalay, Oriental Mindoro' }, ana)).s === 201)
ok('ana sees own', (await call('GET', '/api/orders', null, ana)).b.length === 2)
ok('ben sees none', (await call('GET', '/api/orders', null, ben)).b.length === 0)
ok('ben cant read', (await call('GET', '/api/orders/' + oid, null, ben)).s === 404)
ok('ben cant cancel', (await call('PATCH', '/api/orders/' + oid, { status: 'Cancelled' }, ben)).s === 404)
ok('ana cant confirm', (await call('PATCH', '/api/orders/' + oid, { status: 'Confirmed' }, ana)).s === 403)
ok('ana cant pay', (await call('PATCH', '/api/orders/' + oid, { paid: true }, ana)).s === 403)
ok('admin all', (await call('GET', '/api/orders', null, adm)).b.length === 2)
ok('admin confirm', (await call('PATCH', '/api/orders/' + oid, { status: 'Confirmed' }, adm)).b.status === 'Confirmed')
ok('ana cant cancel confirmed', (await call('PATCH', '/api/orders/' + oid, { status: 'Cancelled' }, ana)).s === 403)
r = await call('PATCH', '/api/orders/' + oid, { status: 'Completed' }, adm); ok('complete+paid', r.b.paid === true && r.b.history.length === 3)
ok('bad status', (await call('PATCH', '/api/orders/' + oid, { status: 'Nope' }, adm)).s === 400)
const o2 = (await call('GET', '/api/orders', null, ana)).b[0]
ok('ana cancels pending', (await call('PATCH', '/api/orders/' + o2.id, { status: 'Cancelled' }, ana)).b.status === 'Cancelled')
// menu admin
ok('user cant edit menu', (await call('PATCH', '/api/menu', { item: 'Brookie', label: 'per piece', available: false }, ana)).s === 403)
ok('admin sold out', (await call('PATCH', '/api/menu', { item: 'Classic Brownie', label: 'box of 6', available: false }, adm)).s === 200)
r = await call('POST', '/api/orders', good, ana); ok('sold out blocks', r.s === 409)
await call('PATCH', '/api/menu', { item: 'Classic Brownie', label: 'box of 6', available: true, price: 200 }, adm)
r = await call('POST', '/api/orders', good, ana); ok('new price used', r.s === 201 && r.b.order.total === 800)
ok('users list', (await call('GET', '/api/admin/users', null, adm)).b.length === 2)
ok('profile', (await call('PATCH', '/api/auth/me', { contact: '09999999999' }, ana)).b.user.contact === '09999999999')
ok('404', (await call('GET', '/api/nothing')).s === 404)
ok('bad json', (await fetch(base + '/api/auth/login', { method: 'POST', body: '{bad' })).status === 400)
console.log(`pass ${pass} fail ${bad}`)
server.close()
rmSync(tmp, { recursive: true, force: true })
process.exit(bad ? 1 : 0)
