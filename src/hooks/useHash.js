import { useEffect, useState } from 'react'

const parse = () => {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, query = ''] = raw.split('?')
  return { path: path || '/', params: Object.fromEntries(new URLSearchParams(query)) }
}

export const go = (to) => { window.location.hash = to }

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => setRoute(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
