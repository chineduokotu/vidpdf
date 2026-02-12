/**
 * Central API configuration.
 * Set VITE_API_BASE_URL in .env for your backend (e.g. http://localhost:3001).
 */

export const API_BASE_URL = /*import.meta.env.VITE_API_BASE_URL ?? ''*/ 'http://localhost:3001'

export function apiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : ''
}
