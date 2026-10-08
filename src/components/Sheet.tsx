import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { gsap, prefersReducedMotion } from '../lib/motion'
import styles from './Sheet.module.css'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Side sheet with GSAP enter/exit, focus trap, Escape to close, scroll
 * lock and focus restoration. Used for the mobile nav and the assistant
 * on narrower screens.
 */
export function Sheet({
  open,
  onClose,
  side = 'right',
  width = 360,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  width?: number
  label: string
  children: ReactNode
}) {
  const [mounted, setMounted] = useState(open)
  const panel = useRef<HTMLDivElement>(null)
  const backdrop = useRef<HTMLDivElement>(null)
  const restore = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      restore.current = document.activeElement as HTMLElement
      setMounted(true)
    }
  }, [open])

  useEffect(() => {
    if (!mounted) return
    const p = panel.current
    const b = backdrop.current
    if (!p || !b) return
    const from = side === 'right' ? 100 : -100
    if (open) {
      document.body.style.overflow = 'hidden'
      if (prefersReducedMotion()) gsap.set([p, b], { clearProps: 'all' })
      else {
        gsap.fromTo(b, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 })
        gsap.fromTo(p, { xPercent: from }, { xPercent: 0, duration: 0.45, ease: 'power4.out' })
      }
      const first = p.querySelector<HTMLElement>('[data-autofocus]') ?? p.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    } else {
      const done = () => {
        setMounted(false)
        document.body.style.overflow = ''
        restore.current?.focus?.()
      }
      if (prefersReducedMotion()) done()
      else {
        gsap.to(b, { autoAlpha: 0, duration: 0.2 })
        gsap.to(p, { xPercent: from, duration: 0.3, ease: 'power3.in', onComplete: done })
      }
    }
  }, [open, mounted, side])

  useEffect(() => () => void (document.body.style.overflow = ''), [])

  if (!mounted) return null

  return createPortal(
    <div className={styles.root}>
      <div ref={backdrop} className={styles.backdrop} onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`${styles.panel} ${styles[side]}`}
        style={{ width: `min(${width}px, 100vw)` }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onClose()
            return
          }
          if (e.key !== 'Tab') return
          const items = Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
          if (items.length === 0) return
          const first = items[0]
          const last = items[items.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
