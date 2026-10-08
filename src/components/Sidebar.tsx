import { FileText, Home, Settings, Sparkle, User, type LucideIcon } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { gsap, prefersReducedMotion } from '../lib/motion'
import { Brand } from './Brand'
import styles from './Sidebar.module.css'

export type NavKey = 'home' | 'matches' | 'profile' | 'documents' | 'settings'

const MAIN: { key: NavKey; label: string; to: string; Icon: LucideIcon }[] = [
  { key: 'home', label: 'Home', to: '/', Icon: Home },
  { key: 'matches', label: 'Matches', to: '/matches', Icon: Sparkle },
  { key: 'profile', label: 'Profile', to: '/profile', Icon: User },
  { key: 'documents', label: 'Documents', to: '/documents', Icon: FileText },
]
const SETTINGS = { key: 'settings' as const, label: 'Settings', to: '/settings', Icon: Settings }

export function Sidebar({ active, badges = {}, onNavigate }: { active: NavKey | null; badges?: Partial<Record<NavKey, number>>; onNavigate?: () => void }) {
  const root = useRef<HTMLElement>(null)
  const indicator = useRef<HTMLSpanElement>(null)
  const placed = useRef(false)

  // The active background is one element that glides between items.
  useLayoutEffect(() => {
    const nav = root.current
    const ind = indicator.current
    if (!nav || !ind) return
    const place = (animate: boolean) => {
      const item = active ? nav.querySelector<HTMLElement>(`[data-nav="${active}"]`) : null
      if (!item) {
        gsap.set(ind, { autoAlpha: 0 })
        return
      }
      const navBox = nav.getBoundingClientRect()
      const box = item.getBoundingClientRect()
      const props = { y: box.top - navBox.top, height: box.height, autoAlpha: 1 }
      if (!animate || prefersReducedMotion()) gsap.set(ind, props)
      else gsap.to(ind, { ...props, duration: 0.45, ease: 'power3.out', overwrite: 'auto' })
    }
    place(placed.current)
    placed.current = true
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => place(false)) : null
    ro?.observe(nav)
    return () => ro?.disconnect()
  }, [active])

  const item = ({ key, label, to, Icon }: (typeof MAIN)[number]) => (
    <NavLink
      key={key}
      to={to}
      end={to === '/'}
      data-nav={key}
      className={`${styles.item} ${active === key ? styles.active : ''}`}
      aria-current={active === key ? 'page' : undefined}
      onClick={onNavigate}
    >
      <Icon size={18} strokeWidth={1.75} className={`${styles.icon} ${styles[`icon-${key}`]}`} aria-hidden />
      <span>{label}</span>
      {badges[key] ? (
        <span className={styles.badge} aria-label={`${badges[key]} new`}>
          {badges[key]}
        </span>
      ) : null}
    </NavLink>
  )

  return (
    <nav ref={root} className={styles.sidebar} aria-label="Main">
      <span ref={indicator} className={styles.indicator} aria-hidden />
      <div className={styles.brand}>
        <Brand />
      </div>
      {MAIN.map(item)}
      <div className={styles.grow} />
      {item(SETTINGS)}
    </nav>
  )
}
