import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { go } from '../hooks/useHash.js'
import { useApp } from '../store.jsx'
import { manilaInput, peso } from '../utils.js'
import { Receipt, Stepper } from './ui.jsx'
import { GCASH_RECEIVER_NUMBER } from '../config.js'

export default function CartPanel() {
  const { cartOpen, setCartOpen, cart, user, minLeadHours, loadMenu, notify } = useApp()
  const [f, setF] = useState({ name: '', contact: '', fulfillment: 'Pickup', address: '', date: '', payment: 'Cash', notes: '' })
  const [proof, setProof] = useState('')
  const [proofName, setProofName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  async function readProof(file) {
    if (!file) { setProof(''); setProofName(''); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('JPG, PNG o WEBP screenshot lang ang puwede.'); return }
    try {
      const data = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file) })
      const image = await new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = reject; im.src = data })
      const scale = Math.min(1, 1000 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale)
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      const compressed = canvas.toDataURL('image/jpeg', 0.72)
      if (compressed.length > 900_000) { setError('Masyadong malaki ang screenshot. Pumili ng mas maliit na image.'); return }
      setProof(compressed); setProofName(file.name); setError('')
    } catch { setError('Hindi mabasa ang screenshot. Subukan ulit.') }
  }
  const close = () => { setCartOpen(false); setDone(null); setError('') }

  // I-prefill ang detalye ng customer.
  useEffect(() => { if (user) setF((x) => ({ ...x, name: x.name || user.name, contact: x.contact || user.contact, address: x.address || user.address || '' })) }, [user])
  useEffect(() => {
    if (!cartOpen) return
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey); document.body.classList.add('no-scroll')
    loadMenu() // siguraduhing updated ang presyo/availability
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll') }
  }, [cartOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!cartOpen) return null
  const soldOut = cart.lines.filter((l) => !l.available)

  async function submit(e) {
    e.preventDefault()
    if (soldOut.length) { setError('May sold out sa order mo. Alisin muna ito.'); return }
    if (f.payment === 'GCash' && !proof) { setError('I-upload ang screenshot ng GCash payment.'); return }
    setBusy(true); setError('')
    try {
      const d = await api('/orders', { method: 'POST', body: {
        customer: f.name, contact: f.contact, fulfillment: f.fulfillment, address: f.address, pickupDate: f.date, payment: f.payment, paymentProof: f.payment === 'GCash' ? proof : '', notes: f.notes,
        items: cart.lines.map((l) => ({ item: l.item, label: l.label, n: l.n })),
      } })
      setDone(d.order); cart.clear(); setProof(''); setProofName(''); setF((x) => ({ ...x, address: '', date: '', notes: '' }))
      notify(`Naipasa na ang order ${d.order.receiptNo}!`)
    } catch (err) { setError(err.message); if (err.status === 409) loadMenu() } finally { setBusy(false) }
  }

  return (
    <div className="backdrop drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Order mo">
        {done ? (
          <div className="sheet">
            <div className="success-banner no-print">✓ Salamat! Natanggap na namin ang order mo. Hintayin ang confirmation ni Chabeng — makikita mo ang status sa “My orders”.</div>
            <Receipt order={done} />
            <div className="row no-print"><button className="btn btn-line" onClick={() => { close(); go('/orders') }}>Tingnan ang My orders</button><button className="btn btn-plum" onClick={close}>Done</button></div>
          </div>
        ) : (
          <div className="sheet">
            <div className="sheet-head"><h2 className="display">Order mo</h2><button type="button" className="x" aria-label="Isara" onClick={close}>×</button></div>
            {cart.lines.length === 0 ? (
              <div className="empty"><span aria-hidden="true">🧁</span><b>Wala pang laman ang order mo.</b><p>Pumili ng treats sa menu.</p><button className="btn btn-plum" onClick={() => { close(); go('/menu') }}>Tingnan ang menu</button></div>
            ) : <>
              <ul className="lines">
                {cart.lines.map((l) => (
                  <li key={l.key} className={l.available ? '' : 'line-gone'}>
                    <span className="ln-name">{l.item}<small>{l.label} · {peso(l.price)}{!l.available && ' · SOLD OUT'}</small></span>
                    <Stepper name={`${l.item} ${l.label}`} n={l.n} onChange={(d) => cart.change(l.item, l.label, d)} />
                    <b className="ln-sum">{peso(l.available ? l.n * l.price : 0)}</b>
                  </li>
                ))}
              </ul>
              <p className="tot"><span>Total</span><span>{peso(cart.total)}</span></p>

              {!user ? (
                <div className="login-gate">
                  <p>Mag-login o gumawa ng account para ma-place ang order. Hindi mawawala ang laman ng order mo.</p>
                  <div className="row"><button className="btn btn-line" onClick={() => { close(); go('/register?next=checkout') }}>Register</button><button className="btn btn-plum" onClick={() => { close(); go('/login?next=checkout') }}>Login</button></div>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <label htmlFor="c-name">Pangalan</label><input id="c-name" value={f.name} onChange={set('name')} required />
                  <label htmlFor="c-contact">Contact number</label><input id="c-contact" value={f.contact} onChange={set('contact')} required inputMode="tel" placeholder="09XXXXXXXXX" />
                  <fieldset className="seg"><legend>Paano mo kukunin?</legend>
                    {['Pickup', 'Delivery'].map((v) => <label key={v} className={f.fulfillment === v ? 'on' : ''}><input type="radio" name="ful" value={v} checked={f.fulfillment === v} onChange={set('fulfillment')} />{v === 'Pickup' ? '🏠 Pickup' : '🛵 Delivery'}</label>)}
                  </fieldset>
                  <label htmlFor="c-addr">{f.fulfillment === 'Delivery' ? 'Complete delivery address' : 'Address / Barangay / City'}</label><input id="c-addr" value={f.address} onChange={set('address')} required minLength={8} placeholder="House/Street, Barangay, Municipality/City" />
                  <label htmlFor="c-date">{f.fulfillment === 'Delivery' ? 'Delivery' : 'Pickup'} date at oras</label>
                  <input id="c-date" type="datetime-local" value={f.date} min={manilaInput(minLeadHours)} onChange={set('date')} required />
                  <small className="hint">Kailangan ng at least {minLeadHours} oras na paghahanda.</small>
                  <fieldset className="seg"><legend>Payment</legend>
                    {['Cash', 'GCash'].map((v) => <label key={v} className={f.payment === v ? 'on' : ''}><input type="radio" name="pay" value={v} checked={f.payment === v} onChange={set('payment')} />{v === 'Cash' ? '💵 Cash' : '📱 GCash'}</label>)}
                  </fieldset>
                  {f.payment === 'GCash' ? <div className="gcash-box"><b>GCash payment</b><p>Send payment to this fixed receiver number:</p><strong className="gcash-number">{GCASH_RECEIVER_NUMBER}</strong><p className="hint">I-check muna ang number bago mag-send. Mag-upload ng screenshot ng successful payment.</p><label htmlFor="gcash-proof">Payment screenshot <span className="required">*</span></label><input id="gcash-proof" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => readProof(e.target.files?.[0])} required={!proof} /><small className="hint">{proofName ? `Napili: ${proofName}` : 'JPG, PNG, o WEBP · automatic na liliitan ang image'}</small>{proof && <img className="proof-preview" src={proof} alt="GCash payment proof preview" />}<button type="button" className="btn btn-sm btn-line" onClick={() => { setProof(''); setProofName('') }}>Alisin ang screenshot</button></div> : <small className="hint">Magbayad ng cash pagkuha{f.fulfillment === 'Delivery' ? ' / pag-deliver' : ''}.</small>}
                  <label htmlFor="c-notes">Notes (optional)</label><textarea id="c-notes" rows="2" value={f.notes} onChange={set('notes')} placeholder="Hal. walang nuts, pakilagay sa gift box" />
                  {error && <p className="form-error" role="alert">{error}</p>}
                  <div className="row"><button type="button" className="btn btn-line" onClick={() => confirm('Burahin lahat ng nasa order?') && cart.clear()}>Burahin lahat</button><button disabled={busy || !cart.count || soldOut.length > 0} className="btn btn-plum">{busy ? 'Ipinapasa…' : `Place order · ${peso(cart.total)}`}</button></div>
                </form>
              )}
            </>}
          </div>
        )}
      </aside>
    </div>
  )
}
