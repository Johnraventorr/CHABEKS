import { useEffect, useRef } from 'react'
import { FLOW, fmtDateTime, peso, statusClass, statusLabel } from '../utils.js'

export function Stepper({ name, n, onChange, max = 100 }) {
  return (
    <span className="stepper">
      <button type="button" aria-label={`Bawas: ${name}`} disabled={!n} onClick={() => onChange(-1)}>−</button>
      <output aria-label={`Dami: ${name}`}>{n}</output>
      <button type="button" aria-label={`Dagdag: ${name}`} disabled={n >= max} onClick={() => onChange(1)}>+</button>
    </span>
  )
}

export const StatusBadge = ({ order }) => <span className={statusClass(order.status)}>{statusLabel(order)}</span>

export function PayBadge({ order }) {
  return <span className={`pay ${order.paid ? 'pay-paid' : 'pay-unpaid'}`}>{order.payment} · {order.paid ? 'Paid' : 'Unpaid'}</span>
}

export function Toast({ toast }) {
  if (!toast) return null
  return <div className={`toast toast-${toast.kind}`} role="status" aria-live="polite" key={toast.id}>{toast.message}</div>
}

/** Accessible modal na may Escape-to-close at focus. */
export function Modal({ onClose, title, children, wide, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const prev = document.activeElement
    ref.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll'); prev?.focus?.() }
  }, [onClose])
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <button className="x no-print" type="button" aria-label="Isara" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  )
}

export function Timeline({ order }) {
  if (order.status === 'Cancelled') {
    const at = order.history?.find((h) => h.status === 'Cancelled')?.at
    return <p className="tl-cancelled">✕ Na-cancel {at ? `· ${fmtDateTime(at)}` : ''}</p>
  }
  const idx = FLOW.indexOf(order.status)
  return (
    <ol className="timeline" aria-label="Order progress">
      {FLOW.map((s, i) => (
        <li key={s} className={i < idx ? 'done' : i === idx ? 'now' : ''}>
          <i aria-hidden="true">{i < idx ? '✓' : i + 1}</i>
          <span>{s === 'Ready' ? (order.fulfillment === 'Delivery' ? 'Out for delivery' : 'Ready') : s}</span>
        </li>
      ))}
    </ol>
  )
}

export function Receipt({ order, onClose }) {
  return (
    <div className="receipt print-area">
      <div className="receipt-top">
        <img src={`${import.meta.env.BASE_URL}images/logo.jpg`} alt="" width="56" height="56" />
        <p className="eyebrow">Order receipt</p>
        <h2 className="display">Chabakes</h2>
        <p className="receipt-sub">Freshly Baked Happiness</p>
        <h3 className="receipt-no">{order.receiptNo}</h3>
        <StatusBadge order={order} />
      </div>
      <dl className="receipt-meta">
        <div><dt>Customer</dt><dd>{order.customer}</dd></div>
        <div><dt>Contact</dt><dd>{order.contact}</dd></div>
        <div><dt>{order.fulfillment === 'Delivery' ? 'Delivery date' : 'Pickup date'}</dt><dd>{fmtDateTime(order.pickupAt)}</dd></div>
        {order.address && <div><dt>{order.fulfillment === 'Delivery' ? 'Delivery address' : 'Customer location'}</dt><dd>{order.address}</dd></div>}
        <div><dt>Payment</dt><dd>{order.payment} · {order.paid ? 'Paid' : 'Unpaid'}</dd></div>
        <div><dt>Ordered</dt><dd>{fmtDateTime(order.createdAt)}</dd></div>
      </dl>
      <table className="receipt-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
        <tbody>{order.items.map((it, i) => <tr key={i}><td>{it.item}<small>{it.label} · {peso(it.price)}</small></td><td>{it.n}</td><td>{peso(it.n * it.price)}</td></tr>)}</tbody>
      </table>
      <p className="tot"><span>TOTAL</span><span>{peso(order.total)}</span></p>
      {order.notes && <p className="receipt-notes">Note: {order.notes}</p>}
      <p className="receipt-thanks">Salamat sa pag-order sa Chabakes! ♡</p>
      <div className="row no-print">
        <button className="btn btn-line" type="button" onClick={() => window.print()}>🖨 Print receipt</button>
        {onClose && <button className="btn btn-plum" type="button" onClick={onClose}>Done</button>}
      </div>
    </div>
  )
}
