import { useLayoutEffect, useRef, type KeyboardEvent } from 'react'
import { gsap, prefersReducedMotion } from '../lib/motion'
import styles from './FilterTabs.module.css'

export interface FilterTab<K extends string> {
  key: K
  label: string
  count: number
}

/**
 * Pill filters from "Your track" and "Your matches". The dark active pill
 * slides between options instead of jumping.
 */
export function FilterTabs<K extends string>({
  tabs,
  value,
  onChange,
  label,
  controls,
}: {
  tabs: FilterTab<K>[]
  value: K
  onChange: (k: K) => void
  label: string
  controls?: string
}) {
  const list = useRef<HTMLDivElement>(null)
  const indicator = useRef<HTMLSpanElement>(null)
  const first = useRef(true)

  useLayoutEffect(() => {
    const root = list.current
    const ind = indicator.current
    if (!root || !ind) return
    const place = (animate: boolean) => {
      const btn = root.querySelector<HTMLButtonElement>(`[data-key="${CSS.escape(value)}"]`)
      if (!btn) return
      const props = { x: btn.offsetLeft, width: btn.offsetWidth, height: btn.offsetHeight, opacity: 1 }
      if (!animate || prefersReducedMotion()) gsap.set(ind, props)
      else gsap.to(ind, { ...props, duration: 0.42, ease: 'power3.out', overwrite: 'auto' })
    }
    place(!first.current)
    first.current = false
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => place(false)) : null
    ro?.observe(root)
    return () => ro?.disconnect()
  }, [value, tabs])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.key === value)
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    if (next < 0) return
    e.preventDefault()
    onChange(tabs[next].key)
    list.current?.querySelector<HTMLButtonElement>(`[data-key="${CSS.escape(tabs[next].key)}"]`)?.focus()
  }

  return (
    <div ref={list} className={styles.tabs} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      <span ref={indicator} className={styles.indicator} aria-hidden />
      {tabs.map((t) => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            data-key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={controls}
            tabIndex={active ? 0 : -1}
            className={`${styles.tab} ${active ? styles.active : ''}`}
            onClick={() => onChange(t.key)}
          >
            <span className={styles.label}>{t.label}</span>
            <span className={styles.count}>{t.count}</span>
          </button>
        )
      })}
    </div>
  )
}
