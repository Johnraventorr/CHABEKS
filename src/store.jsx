import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, setToken, getToken } from './api.js'
import { go } from './hooks/useHash.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const CART_KEY = 'chabakes-cart-v2'
const loadCart = () => { try { const value = JSON.parse(localStorage.getItem(CART_KEY)); return value && typeof value === 'object' && !Array.isArray(value) ? value : {} } catch { return {} } }

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(() => Boolean(getToken()))
  const [menu, setMenu] = useState(null)          // categories galing sa server (kasama ang presyo/availability)
  const [menuError, setMenuError] = useState('')
  const [minLeadHours, setLead] = useState(3)
  const [qty, setQty] = useState(loadCart)         // { 'Item|label': { item, label, n } }
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(0)

  const notify = useCallback((message, kind = 'ok') => {
    setToast({ message, kind, id: Date.now() })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4200)
  }, [])

  const loadMenu = useCallback(async () => {
    try { const d = await api('/menu'); setMenu(d.categories); setLead(d.minLeadHours); setMenuError('') }
    catch (e) { setMenuError(e.message) }
  }, [])

  // ---- session ----
  useEffect(() => {
    loadMenu()
    if (!getToken()) return
    api('/auth/me').then((d) => setUser(d.user)).catch((e) => { if (e.status === 401) setToken(null) }).finally(() => setBooting(false))
  }, [loadMenu])

  const login = useCallback((res) => { setToken(res.token); setUser(res.user) }, [])
  const logout = useCallback(() => { setToken(null); setUser(null); setCartOpen(false); go('/') }, [])
  useEffect(() => {
    const on = () => { setToken(null); setUser(null); notify('Na-expire ang login mo. Mag-login ulit.', 'err'); go('/login') }
    window.addEventListener('chabakes:unauthorized', on)
    return () => window.removeEventListener('chabakes:unauthorized', on)
  }, [notify])

  // ---- cart ----
  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(qty)) } catch { /* private mode */ } }, [qty])

  const index = useMemo(() => {
    const m = new Map()
    for (const c of menu || []) for (const it of c.items) for (const o of it.opts) m.set(`${it.name}|${o.label}`, { item: it.name, label: o.label, price: o.price, available: o.available, img: it.img })
    return m
  }, [menu])

  const change = useCallback((item, label, delta) => {
    const key = `${item}|${label}`
    const product = index.get(key)
    setQty((q) => {
      const old = q[key] || {}
      const current = Number.isFinite(Number(old.n)) ? Number(old.n) : 0
      const n = Math.max(0, Math.min(100, current + delta))
      const { [key]: _old, ...rest } = q
      // Itabi rin ang huling presyo at image para hindi biglang mawala ang cart
      // habang naglo-load/reconnect ang menu API. Fresh server price pa rin ang gamit kapag loaded.
      return n ? { ...rest, [key]: { item, label, n, price: product?.price ?? old.price ?? 0, img: product?.img ?? old.img ?? '', available: product?.available ?? old.available ?? true } } : rest
    })
  }, [index])
  const addMany = useCallback((items) => setQty((q) => {
    const next = { ...q }
    for (const i of items) { const key = `${i.item}|${i.label}`; const product = index.get(key); const n = Math.min(100, Math.max(0, Number(next[key]?.n) || 0) + Math.max(0, Number(i.n) || 0)); if (n) next[key] = { item: i.item, label: i.label, n, price: product?.price ?? next[key]?.price ?? 0, img: product?.img ?? next[key]?.img ?? '', available: product?.available ?? next[key]?.available ?? true } }
    return next
  }), [index])
  const clear = useCallback(() => setQty({}), [])

  const lines = useMemo(() => Object.entries(qty).map(([key, l]) => {
    const m = index.get(key)
    // Huwag itago ang cart line habang hindi pa tapos mag-load ang menu.
    if (m) return { key, ...l, price: m.price, available: m.available, img: m.img }
    if (!menu && l && Number(l.n) > 0) return { key, ...l, n: Number(l.n), price: Number(l.price) || 0, available: l.available !== false, img: l.img || '' }
    return null
  }).filter(Boolean), [qty, index, menu])
  const count = lines.reduce((s, l) => s + l.n, 0)
  const total = lines.reduce((s, l) => s + (l.available ? l.n * l.price : 0), 0)
  const countOf = useCallback((item, label) => qty[`${item}|${label}`]?.n || 0, [qty])

  const value = { user, booting, login, logout, setUser, menu, menuError, loadMenu, minLeadHours, index, notify, toast, cartOpen, setCartOpen, cart: { lines, count, total, change, addMany, clear, countOf } }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
