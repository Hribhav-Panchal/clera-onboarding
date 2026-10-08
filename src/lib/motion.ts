import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(useGSAP, SplitText)

gsap.defaults({ ease: 'power3.out', duration: 0.45 })

/** Shared easing vocabulary so every interaction feels like the same product. */
export const ease = {
  out: 'power3.out',
  inOut: 'power2.inOut',
  spring: 'back.out(1.7)',
  soft: 'elastic.out(1, 0.6)',
} as const

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export { gsap, useGSAP, SplitText }
