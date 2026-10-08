import { Check } from 'lucide-react'
import { useRef } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '../lib/motion'
import styles from './StepList.module.css'

export interface StepItem {
  title: string
  body: string
  state: 'done' | 'current' | 'todo'
  /** `amber` for "waiting on someone else" (R2), `sage` for "in progress" (A4). */
  tone?: 'sage' | 'amber'
}

/** Numbered vertical steps — "How this works" (A4) and the R2 timeline. */
export function StepList({ steps, divided = false }: { steps: StepItem[]; divided?: boolean }) {
  const root = useRef<HTMLOListElement>(null)
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from('[data-check]', { scale: 0, rotate: -30, duration: 0.5, ease: 'back.out(2.2)', stagger: 0.1, delay: 0.25 })
    },
    { scope: root },
  )
  return (
    <ol ref={root} className={`${styles.list} ${divided ? styles.divided : ''}`}>
      {steps.map((s, i) => (
        <li key={s.title} className={`${styles.item} ${styles[s.state]} ${s.tone === 'amber' ? styles.amber : ''}`}>
          <span className={styles.dot} aria-hidden>
            {s.state === 'done' ? (
              <span data-check className={styles.check}>
                <Check size={12} strokeWidth={2.5} />
              </span>
            ) : (
              i + 1
            )}
          </span>
          <div className={styles.text}>
            <p className={styles.title}>
              {s.title}
              <span className="sr-only">
                {s.state === 'done' ? ' — done' : s.state === 'current' ? ' — in progress' : ' — up next'}
              </span>
            </p>
            <p className={styles.body}>{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
