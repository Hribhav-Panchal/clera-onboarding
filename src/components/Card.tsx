import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import styles from './Card.module.css'

export type CardTone = 'default' | 'hero' | 'subtle' | 'amber' | 'muted'

/**
 * Surface container. `hero` is the emphasised card (sage-200 outline) used
 * for "Your next step", "Your selection" and similar single-decision cards.
 */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & {
  tone?: CardTone
  radius?: 12 | 14
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: ReactNode
}>(function Card({ tone = 'default', radius = 12, padding = 'md', className, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={`${styles.card} ${styles[tone]} ${styles[`r${radius}`]} ${styles[`p-${padding}`]} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </div>
  )
})
