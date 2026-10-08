import { Check, Minus } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { FitReason } from '../data/types'
import { gsap, prefersReducedMotion } from '../lib/motion'
import { CountUp } from './CountUp'
import styles from './FitPill.module.css'

export function fitTone(fit: number): 'high' | 'mid' | 'low' {
  return fit >= 80 ? 'high' : fit >= 65 ? 'mid' : 'low'
}

/**
 * "86% fit". With `reasons` it becomes a disclosure: hover, focus or tap
 * shows "Why 86 percent" (R1 · "Fit with hover").
 */
export function FitPill({
  fit,
  reasons,
  improveHref,
  size = 'md',
}: {
  fit: number
  reasons?: FitReason[]
  improveHref?: string
  size?: 'md' | 'lg'
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const id = useId()
  const tone = fitTone(fit)
  const interactive = Boolean(reasons?.length)

  useEffect(() => {
    const el = pop.current
    if (!el) return
    if (prefersReducedMotion()) {
      gsap.set(el, { autoAlpha: open ? 1 : 0 })
      return
    }
    if (open) {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: -6, scale: 0.96 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: 'power3.out' },
      )
      gsap.fromTo(el.querySelectorAll('li'), { x: -6, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.05, duration: 0.25, delay: 0.05 })
    } else {
      gsap.to(el, { autoAlpha: 0, y: -4, scale: 0.98, duration: 0.16, ease: 'power2.in' })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const pill = (
    <span className={`${styles.pill} ${styles[tone]} ${styles[size]}`}>
      <CountUp value={fit} suffix="%" /> fit
    </span>
  )

  if (!interactive) return <span aria-label={`${fit} percent fit`}>{pill}</span>

  const show = () => {
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const hide = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), 120)
  }

  return (
    <div
      ref={wrap}
      className={styles.wrap}
      onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && hide()}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${fit} percent fit. Show why`}
        onClick={() => setOpen((o) => !o)}
        onFocus={show}
        onBlur={(e) => {
          if (!wrap.current?.contains(e.relatedTarget as Node)) hide()
        }}
      >
        {pill}
      </button>
      <div ref={pop} id={id} role="dialog" aria-label={`Why ${fit} percent`} className={styles.popover}>
        <p className={styles.popTitle}>Why {fit} percent</p>
        <ul className={styles.reasons}>
          {reasons!.map((r) => (
            <li key={r.text} className={styles.reason}>
              {r.kind === 'match' ? (
                <Check size={14} strokeWidth={2} className={styles.check} aria-label="Matches" />
              ) : (
                <Minus size={14} strokeWidth={2} className={styles.minus} aria-label="Gap" />
              )}
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
        {improveHref ? (
          <Link to={improveHref} className={`link ${styles.improve}`}>
            Improve my CV for this role →
          </Link>
        ) : null}
      </div>
    </div>
  )
}
