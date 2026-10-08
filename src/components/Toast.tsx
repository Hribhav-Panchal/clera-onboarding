import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { gsap, prefersReducedMotion } from '../lib/motion'
import styles from './Toast.module.css'

export interface ToastInput {
  message: string
  tone?: 'neutral' | 'error' | 'success'
  action?: { label: string; onClick: () => void }
  /** ms; 0 keeps it until dismissed. */
  duration?: number
}

interface ToastItem extends ToastInput {
  id: number
}

const Ctx = createContext<((t: ToastInput) => number) | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const remove = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const push = useCallback((t: ToastInput) => {
    const id = ++seq.current
    // Keep the stack short; the newest message matters most.
    setItems((xs) => [...xs.slice(-2), { ...t, id }])
    return id
  }, [])

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className={styles.region} role="region" aria-label="Notifications">
        <div aria-live="polite" aria-atomic="false" className={styles.stack}>
          {items.map((t) => (
            <ToastView key={t.id} item={t} onDone={() => remove(t.id)} />
          ))}
        </div>
      </div>
    </Ctx.Provider>
  )
}

function ToastView({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const closing = useRef(false)
  const duration = item.duration ?? (item.action ? 6000 : 4000)

  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  }, [onDone])

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    window.clearTimeout(timer.current)
    const el = ref.current
    if (!el || prefersReducedMotion()) return done.current()
    gsap.to(el, { y: 12, autoAlpha: 0, scale: 0.98, duration: 0.2, ease: 'power2.in', onComplete: () => done.current() })
  }, [])

  const arm = useCallback(() => {
    window.clearTimeout(timer.current)
    if (duration > 0) timer.current = window.setTimeout(close, duration)
  }, [close, duration])

  useEffect(() => {
    const el = ref.current
    if (el && !prefersReducedMotion()) {
      gsap.fromTo(el, { y: 16, autoAlpha: 0, scale: 0.98 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(1.6)' })
    }
  }, [])

  useEffect(() => {
    arm()
    return () => window.clearTimeout(timer.current)
  }, [arm])

  return (
    <div
      ref={ref}
      className={`${styles.toast} ${styles[item.tone ?? 'neutral']}`}
      role={item.tone === 'error' ? 'alert' : 'status'}
      onPointerEnter={() => window.clearTimeout(timer.current)}
      onPointerLeave={arm}
      onFocus={() => window.clearTimeout(timer.current)}
      onBlur={arm}
    >
      <span className={styles.message}>{item.message}</span>
      {item.action ? (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            item.action!.onClick()
            close()
          }}
        >
          {item.action.label}
        </button>
      ) : null}
      <button type="button" className={styles.close} onClick={close} aria-label="Dismiss notification">
        <X size={14} />
      </button>
    </div>
  )
}

export function useToast() {
  const push = useContext(Ctx)
  if (!push) throw new Error('useToast must be used inside <ToastProvider>')
  return useMemo(() => push, [push])
}
