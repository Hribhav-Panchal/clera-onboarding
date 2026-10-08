import { Check } from 'lucide-react'
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { gsap, prefersReducedMotion } from '../lib/motion'
import { usePress } from '../lib/usePress'
import styles from './ChoiceGroup.module.css'

export interface Choice<V extends string> {
  value: V
  label: string
  disabled?: boolean
  description?: string
}

/**
 * Selectable option chips. `multiple` → checkbox semantics (work styles),
 * otherwise radio semantics with roving focus (visa, time slots, answers).
 */
export function ChoiceGroup<V extends string>({
  label,
  hint,
  error,
  options,
  value,
  onChange,
  multiple = false,
  showCheck = true,
  size = 'md',
  labelHidden = false,
  footer,
}: {
  label: string
  hint?: string
  error?: string
  options: Choice<V>[]
  value: V[]
  onChange: (next: V[]) => void
  multiple?: boolean
  showCheck?: boolean
  size?: 'md' | 'lg'
  labelHidden?: boolean
  footer?: ReactNode
}) {
  const id = useId()
  const group = useRef<HTMLDivElement>(null)

  const toggle = (v: V) => {
    if (multiple) onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
    else onChange([v])
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (multiple) return
    const enabled = options.filter((o) => !o.disabled)
    const i = enabled.findIndex((o) => o.value === value[0])
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % enabled.length
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + enabled.length) % enabled.length
    if (next === null) return
    e.preventDefault()
    const v = enabled[next].value
    onChange([v])
    group.current?.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(v)}"]`)?.focus()
  }

  const firstEnabled = options.find((o) => !o.disabled)?.value

  return (
    <div className={styles.wrap}>
      <div className={labelHidden ? 'sr-only' : styles.head}>
        <p id={`${id}-label`} className={styles.label}>
          {label}
        </p>
        {hint ? (
          <p id={`${id}-hint`} className={styles.hint}>
            {hint}
          </p>
        ) : null}
      </div>
      <div
        ref={group}
        role={multiple ? 'group' : 'radiogroup'}
        aria-labelledby={`${id}-label`}
        aria-describedby={[hint ? `${id}-hint` : '', error ? `${id}-err` : ''].join(' ').trim() || undefined}
        aria-invalid={error ? true : undefined}
        className={styles.options}
        onKeyDown={onKeyDown}
      >
        {options.map((o) => {
          const selected = value.includes(o.value)
          const tabbable = multiple || selected || (value.length === 0 && o.value === firstEnabled)
          return (
            <ChoiceChip
              key={o.value}
              value={o.value}
              label={o.label}
              selected={selected}
              disabled={o.disabled}
              multiple={multiple}
              showCheck={showCheck}
              size={size}
              tabIndex={tabbable ? 0 : -1}
              onToggle={() => toggle(o.value)}
            />
          )
        })}
      </div>
      {error ? (
        <p id={`${id}-err`} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {footer}
    </div>
  )
}

function ChoiceChip({
  value,
  label,
  selected,
  disabled,
  multiple,
  showCheck,
  size,
  tabIndex,
  onToggle,
}: {
  value: string
  label: string
  selected: boolean
  disabled?: boolean
  multiple: boolean
  showCheck: boolean
  size: 'md' | 'lg'
  tabIndex: number
  onToggle: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const badge = useRef<HTMLSpanElement>(null)
  const was = useRef(selected)
  usePress(ref, { disabled })

  // Check badge pops in when selected.
  useEffect(() => {
    if (selected && !was.current && badge.current && !prefersReducedMotion()) {
      gsap.fromTo(badge.current, { scale: 0, rotate: -45 }, { scale: 1, rotate: 0, duration: 0.45, ease: 'back.out(2.4)' })
    }
    was.current = selected
  }, [selected])

  return (
    <button
      ref={ref}
      type="button"
      data-value={value}
      role={multiple ? 'checkbox' : 'radio'}
      aria-checked={selected}
      disabled={disabled}
      tabIndex={tabIndex}
      className={`${styles.chip} ${size === 'lg' ? styles.lg : ''} ${selected ? styles.selected : ''} ${selected && showCheck ? styles.withCheck : ''}`}
      onClick={onToggle}
    >
      {selected && showCheck ? (
        <span ref={badge} className={styles.badge} aria-hidden>
          <Check size={12} strokeWidth={2.5} />
        </span>
      ) : null}
      <span>{label}</span>
    </button>
  )
}
