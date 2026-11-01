import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'
import { useApp } from '../store.jsx'
import { AccountModal } from '../components/Header.jsx'
import { Modal, PayBadge, Receipt, StatusBadge } from '../components/ui.jsx'
import { NEXT_ACTION, downloadCsv, fmtDate, fmtDateTime, img, peso } from '../utils.js'

const FILTERS = ['All', 'Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled']

function OrdersTab({ orders, reload, notify }) {
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState('')
  const [view, setView] = useState(null)
  const [proofView, setProofView] = useState(null)
  const [sort, setSort] = useState('new')

  const patch = async (o, body, okMsg) => {
    setBusy(o.id)
    try { await api(`/orders/${o.id}`, { method: 'PATCH', body }); await reload(); notify(okMsg) }
    catch (e) { notify(e.message, 'err') } finally { setBusy('') }
  }
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f, f === 'All' ? orders.length : orders.filter((o) => o.status === f).length])), [orders])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = orders.filter((o) => (filter === 'All' || o.status === filter) && (!q || `${o.receiptNo} ${o.customer} ${o.contact} ${o.address} ${o.username}`.toLowerCase().includes(q)))
    return sort === 'pickup' ? [...list].sort((a, b) => a.pickupAt.localeCompare(b.pickupAt)) : list
  }, [orders, filter, query, sort])

  function exportCsv() {
    downloadCsv(`chabakes-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Receipt', 'Ordered', 'Customer', 'Username', 'Contact', 'Type', 'Address', 'Pickup/Delivery', 'Items', 'Total', 'Payment', 'Paid', 'Status', 'Notes'],
      ...shown.map((o) => [o.receiptNo, o.createdAt, o.customer, o.username, o.contact, o.fulfillment, o.address, o.pickupAt, o.items.map((i) => `${i.n} x ${i.item} (${i.label})`).join('; '), o.total, o.payment, o.paid ? 'Yes' : 'No', o.status, o.notes]),
    ])
  }

  return (
    <section>
      <div className="toolbar">
        <div className="chips" role="tablist" aria-label="Filter by status">
          {FILTERS.map((f) => <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f} <b>{counts[f]}</b></button>)}
        </div>
        <div className="tools">
          <input type="search" aria-label="Search orders" placeholder="Search receipt, name, contact…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}><option value="new">Newest first</option><option value="pickup">Pickup date (soonest)</option></select>
          <button className="btn btn-sm btn-line" onClick={exportCsv}>↓ CSV</button>
        </div>
      </div>
      {shown.length === 0 && <div className="empty"><span aria-hidden="true">🧁</span><b>{orders.length ? 'Walang tugma na order' : 'Wala pang order'}</b><p>{orders.length ? 'Subukan ang ibang filter o search.' : 'Lalabas dito ang mga order ng customers kapag may nag-order.'}</p></div>}
      <div className="admin-orders">
        {shown.map((o) => {
          const next = NEXT_ACTION[o.status]
          const closed = o.status === 'Completed' || o.status === 'Cancelled'
          return (
            <article key={o.id} className={`a-order st-${o.status.toLowerCase()}`}>
              <header>
                <div><h3>{o.receiptNo}</h3><small>{fmtDateTime(o.createdAt)}</small></div>
                <StatusBadge order={o} />
              </header>
              <div className="a-cust">
                <b>{o.customer}</b>
                <a href={`tel:${o.contact}`}>📞 {o.contact}</a>
                <span className="a-when"><b>{o.fulfillment === 'Delivery' ? '🛵 Deliver' : '🏠 Pickup'}</b> · {fmtDateTime(o.pickupAt)}</span>
                {o.address && <span>📍 Customer location: {o.address}</span>}
              </div>
              <ul className="oc-items">{o.items.map((i, k) => <li key={k}><span>{i.n} × {i.item} <small>({i.label})</small></span><span>{peso(i.n * i.price)}</span></li>)}</ul>
              {o.notes && <p className="a-note">“{o.notes}”</p>}
              {o.payment === 'GCash' && <div className="proof-admin"><b>GCash proof:</b> {o.paymentProof ? <button type="button" className="btn btn-sm btn-line" onClick={() => setProofView(o)}>View payment screenshot</button> : <span className="muted">No screenshot uploaded</span>}</div>}
              <div className="a-foot">
                <b className="oc-total">{peso(o.total)}</b>
                <button className={`pay pay-btn ${o.paid ? 'pay-paid' : 'pay-unpaid'}`} disabled={busy === o.id || o.status === 'Cancelled'} onClick={() => patch(o, { paid: !o.paid }, o.paid ? 'Na-mark na unpaid.' : 'Na-mark na paid.')} title="I-toggle ang payment status">{o.payment} · {o.paid ? 'Paid ✓' : 'Unpaid'}</button>
              </div>
              <div className="a-actions">
                {next && <button className="btn btn-sm btn-plum" disabled={busy === o.id} onClick={() => patch(o, { status: next[0] }, `${o.receiptNo} → ${next[0]}`)}>{next[1]}</button>}
                <button className="btn btn-sm btn-line" onClick={() => setView(o)}>Receipt</button>
                <select aria-label={`Status ng ${o.receiptNo}`} className="status-select" disabled={busy === o.id} value={o.status} onChange={(e) => { if (e.target.value !== o.status && (e.target.value !== 'Cancelled' || confirm(`I-cancel ang ${o.receiptNo}?`))) patch(o, { status: e.target.value }, `${o.receiptNo} → ${e.target.value}`) }}>
                  {FILTERS.slice(1).map((s) => <option key={s}>{s}</option>)}
                </select>
                {!closed && <button className="btn btn-sm btn-danger" disabled={busy === o.id} onClick={() => confirm(`I-cancel ang ${o.receiptNo}?`) && patch(o, { status: 'Cancelled' }, 'Na-cancel ang order.')}>Cancel</button>}
              </div>
            </article>
          )
        })}
      </div>
      {view && <Modal onClose={() => setView(null)} title="Receipt"><div className="sheet"><Receipt order={view} onClose={() => setView(null)} /></div></Modal>}
      {proofView && <Modal onClose={() => setProofView(null)} title="GCash payment proof" wide><div className="sheet"><h2 className="display">{proofView.receiptNo} · GCash proof</h2><p><b>Customer:</b> {proofView.customer} · {proofView.contact}</p><p><b>Address:</b> {proofView.address || 'Not provided'}</p><p><b>Total:</b> {peso(proofView.total)}</p>{proofView.paymentProof && <img className="proof-admin-image" src={proofView.paymentProof} alt={`GCash proof for ${proofView.receiptNo}`} />}<button className="btn btn-line" onClick={() => setProofView(null)}>Close</button></div></Modal>}
    </section>
  )
}

function PriceInput({ value, onSave }) {
  const [v, setV] = useState(String(value))
  useEffect(() => setV(String(value)), [value])
  const commit = () => { const n = Number(v); if (!Number.isFinite(n) || n < 1) { setV(String(value)); return } if (n !== value) onSave(n) }
  return <label className="price-in"><span>₱</span><input inputMode="numeric" value={v} onChange={(e) => setV(e.target.value.replace(/[^0-9]/g, ''))} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} aria-label="Presyo" /></label>
}

function MenuTab({ notify }) {
  const { menu, loadMenu } = useApp()
  const edit = async (item, label, body, msg) => {
    try { await api('/menu', { method: 'PATCH', body: { item, label, ...body } }); await loadMenu(); notify(msg) } catch (e) { notify(e.message, 'err') }
  }
  if (!menu) return <p className="muted">Kinukuha ang menu…</p>
  return (
    <section className="menu-admin">
      <p className="muted">I-toggle ang <b>Available</b> kapag ubos na ang stock — hindi na ito mao-order ng customers. Puwede ring baguhin ang presyo; ang mga bagong order lang ang tatamaan.</p>
      {menu.map((c) => (
        <div key={c.id} className="ma-cat">
          <h3>{c.title}</h3>
          {c.items.map((it) => (
            <div key={it.name} className="ma-item">
              <img src={img(it.img)} alt="" width="48" height="48" />
              <div className="ma-name"><b>{it.name}</b></div>
              <ul>
                {it.opts.map((o) => (
                  <li key={o.label}>
                    <span>{o.label}</span>
                    {it.name === 'Assorted Cookies' && o.label === 'box of 6' ? <strong className="fixed-price">₱300 · Fixed</strong> : <PriceInput value={o.price} onSave={(price) => edit(it.name, o.label, { price }, `Na-update ang presyo ng ${it.name} (${o.label}).`)} />}
                    <button type="button" role="switch" aria-checked={o.available} className={`switch ${o.available ? 'on' : ''}`} onClick={() => edit(it.name, o.label, { available: !o.available }, `${it.name} (${o.label}) — ${o.available ? 'sold out na' : 'available na ulit'}.`)}>{o.available ? 'Available' : 'Sold out'}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}

function CustomersTab({ orders }) {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api('/admin/users').then(setUsers).catch((e) => setError(e.message)) }, [])
  const stats = useMemo(() => { const m = {}; for (const o of orders) { const s = (m[o.userId] ||= { n: 0, spent: 0 }); s.n++; if (o.status !== 'Cancelled') s.spent += o.total } return m }, [orders])
  if (error) return <p className="connection-alert">{error}</p>
  if (!users) return <p className="muted">Kinukuha…</p>
  if (!users.length) return <div className="empty"><span aria-hidden="true">👥</span><b>Wala pang registered customer.</b></div>
  return (
    <div className="table-wrap"><table className="simple-table"><thead><tr><th>Name</th><th>Email</th><th>Username</th><th>Contact</th><th>Address / Location</th><th>Joined</th><th>Orders</th><th>Total spent</th></tr></thead>
      <tbody>{users.map((u) => <tr key={u.id}><td><b>{u.name}</b></td><td>{u.email ? <a href={`mailto:${u.email}`}>{u.email}</a> : '—'}</td><td>{u.username}</td><td>{u.contact ? <a href={`tel:${u.contact}`}>{u.contact}</a> : '—'}</td><td>{u.address || 'Address not completed (Google login)'}</td><td>{fmtDate(u.createdAt)}</td><td>{stats[u.id]?.n || 0}</td><td>{peso(stats[u.id]?.spent || 0)}</td></tr>)}</tbody></table></div>
  )
}


function OverviewTab({ orders, onOpenOrders }) {
  const latest = orders.slice(0, 5)
  const statuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled']
  const counts = Object.fromEntries(statuses.map((status) => [status, orders.filter((o) => o.status === status).length]))
  const maxCount = Math.max(1, ...statuses.map((status) => counts[status]))
  const gcashNeedsReview = orders.filter((o) => o.payment === 'GCash' && !o.paid && o.status !== 'Cancelled').length
  const validOrders = orders.filter((o) => o.status !== 'Cancelled')
  const dayKey = (date) => { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
  const last7 = Array.from({length: 7}, (_, i) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (6-i)); const key = dayKey(d); const dayOrders = validOrders.filter(o => dayKey(o.createdAt) === key); return { key, label: d.toLocaleDateString('en-PH',{weekday:'short'}), sales: dayOrders.reduce((sum,o)=>sum+Number(o.total||0),0), count: dayOrders.length } })
  const maxSales = Math.max(1, ...last7.map(d => d.sales))
  const soldItems = {}
  validOrders.forEach(o => (o.items || []).forEach(i => { const name = i.item || i.name || 'Item'; soldItems[name] = (soldItems[name] || 0) + Number(i.n || i.quantity || 0) }))
  const bestSellers = Object.entries(soldItems).sort((a,b)=>b[1]-a[1]).slice(0,5)
  return (
    <section className="overview-grid admin-animated">
      <article className="overview-panel sales-chart-panel">
        <div className="overview-panel-head"><div><p className="eyebrow dark">Sales analytics</p><h2 className="display">Sales · last 7 days</h2></div><span className="chart-total">{peso(last7.reduce((sum,d)=>sum+d.sales,0))}</span></div>
        <div className="sales-chart" role="img" aria-label="Sales per day for the last seven days">{last7.map(d => <div className="sales-chart-col" key={d.key} title={`${d.label}: ${peso(d.sales)} · ${d.count} orders`}><b>{d.sales ? peso(d.sales) : '₱0'}</b><div className="sales-chart-track"><span style={{height:`${Math.max(d.sales ? 8 : 2, d.sales/maxSales*100)}%`}} /></div><small>{d.label}</small></div>)}</div>
        <p className="muted chart-note">Batay sa order date; hindi kasama ang cancelled orders. Auto-refresh kada 10 segundo.</p>
      </article>
      <article className="overview-panel best-sellers-panel"><p className="eyebrow dark">Product performance</p><h2 className="display">Pinakamaraming nabenta</h2>{bestSellers.length ? <div className="best-sellers">{bestSellers.map(([name,n],i)=><div className="best-seller-row" key={name}><span className="best-seller-rank">{i+1}</span><span className="best-seller-name">{name}</span><b>{n} sold</b></div>)}</div> : <p className="muted">Lalabas dito ang best sellers kapag may completed o active orders.</p>}</article>
      <article className="overview-panel">
        <div className="overview-panel-head"><div><p className="eyebrow dark">Order status</p><h2 className="display">Today's workflow</h2></div><button className="btn btn-sm btn-line" onClick={onOpenOrders}>Manage orders →</button></div>
        <div className="status-bars">
          {statuses.map((status) => <div className="status-bar-row" key={status}><span>{status}</span><div className="status-bar-track"><span className={`status-bar-fill status-${status.toLowerCase()}`} style={{ width: `${(counts[status] / maxCount) * 100}%` }} /></div><b>{counts[status]}</b></div>)}
        </div>
      </article>
      <article className="overview-panel overview-alert-panel">
        <p className="eyebrow dark">Payment review</p><h2 className="display">GCash verification</h2>
        <strong className="overview-number">{gcashNeedsReview}</strong>
        <p>{gcashNeedsReview ? 'May GCash order na hindi pa minamarkahang paid. Tingnan ang screenshot bago kumpirmahin.' : 'Walang pending na GCash verification sa ngayon.'}</p>
        <button className="btn btn-plum" onClick={onOpenOrders}>Review payments</button>
      </article>
      <article className="overview-panel overview-recent">
        <div className="overview-panel-head"><div><p className="eyebrow dark">Latest activity</p><h2 className="display">Recent orders</h2></div><button className="btn btn-sm btn-line" onClick={onOpenOrders}>View all →</button></div>
        {!latest.length ? <div className="empty compact-empty"><span aria-hidden="true">🧁</span><b>Wala pang order</b><p>Lalabas dito ang mga bagong order ng customers.</p></div> : <div className="table-wrap"><table className="simple-table overview-table"><thead><tr><th>Receipt / customer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>{latest.map((o) => <tr key={o.id}><td><b>{o.receiptNo}</b><small className="table-subline">{o.customer}</small></td><td>{peso(o.total)}</td><td>{o.payment}{o.payment === 'GCash' && !o.paid ? <small className="table-subline">Needs review</small> : ''}</td><td><StatusBadge order={o} /></td></tr>)}</tbody></table></div>}
      </article>
    </section>
  )
}

export default function Admin() {
  const { user, logout, notify } = useApp()
  const [tab, setTab] = useState('overview')
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [account, setAccount] = useState(false)
  const seen = useRef(null)

  const reload = useCallback(async () => {
    try {
      const list = await api('/orders')
      if (seen.current) { const fresh = list.filter((o) => !seen.current.has(o.id)); if (fresh.length) notify(`🔔 ${fresh.length} bagong order: ${fresh.map((o) => o.receiptNo).join(', ')}`) }
      seen.current = new Set(list.map((o) => o.id))
      setOrders(list); setError(''); setLoaded(true)
    } catch (e) { setError(e.message) }
  }, [notify])
  useEffect(() => { reload(); const t = setInterval(reload, 10000); return () => clearInterval(t) }, [reload])

  const pending = orders.filter((o) => o.status === 'Pending').length
  const inProgress = orders.filter((o) => ['Confirmed', 'Preparing', 'Ready'].includes(o.status)).length
  const sales = orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0)
  const unpaid = orders.filter((o) => !o.paid && o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0)
  useEffect(() => { document.title = pending ? `(${pending}) Chabakes Admin` : 'Chabakes Admin'; return () => { document.title = 'Chabakes – Freshly Baked Happiness' } }, [pending])

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="wrap head-row">
          <a className="brand" href="#/admin"><img src={`${import.meta.env.BASE_URL}images/logo.jpg`} alt="" width="40" height="40" /><span>Chabakes<small>Order management</small></span></a>
          <div className="head-actions"><button className="btn btn-sm btn-ghost" onClick={() => setAccount(true)}>⚙ {user.name}</button><button className="btn btn-sm btn-butter" onClick={logout}>Logout</button></div>
        </div>
      </header>
      <main className="wrap admin-main">
        <div className="page-head"><div><p className="eyebrow dark">Daily bake report · {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1 className="display">Order management</h1></div><button className="btn btn-line" onClick={reload}>↻ Refresh</button></div>
        {error && <p className="connection-alert">{error}</p>}
        <div className="stats">
          <div className={`stat ${pending ? 'alert' : ''}`}><span>Kailangan i-confirm</span><b>{pending}</b></div>
          <div className="stat"><span>In progress</span><b>{inProgress}</b></div>
          <div className="stat"><span>Total orders</span><b>{orders.length}</b></div>
          <div className="stat"><span>Sales</span><b>{peso(sales)}</b></div>
          <div className="stat"><span>Hindi pa bayad</span><b>{peso(unpaid)}</b></div>
        </div>
        <div className="admin-tabs" role="tablist">
          {[['overview', 'Dashboard'], ['orders', 'Orders'], ['menu', 'Menu & stock'], ['customers', 'Customers']].map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}{id === 'orders' && pending > 0 && <b>{pending}</b>}</button>)}
        </div>
        {tab === 'overview' && (loaded ? <OverviewTab orders={orders} onOpenOrders={() => setTab('orders')} /> : <p className="muted">Kinukuha ang dashboard…</p>)}
        {tab === 'orders' && (loaded ? <OrdersTab orders={orders} reload={reload} notify={notify} /> : <p className="muted">Kinukuha ang orders…</p>)}
        {tab === 'menu' && <MenuTab notify={notify} />}
        {tab === 'customers' && <CustomersTab orders={orders} />}
      </main>
      {account && <AccountModal onClose={() => setAccount(false)} />}
    </div>
  )
}
