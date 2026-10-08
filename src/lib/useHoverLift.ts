import { useEffect, type RefObject } from 'react'
import { gsap, prefersReducedMotion } from './motion'

/**
 * Cards lift by a couple of pixels and follow the cursor with a soft
 * spotlight (exposed as --mx/--my for CSS). Only for fine pointers.
 */
export function useHoverLift<T extends HTMLElement>(ref: RefObject<T | null>, { lift = 2, spotlight = true } = {}) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fine = typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!fine || prefersReducedMotion()) return

    const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' })
    const enter = () => {
      yTo(-lift)
      el.dataset.hovered = 'true'
    }
    const leave = () => {
      yTo(0)
      delete el.dataset.hovered
    }
    const move = (e: PointerEvent) => {
      if (!spotlight) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('pointermove', move)
    return () => {
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('pointermove', move)
      gsap.killTweensOf(el)
      gsap.set(el, { clearProps: 'transform' })
    }
  }, [ref, lift, spotlight])
}
