const TOKEN_KEY = 'chabakes-token-v2'
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* private mode */ } }

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

/** Lahat ng tawag sa server dumadaan dito: nilalagay ang login token at ginagawang malinaw ang error message. */
export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken()
  let res
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Hindi makakonekta sa server. Suriin ang API server at VITE_API_BASE_URL configuration.', 0)
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event('chabakes:unauthorized'))
    throw new ApiError(data?.error || 'May problema. Subukan ulit.', res.status)
  }
  return data
}
