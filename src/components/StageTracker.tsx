import { useRef } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '../lib/motion'
import { STAGE_STEPS } from '../state/selectors'
import styles from './StageTracker.module.css'

/**
 * Four-step progress: Requested → Waiting → Replied → Booked.
 * `current` is the index of the active step (-1 = not requested yet).
 * When `closed`, everything renders muted and nothing is "active".
 */
export function StageTracker({ current, closed = false, note }: { current: number; closed?: boolean; note: string }) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion() || current < 0) return
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      tl.from('[data-dot]', { scale: 0.4, opacity: 0, duration: 0.35, stagger: 0.08, ease: 'back.out(2)' })
      tl.from('[data-line-fill]', { scaleX: 0, duration: 0.3, stagger: 0.08 }, 0.1)
      if (!closed) {
        tl.fromTo(
          '[data-current] [data-halo]',
          { scale: 1, opacity: 0.5 },
          { scale: 2.1, opacity: 0, duration: 1.4, repeat: -1, repeatDelay: 0.8, ease: 'power2.out' },
          0.4,
        )
      }
    },
    { scope: root, dependencies: [current, closed] },
  )

  return (
    <div ref={root} className={`${styles.tracker} ${closed ? styles.closed : ''} ${current < 0 ? styles.idle : ''}`}>
      <ol className={styles.steps} aria-label="Introduction progress">
        {STAGE_STEPS.map((label, i) => {
          const state = i < current ? 'done' : i === current ? (closed ? 'done' : 'current') : 'todo'
          return (
            <li
              key={label}
              className={`${styles.step} ${styles[state]}`}
              data-current={state === 'current' || undefined}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              {i > 0 ? (
                <span className={styles.line} aria-hidden>
                  {i <= current ? <span className={styles.lineFill} data-line-fill /> : null}
                </span>
              ) : null}
              <span className={styles.dot} data-dot aria-hidden>
                {state === 'current' ? <span className={styles.halo} data-halo /> : null}
                <span className={styles.core} />
              </span>
              <span className={styles.label}>
                {label}
                <span className="sr-only">
                  {state === 'done' ? ' (complete)' : state === 'current' ? ' (current)' : ' (not yet)'}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
      <span className={styles.note}>{note}</span>
    </div>
  )
}

/** Compact dots used inside track rows on Home. */
export function StageDots({ reached, muted = false }: { reached: number; muted?: boolean }) {
  return (
    <span className={`${styles.dots} ${muted ? styles.dotsMuted : ''}`} aria-hidden>
      {STAGE_STEPS.map((s, i) => (
        <span key={s} className={styles.dotsItem}>
          {i > 0 ? <span className={`${styles.dotsLine} ${i <= reached ? styles.on : ''}`} /> : null}
          <span className={`${styles.miniDot} ${i <= reached ? styles.on : ''}`} />
        </span>
      ))}
    </span>
  )
}
