import { useApp } from '../store.jsx'
import { go } from '../hooks/useHash.js'
import { img, lowestPrice, peso } from '../utils.js'

const FAVORITES = [['OG Choco Chip', 'per piece'], ['Red Velvet', 'per piece'], ['Biscoff Dream', 'per piece'], ['Choconana', '400 g']]

export default function Landing() {
  const { menu, index, cart } = useApp()
  const favs = FAVORITES.map(([name, label]) => ({ name, label, ...index.get(`${name}|${label}`) })).filter((f) => f.price)
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Freshly baked · Made with care</p>
            <h1>Good days start<br /><em>with something sweet.</em></h1>
            <p>Discover freshly baked cookies, banana loaves, cinnamon rolls, brownies, and more. Choose your favorites and order online for pickup or delivery.</p>
            <div className="hero-cta">
              <a className="btn btn-butter" href="#/menu">Shop our treats <span aria-hidden="true">→</span></a>
              <a className="btn btn-ghost" href="#how">How to order</a>
            </div>
            <ul className="trust"><li>✦ Freshly baked</li><li>✦ Small-batch treats</li><li>✦ Pickup or delivery</li></ul>
          </div>
          <div className="tray" aria-label="Featured freshly baked treats">
            <img className="cookie c1" src={img('og')} alt="Chocolate chip cookie" />
            <img className="cookie c2" src={img('biscoff')} alt="Biscoff cookie" />
            <img className="cookie c3" src={img('smore')} alt="S'mores cookie" />
            <div className="sticker"><b>Box of 6</b><span>{peso(300)}</span></div>
          </div>
        </div>
      </section>

      <section className="shop-intro wrap">
        <div><span className="shop-kicker">THE CHABAKES SHOP</span><h2 className="display">A little treat for every craving.</h2><p>Browse the menu, find your new favorite, and place your order in just a few clicks.</p></div>
        <a className="shop-link" href="#/menu">View all treats <span aria-hidden="true">→</span></a>
      </section>

      {menu && <section className="wrap band category-band" aria-labelledby="bake-h">
        <h2 id="bake-h" className="display">Shop by category</h2>
        <p className="section-note">Explore the freshly baked goodies available today.</p>
        <ul className="tiles">
          {menu.map((c) => (
            <li key={c.id}>
              <a href={`#/menu?cat=${c.id}`} className="tile">
                <img className={`tile-img ${c.shape}`} src={img(c.cover)} alt={c.title} loading="lazy" />
                <span className="tile-name">{c.title}</span>
                <span className="tile-price">Starting at {peso(lowestPrice(c.items))}</span>
                <span className="tile-shop-cta">Explore category →</span>
              </a>
            </li>
          ))}
        </ul>
      </section>}

      {favs.length > 0 && <section className="featured-section">
        <div className="wrap band">
          <p className="eyebrow dark">CUSTOMER FAVORITES</p>
          <h2 className="display">Popular picks</h2>
          <p className="section-note">A few customer-loved treats worth trying.</p>
          <div className="fav-grid">
            {favs.map((f) => (
              <article key={f.name} className="fav">
                <div className="fav-image-wrap"><img src={img(f.img)} alt={f.name} loading="lazy" /></div>
                <h3>{f.name}</h3>
                <p>{peso(f.price)} <small>/ {f.label}</small></p>
                <button type="button" className="btn btn-sm btn-plum" disabled={!f.available} onClick={() => cart.change(f.name, f.label, 1)}>{f.available ? '＋ Add to order' : 'Sold out'}</button>
              </article>
            ))}
          </div>
        </div>
      </section>}

      <section id="how" className="how">
        <div className="wrap">
          <p className="eyebrow dark">SIMPLE AND EASY</p>
          <h2 className="display">How to order</h2>
          <ol className="steps">
            <li><span className="step-n" aria-hidden="true">1</span><h3>Choose your treats</h3><p>Browse the menu and add your favorite cookies, loaves, pastries, or brownies to your order.</p></li>
            <li><span className="step-n" aria-hidden="true">2</span><h3>Place your order</h3><p>Sign in, provide your contact details, choose pickup or delivery, and select your payment method.</p></li>
            <li><span className="step-n" aria-hidden="true">3</span><h3>Track and enjoy</h3><p>Follow your order status and get your freshly baked treats when they are ready.</p></li>
          </ol>
          <button className="btn btn-plum how-cta" type="button" onClick={() => go('/menu')}>Start shopping</button>
        </div>
      </section>

      <section className="wrap thanks">
        <img src={img('gnome')} alt="Chabakes bakery mascot" loading="lazy" />
        <div>
          <p className="eyebrow dark">MADE WITH LOVE</p>
          <h2 className="display">Thank you for supporting our shop.</h2>
          <p>Every order means a lot. We hope our freshly baked treats make your day a little sweeter.</p>
          <p className="sign">With love, Chabakes</p>
        </div>
      </section>
      <section className="store-details">
        <div className="wrap store-details-inner">
          <div><span className="store-label">OUR BRANCH</span><strong>Mansalay, Oriental Mindoro</strong><span>Serving freshly baked happiness from our local branch.</span></div>
          <div><span className="store-label">WEBSITE DEVELOPED BY</span><strong>JOHN RAVEN TORRELIZA</strong><span>Chabakes online shop</span></div>
        </div>
      </section>
    </>
  )
}
