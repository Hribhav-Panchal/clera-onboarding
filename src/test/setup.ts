import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom has no layout or media queries. Report reduced motion so GSAP
// choreography resolves instantly, and a wide viewport for the shell.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('prefers-reduced-motion') || query.includes('min-width'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})

if (!globalThis.CSS?.escape) {
  ;(globalThis as unknown as { CSS: { escape: (s: string) => string } }).CSS = {
    escape: (s: string) => s.replace(/["\\]/g, '\\$&'),
  }
}

Element.prototype.scrollIntoView = function () {}
Element.prototype.scrollTo = function () {} as typeof Element.prototype.scrollTo

afterEach(() => {
  cleanup()
  localStorage.clear()
})
