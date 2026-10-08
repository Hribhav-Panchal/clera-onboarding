import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from './Brand'
import { Button } from './Button'
import styles from './OnboardingShell.module.css'

export interface Step {
  label: string
  to: string
  state: 'done' | 'current' | 'todo'
  reachable: boolean
}

export function OnboardingShell({
  steps,
  onSaveExit,
  saving,
  children,
}: {
  steps: Step[]
  onSaveExit: () => void
  saving?: boolean
  children: ReactNode
}) {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Brand to="/onboarding/resume" />
        <nav className={styles.stepper} aria-label="Setup progress">
          <ol>
            {steps.map((s, i) => {
              const body = (
                <>
                  <span className={styles.dot} aria-hidden>
                    {s.state === 'done' ? <Check size={12} strokeWidth={2.5} /> : i + 1}
                  </span>
                  <span className={styles.stepLabel}>{s.label}</span>
                  <span className="sr-only">
                    {s.state === 'done' ? ' (complete)' : s.state === 'current' ? ' (current step)' : ''}
                  </span>
                </>
              )
              return (
                <li key={s.label} className={`${styles.step} ${styles[s.state]}`}>
                  {s.reachable && s.state !== 'current' ? (
                    <Link to={s.to} className={styles.stepLink}>
                      {body}
                    </Link>
                  ) : (
                    <span className={styles.stepLink} aria-current={s.state === 'current' ? 'step' : undefined}>
                      {body}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
        <Button variant="ghost" onClick={onSaveExit} loading={saving} loadingLabel="Saving">
          Save &amp; exit
        </Button>
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
    </div>
  )
}
