import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string, fallback = true): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : fallback),
    () => fallback,
  )
}

/** ≥1280px: sidebar + main + assistant column, as designed. */
export const WIDE = '(min-width: 1280px)'
/** ≥1024px: sidebar stays; assistant becomes a slide-over. */
export const DESKTOP = '(min-width: 1024px)'
