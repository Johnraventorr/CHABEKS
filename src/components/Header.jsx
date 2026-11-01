import { useState } from 'react'
import { useApp } from '../store.jsx'
import { go } from '../hooks/useHash.js'
import { Modal } from './ui.jsx'
import { api } from '../api.js'

export function AccountModal({ onClose }) {
  const { user, setUser, notify } = useApp()
  const [form, setForm] = useState({ name: user.name, contact: user.contact, currentPassword: '', newPassword: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const body = { name: form.name, contact: form.contact }
      if (form.newPassword) { body.currentPassword = form.currentPassword; body.newPassword = form.newPassword }
      const d = await api('/auth/me', { method: 'PATCH', body })
      setUser(d.user); notify('Na-save ang account mo.'); onClose()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <Modal onClose={onClose} title="Account">
      <form className="sheet" onSubmit={submit}>
        <h2 className="display sheet-title">My account</h2>
        <p className="muted">Username: <b>{user.username}</b></p>
        <label htmlFor="ac-name">Pangalan</label><input id="ac-name" value={form.name} onChange={set('name')} required />
        {user.role !== 'admin' && <><label htmlFor="ac-contact">Contact number</label><input id="ac-contact" value={form.contact} onChange={set('contact')} inputMode="tel" required /></>}
        <fieldset className="pw-box"><legend>Palitan ang password (optional)</legend>
          <label htmlFor="ac-cur">Kasalukuyang password</label><input id="ac-cur" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} />
          <label htmlFor="ac-new">Bagong password (6+ characters)</label><input id="ac-new" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} />
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="row"><button type="button" className="btn btn-line" onClick={onClose}>Cancel</button><button className="btn btn-plum" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
      </form>
    </Modal>
  )
}

export default function Header({ path }) {
  const { user, logout, cart, setCartOpen } = useApp()
  const [account, setAccount] = useState(false)
  const link = (to, label) => <a href={`#${to}`} className={path === to ? 'on' : ''} aria-current={path === to ? 'page' : undefined}>{label}</a>
  return (
    <header className="site-head no-print">
      <div className="wrap head-row">
        <a className="brand" href="#/"><img src={`${import.meta.env.BASE_URL}images/logo.jpg`} alt="" width="40" height="40" /><span>Chabakes<small>Freshly baked happiness</small></span></a>
        <nav className="head-nav" aria-label="Main">
          {link('/', 'Home')}{link('/menu', 'Menu')}{user && link('/orders', 'My orders')}
        </nav>
        <div className="head-actions">
          <button className="cart-btn" type="button" onClick={() => setCartOpen(true)} aria-label={`Order mo, ${cart.count} item`}>
            🛍<span>Order</span>{cart.count > 0 && <b>{cart.count}</b>}
          </button>
          {user ? <>
            <button className="btn btn-sm btn-line" type="button" onClick={() => setAccount(true)}>{user.name.split(' ')[0]}</button>
            <button className="btn btn-sm btn-plum" type="button" onClick={logout}>Logout</button>
          </> : <>
            <button className="btn btn-sm btn-line hide-sm" type="button" onClick={() => go('/register')}>Register</button>
            <button className="btn btn-sm btn-plum" type="button" onClick={() => go('/login')}>Login</button>
          </>}
        </div>
      </div>
      {account && <AccountModal onClose={() => setAccount(false)} />}
    </header>
  )
}
