import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store.jsx'
import { Stepper } from '../components/ui.jsx'
import { img, peso } from '../utils.js'

function Dish({ item, shape }) {
  const { cart } = useApp()
  const allGone = item.opts.every((o) => !o.available)
  return (
    <article className={`dish${allGone ? ' gone' : ''}`}>
      <img className={`dish-img ${shape}`} src={img(item.img)} alt={item.name} loading="lazy" />
      <div className="dish-body">
        <h3>{item.name}</h3>
        {item.desc && <p>{item.desc}</p>}
        <ul className="opts">
          {item.opts.map((o) => {
            const n = cart.countOf(item.name, o.label)
            return (
              <li key={o.label}>
                <span className="opt-label">{o.label}</span>
                <span className="leader" aria-hidden="true" />
                <b className="opt-price">{peso(o.price)}</b>
                {!o.available ? <span className="soldout">Sold out</span>
                  : <Stepper name={`${item.name} ${o.label}`} n={n} onChange={(d) => cart.change(item.name, o.label, d)} />}
              </li>
            )
          })}
        </ul>
      </div>
    </article>
  )
}

export default function MenuPage({ params }) {
  const { menu, menuError, loadMenu } = useApp()
  const [active, setActive] = useState('')
  const pills = useRef(null)

  // Scroll-spy at pag-scroll sa ?cat=
  useEffect(() => {
    if (!menu) return
    const els = menu.map((c) => document.getElementById(c.id)).filter(Boolean)
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (vis) setActive(vis.target.id)
    }, { rootMargin: '-120px 0px -60% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [menu])
  useEffect(() => { if (menu && params.cat) setTimeout(() => document.getElementById(params.cat)?.scrollIntoView({ behavior: 'smooth' }), 50) }, [menu, params.cat])
  useEffect(() => {
    const el = pills.current?.querySelector('[aria-current="true"]')
    if (el) pills.current.scrollTo({ left: el.offsetLeft - pills.current.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' })
  }, [active])

  if (menuError) return <div className="wrap state"><p className="connection-alert">{menuError}</p><button className="btn btn-plum" onClick={loadMenu}>Subukan ulit</button></div>
  if (!menu) return <div className="wrap state"><p className="muted">Kinukuha ang menu…</p></div>

  return (
    <div className="menu">
      <div className="menu-head wrap"><p className="eyebrow dark">Our menu</p><h1 className="display">Fresh from the oven</h1><p className="muted">Pumili ng dami gamit ang + at −. Mga presyo ay nasa peso.</p></div>
      <nav className="cats" aria-label="Mga kategorya ng menu">
        <div className="wrap" ref={pills}>
          {menu.map((c) => <a key={c.id} href={`#/menu?cat=${c.id}`} aria-current={active === c.id ? 'true' : undefined}>{c.title}</a>)}
        </div>
      </nav>
      <div className="wrap">
        {menu.map((c) => (
          <section key={c.id} id={c.id} className="cat">
            <h2 className="display">{c.title}</h2>
            {c.note && <p className="note">{c.note}</p>}
            <div className="dishes">{c.items.map((it) => <Dish key={it.name} item={it} shape={c.shape} />)}</div>
          </section>
        ))}
      </div>
    </div>
  )
}
