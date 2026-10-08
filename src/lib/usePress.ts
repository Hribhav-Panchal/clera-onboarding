import { useEffect, type RefObject } from 'react'
import { gsap, prefersReducedMotion } from './motion'

/**
 * Tactile press feedback: squash on pointer/keyboard down, spring back on
 * release. Works for any element and is a no-op under reduced motion.
 */
export function usePress<T extends HTMLElement>(ref: RefObject<T | null>, { scale = 0.97, disabled = false } = {}) {
  useEffect(() => {
    const el = ref.current
    if (!el || disabled || prefersReducedMotion()) return

    const down = () => gsap.to(el, { scale, duration: 0.12, ease: 'power2.out', overwrite: 'auto' })
    const up = () => gsap.to(el, { scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' })
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) down()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') up()
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointerleave', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('keydown', onKeyDown)
    el.addEventListener('keyup', onKeyUp)
    el.addEventListener('blur', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointerleave', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('keydown', onKeyDown)
      el.removeEventListener('keyup', onKeyUp)
      el.removeEventListener('blur', up)
      gsap.killTweensOf(el)
      gsap.set(el, { clearProps: 'transform' })
    }
  }, [ref, scale, disabled])
}
