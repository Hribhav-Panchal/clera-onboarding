import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import styles from './Field.module.css'

type Props = {
  label: string
  tag?: ReactNode
  hint?: string
  error?: string
  prefix?: string
} & InputHTMLAttributes<HTMLInputElement>

/** Labelled text input — "Field · Target role" etc. in A2. */
export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, tag, hint, error, prefix, id, className, ...input },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = `${inputId}-hint`
  const errId = `${inputId}-error`
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={`${styles.field} ${className ?? ''}`}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        {tag}
      </div>
      <div className={`${styles.control} ${error ? styles.invalid : ''}`}>
        {prefix ? (
          <span className={styles.prefix} aria-hidden>
            {prefix}
          </span>
        ) : null}
        <input ref={ref} id={inputId} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} {...input} />
      </div>
      {error ? (
        <p id={errId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
})
