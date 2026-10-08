import type { LogoTone } from '../data/types'
import styles from './CompanyLogo.module.css'

/** Monogram tile used until real company logos are wired in. */
export function CompanyLogo({
  initials,
  tone = 'muted',
  size = 40,
  className,
}: {
  initials: string
  tone?: LogoTone
  size?: 36 | 40 | 44 | 56
  className?: string
}) {
  return (
    <span
      className={`${styles.logo} ${styles[tone]} ${styles[`s${size}`]} ${className ?? ''}`}
      aria-hidden
    >
      {initials.slice(0, 2).toUpperCase()}
    </span>
  )
}
