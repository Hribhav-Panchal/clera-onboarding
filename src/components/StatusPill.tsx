import { useRef } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '../lib/motion'
import type { PillState } from '../state/selectors'
import styles from './StatusPill.module.css'

const LABELS: Record<PillState, string> = {
  setup: 'Setting up',
  looking: 'Looking',
  'needs-you': 'Needs you',
  waiting: 'Waiting on them',
  booked: 'Interview booked',
  closed: 'Not moving forward',
}

/** Figma component "Status pill" (241:28120). The dot breathes when the candidate is needed. */
export function StatusPill({ state, className }: { state: PillState; className?: string }) {
  const ring = useRef<HTMLSpanElement>(null)
  const live = state === 'needs-you' || state === 'looking'

  useGSAP(
    () => {
      if (!live || !ring.current || prefersReducedMotion()) return
      gsap.fromTo(
        ring.current,
        { scale: 1, opacity: 0.55 },
        { scale: 2.6, opacity: 0, duration: 1.6, ease: 'power2.out', repeat: -1, repeatDelay: 0.6 },
      )
    },
    { dependencies: [live] },
  )

  return (
    <span className={`${styles.pill} ${styles[state]} ${className ?? ''}`}>
      <span className={styles.dot} aria-hidden>
        {live ? <span ref={ring} className={styles.ring} /> : null}
      </span>
      <span className={styles.label}>{LABELS[state]}</span>
    </span>
  )
}
