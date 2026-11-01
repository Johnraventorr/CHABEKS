import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { go } from '../hooks/useHash.js'
import { useApp } from '../store.jsx'
import { fmtDateTime, peso } from '../utils.js'
import { Modal, PayBadge, Receipt, StatusBadge, Timeline } from '../components/ui.jsx'

export default function MyOrders() {
  const { user, cart, setCartOpen, notify, index } = useApp()
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  const [view, setView] = useState(null)
  const [busy, setBusy] = useState('')

  const refresh = useCallback(async () => {
    try { setOrders(await api('/orders')); setError('') } catch (e) { setError(e.message) }
  }, [])
  useEffect(() => { if (!user) return; refresh(); const t = setInterval(refresh, 20000); return () => clearInterval(t) }, [user, refresh])

  if (!user) return <div className="wrap state"><div className="empty"><span aria-hidden="true">🔒</span><b>Mag-login para makita ang mga order mo.</b><button className="btn btn-plum" onClick={() => go('/login?next=orders')}>Login</button></div></div>

  async function cancel(o) {
    if (!confirm(`I-cancel ang ${o.receiptNo}?`)) return
    setBusy(o.id)
    try { const u = await api(`/orders/${o.id}`, { method: 'PATCH', body: { status: 'Cancelled' } }); setOrders((l) => l.map((x) => (x.id === u.id ? u : x))); notify('Na-cancel ang order.') }
    catch (e) { notify(e.message, 'err') } finally { setBusy('') }
  }
  function reorder(o) {
    const ok = o.items.filter((i) => index.get(`${i.item}|${i.label}`)?.available)
    if (!ok.length) { notify('Wala nang available sa mga item na ito.', 'err'); return }
    cart.addMany(ok); setCartOpen(true)
    if (ok.length < o.items.length) notify('Hindi na available ang ilang item, hindi ito isinama.', 'err')
  }

  const active = (orders || []).filter((o) => !['Completed', 'Cancelled'].includes(o.status)).length
  const spent = (orders || []).filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0)
  return (
    <div className="wrap page">
      <div className="page-head"><div><p className="eyebrow dark">Your Chabakes account</p><h1 className="display">Hello, {user.name.split(' ')[0]}! ♡</h1></div><button className="btn btn-line" onClick={refresh}>↻ Refresh</button></div>
      <div className="mini-stats"><article><span>All orders</span><b>{orders?.length ?? '–'}</b></article><article><span>In progress</span><b>{orders ? active : '–'}</b></article><article><span>Total spent</span><b>{peso(spent)}</b></article></div>
      {error && <p className="connection-alert">{error}</p>}
      {orders && orders.length === 0 && <div className="empty"><span aria-hidden="true">🍪</span><b>Wala ka pang order.</b><p>Your next favorite treat is waiting.</p><button className="btn btn-plum" onClick={() => go('/menu')}>Explore the menu</button></div>}
      <div className="order-list">
        {(orders || []).map((o) => (
          <article key={o.id} className="order-card">
            <header><div><h3>{o.receiptNo}</h3><small>Inorder: {fmtDateTime(o.createdAt)}</small></div><StatusBadge order={o} /></header>
            <Timeline order={o} />
            <ul className="oc-items">{o.items.map((i, k) => <li key={k}><span>{i.n} × {i.item} <small>({i.label})</small></span><span>{peso(i.n * i.price)}</span></li>)}</ul>
            <div className="oc-meta">
              <span>{o.fulfillment === 'Delivery' ? '🛵 Delivery' : '🏠 Pickup'}: <b>{fmtDateTime(o.pickupAt)}</b></span>
              {o.address && <span>📍 {o.address}</span>}
              <PayBadge order={o} />
              {o.payment === 'GCash' && <span>{o.paymentProof ? '🧾 Payment screenshot submitted' : '🧾 Payment screenshot missing'}</span>}
            </div>
            <footer><b className="oc-total">{peso(o.total)}</b>
              <span className="oc-actions">
                <button className="btn btn-sm btn-line" onClick={() => setView(o)}>Receipt</button>
                <button className="btn btn-sm btn-line" onClick={() => reorder(o)}>Order ulit</button>
                {o.status === 'Pending' && <button className="btn btn-sm btn-danger" disabled={busy === o.id} onClick={() => cancel(o)}>Cancel</button>}
              </span>
            </footer>
          </article>
        ))}
      </div>
      {view && <Modal onClose={() => setView(null)} title="Receipt"><div className="sheet"><Receipt order={view} onClose={() => setView(null)} /></div></Modal>}
    </div>
  )
}
