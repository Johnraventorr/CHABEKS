import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { go } from '../hooks/useHash.js'
import { useApp } from '../store.jsx'
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { firebaseAuth, googleProvider } from '../firebase.js'

function firebaseErrorMessage(e) {
  const code = e?.code || ''
  if (code === 'auth/api-key-not-valid' || code === 'auth/invalid-api-key' || /api-key-not-valid|API key not valid/i.test(e?.message || '')) return 'Hindi tinatanggap ng Firebase ang API key. Kopyahin ang eksaktong Web API key sa Firebase Console → Project settings → Your apps. Ilagay sa .env bilang VITE_FIREBASE_API_KEY at i-restart ang npm run dev. Suriin din kung disabled o restricted ang key sa Google Cloud Console.'
  if (code === 'auth/unauthorized-domain') return 'Idagdag ang kasalukuyang domain sa Firebase Console → Authentication → Settings → Authorized domains.'
  if (code === 'auth/operation-not-allowed') return 'I-enable ang Google provider sa Firebase Console → Authentication → Sign-in method.'
  if (code === 'auth/popup-closed-by-user') return 'Isinara ang Google login bago matapos. Subukan ulit.'
  if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') return 'Binuksan ang Google login sa redirect mode. Sundin ang Google sign-in page.'
  return e?.message || 'Hindi gumana ang Google login. Suriin ang Firebase Authentication settings.'
}

export default function Auth({ mode, params }) {
  const { login, setCartOpen, notify } = useApp()
  const reg = mode === 'register'
  const [showPassword, setShowPassword] = useState(false)
  const [f, setF] = useState({ name: '', username: '', email: '', contact: '', street: '', barangay: '', municipality: '', province: '', postalCode: '', landmark: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  useEffect(() => {
    if (reg) return
    let active = true
    getRedirectResult(firebaseAuth).then(async (result) => {
      if (!result || !active) return
      setBusy(true)
      const credential = await result.user.getIdToken(true)
      const res = await api('/auth/google', { method: 'POST', body: { credential } })
      if (active) finishLogin(res, `Welcome sa Chabakes, ${res.user.name.split(' ')[0]}!`)
    }).catch((e) => { if (active) setError(firebaseErrorMessage(e)) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [reg])

  function finishLogin(res, welcome = 'Welcome sa Chabakes!') {
    login(res)
    notify(welcome)
    if (res.user.role === 'admin') go('/admin')
    else if (params.next === 'checkout') { go('/menu'); setCartOpen(true) }
    else go(params.next === 'orders' ? '/orders' : '/menu')
  }

  async function googleLogin() {
    setBusy(true); setError('')
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider)
      const credential = await result.user.getIdToken(true)
      const res = await api('/auth/google', { method: 'POST', body: { credential } })
      finishLogin(res, `Welcome sa Chabakes, ${res.user.name.split(' ')[0]}!`)
    } catch (e) {
      const code = e?.code || ''
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try { await signInWithRedirect(firebaseAuth, googleProvider); return }
        catch (redirectError) { setError(firebaseErrorMessage(redirectError)) }
      } else setError(firebaseErrorMessage(e))
    } finally { setBusy(false) }
  }

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      if (reg && f.password !== f.confirmPassword) throw new Error('Hindi magkapareho ang password at confirmation.')
      const address = reg ? [f.street, `Barangay ${f.barangay}`, f.municipality, f.province, f.postalCode, f.landmark ? `Landmark: ${f.landmark}` : ''].filter(Boolean).join(', ') : ''
      const payload = reg ? { name: f.name, username: f.username, email: f.email, contact: f.contact, address, street: f.street, barangay: f.barangay, municipality: f.municipality, province: f.province, postalCode: f.postalCode, landmark: f.landmark, password: f.password } : { username: f.username, password: f.password }
      const res = await api(reg ? '/auth/register' : '/auth/login', { method: 'POST', body: payload })
      finishLogin(res, reg ? `Welcome sa Chabakes, ${res.user.name.split(' ')[0]}!` : `Welcome back, ${res.user.name.split(' ')[0]}!`)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const q = params.next ? `?next=${params.next}` : ''
  return (
    <div className="auth-screen">
      <div className="auth-card auth-card-wide">
        <img src={`${import.meta.env.BASE_URL}images/logo.jpg`} alt="Chabakes logo" width="72" height="72" />
        <p className="eyebrow dark">Freshly baked happiness</p>
        <h1>{reg ? 'Gumawa ng account' : 'Welcome back!'}</h1>
        <p className="muted">{reg ? 'Kumpletuhin ang contact at address para maihatid nang tama ang order.' : 'Mag-login para mag-order at makita ang mga order mo.'}</p>
        <div className="google-login-wrap"><button type="button" className="google-login-button google-login-action" onClick={googleLogin} disabled={busy}><span className="google-g">G</span> Magpatuloy gamit ang Google</button><p className="auth-divider"><span>o gumamit ng account</span></p></div>
        <form onSubmit={submit}>
          {reg && <>
            <label htmlFor="a-name">Buong pangalan</label><input id="a-name" value={f.name} onChange={set('name')} required autoComplete="name" maxLength={60} />
            <label htmlFor="a-email">Email address</label><input id="a-email" type="email" value={f.email} onChange={set('email')} required autoComplete="email" placeholder="name@example.com" />
          </>}
          <label htmlFor="a-user">Username</label><input id="a-user" value={f.username} onChange={set('username')} required autoComplete="username" autoCapitalize="none" minLength={3} maxLength={30} />
          {reg && <>
            <label htmlFor="a-contact">Contact number</label><input id="a-contact" value={f.contact} onChange={set('contact')} required inputMode="tel" placeholder="09XXXXXXXXX" autoComplete="tel" />
            <div className="auth-field-grid">
              <div className="field-span"><label htmlFor="a-street">House No. / Street / Sitio</label><input id="a-street" value={f.street} onChange={set('street')} required placeholder="House no., street, sitio" autoComplete="street-address" /></div>
              <div><label htmlFor="a-barangay">Barangay</label><input id="a-barangay" value={f.barangay} onChange={set('barangay')} required /></div>
              <div><label htmlFor="a-municipality">Municipality / City</label><input id="a-municipality" value={f.municipality} onChange={set('municipality')} required /></div>
              <div><label htmlFor="a-province">Province</label><input id="a-province" value={f.province} onChange={set('province')} required /></div>
              <div><label htmlFor="a-postal">Postal code (optional)</label><input id="a-postal" value={f.postalCode} onChange={set('postalCode')} inputMode="numeric" /></div>
              <div className="field-span"><label htmlFor="a-landmark">Landmark / delivery notes (optional)</label><input id="a-landmark" value={f.landmark} onChange={set('landmark')} placeholder="Malapit sa…" /></div>
            </div>
          </>}
          <label htmlFor="a-pass">Password</label>
          <div className="password-field"><input id="a-pass" type={showPassword ? 'text' : 'password'} value={f.password} onChange={set('password')} required minLength={reg ? 8 : undefined} autoComplete={reg ? 'new-password' : 'current-password'} /><button type="button" className="password-toggle" aria-label={showPassword ? 'Itago ang password' : 'Ipakita ang password'} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div>
          {reg && <><label htmlFor="a-confirm">Kumpirmahin ang password</label><div className="password-field"><input id="a-confirm" type={showPassword ? 'text' : 'password'} value={f.confirmPassword} onChange={set('confirmPassword')} required minLength={8} autoComplete="new-password" /><button type="button" className="password-toggle" aria-label={showPassword ? 'Itago ang password' : 'Ipakita ang password'} onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div><small className="muted">Gumamit ng hindi bababa sa 8 characters.</small></>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-plum btn-block" disabled={busy}>{busy ? 'Sandali…' : reg ? 'Gumawa ng account' : 'Login'}</button>
        </form>
        <a className="text-link" href={`#/${reg ? 'login' : 'register'}${q}`}>{reg ? 'May account na? Login' : 'Wala pang account? Register'}</a>
      </div>
    </div>
  )
}
