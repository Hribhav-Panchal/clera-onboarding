import type { ReactNode } from 'react'
import styles from './Tag.module.css'

/** Small rounded label: "From your resume", "New", "Draft by Clera". */
export function Tag({
  tone = 'sage',
  size = 'md',
  children,
}: {
  tone?: 'sage' | 'amber' | 'muted'
  size?: 'md' | 'sm'
  children: ReactNode
}) {
  return <span className={`${styles.tag} ${styles[tone]} ${styles[size]}`}>{children}</span>
}
