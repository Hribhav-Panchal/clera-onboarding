import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '../lib/motion'

/** Counts from 0 to `value` the first time it scrolls into view. */
export function CountUp({ value, duration = 0.9, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      el.textContent = `${value}${suffix}`
      return
    }
    const counter = { n: 0 }
    let tween: gsap.core.Tween | null = null
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        tween = gsap.to(counter, {
          n: value,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = `${Math.round(counter.n)}${suffix}`
          },
        })
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      tween?.kill()
      el.textContent = `${value}${suffix}`
    }
  }, [value, duration, suffix])

  // Server/initial render shows the final number so nothing is ever wrong if JS is slow.
  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {value}
      {suffix}
    </span>
  )
}
