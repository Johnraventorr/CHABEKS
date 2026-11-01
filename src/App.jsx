import { useEffect } from 'react'
import { go, useRoute } from './hooks/useHash.js'
import { useApp } from './store.jsx'
import Header from './components/Header.jsx'
import CartPanel from './components/CartPanel.jsx'
import { Toast } from './components/ui.jsx'
import Landing from './pages/Landing.jsx'
import Auth from './pages/Auth.jsx'
import MenuPage from './pages/Menu.jsx'
import MyOrders from './pages/MyOrders.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  const { user, booting, menu, cart, setCartOpen, toast } = useApp()
  const { path, params } = useRoute()

  // Route guards
  useEffect(() => {
    if (booting) return
    if (path === '/admin' && user?.role !== 'admin') go(user ? '/menu' : '/login')
    if (user && (path === '/login' || path === '/register')) go('/menu')
  }, [path, user, booting])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [path])

  if (booting) return <div className="boot">Sandali lang…</div>

  if (user?.role === 'admin') return <><Admin /><Toast toast={toast} /></>

  let page
  if (path === '/login' || path === '/register') page = <Auth key={path} mode={path === '/login' ? 'login' : 'register'} params={params} />
  else if (path === '/menu') page = <MenuPage params={params} />
  else if (path === '/orders') page = <MyOrders />
  else page = menu ? <Landing /> : <div className="boot">Kinukuha ang menu…</div>

  return (
    <>
      <Header path={path} />
      <main>{page}</main>
      <footer className="foot no-print"><img src={`${import.meta.env.BASE_URL}images/logo.jpg`} alt="" width="36" height="36" /><span>Chabakes · Freshly Baked Happiness</span></footer>
      <div className={`bar no-print${cart.count && path !== '/orders' ? ' show' : ''}`}>
        <button type="button" onClick={() => setCartOpen(true)} tabIndex={cart.count ? 0 : -1}><span>{cart.count} item{cart.count > 1 ? 's' : ''} sa order</span><span className="bar-total">Tingnan ang order →</span></button>
      </div>
      <CartPanel />
      <Toast toast={toast} />
    </>
  )
}
