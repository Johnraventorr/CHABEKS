export const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH')

// Gumagana kahit hindi sa root ng domain naka-host ang app.
export const img = (name) => `${import.meta.env.BASE_URL}images/${name}.jpg`

export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) : '—'
export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' }) : '—'

/** Value para sa <input type="datetime-local"> sa oras ng Manila, X oras mula ngayon. */
export const manilaInput = (hoursAhead = 0) => new Date(Date.now() + hoursAhead * 3600e3 + 8 * 3600e3).toISOString().slice(0, 16)

export const FLOW = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed']
export const NEXT_ACTION = { Pending: ['Confirmed', 'Confirm order'], Confirmed: ['Preparing', 'Start preparing'], Preparing: ['Ready', 'Mark ready'], Ready: ['Completed', 'Complete'] }
export const statusClass = (s) => `status status-${String(s).toLowerCase()}`
export const readyLabel = (o) => (o.fulfillment === 'Delivery' ? 'Out for delivery' : 'Ready for pickup')
export const statusLabel = (o) => (o.status === 'Ready' ? readyLabel(o) : o.status)

export const lowestPrice = (items) => Math.min(...items.flatMap((it) => it.opts.map((o) => o.price)))

export const downloadCsv = (filename, rows) => {
  const q = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`
  const csv = '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
