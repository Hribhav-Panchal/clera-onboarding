import { Menu, MessageCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AssistantPanel } from '../assistant/AssistantPanel'
import { ASK_EVENT } from '../assistant/ask'
import { DESKTOP, WIDE, useMediaQuery } from '../lib/useMediaQuery'
import { usePress } from '../lib/usePress'
import { applicationFor } from '../state/selectors'
import { useAppState } from '../state/store'
import { Brand } from './Brand'
import { Sheet } from './Sheet'
import { Sidebar, type NavKey } from './Sidebar'
import styles from './AppShell.module.css'

function useActiveNav(): NavKey | null {
  const { pathname } = useLocation()
  const state = useAppState()
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/matches')) return 'matches'
  if (pathname.startsWith('/roles/')) {
    // Roles you have requested live on your Home track; others under Matches.
    const id = decodeURIComponent(pathname.split('/')[2] ?? '')
    return applicationFor(state, id) ? 'home' : 'matches'
  }
  if (pathname.startsWith('/profile')) return 'profile'
  if (pathname.startsWith('/documents')) return 'documents'
  if (pathname.startsWith('/settings')) return 'settings'
  return null
}

export function AppShell() {
  const wide = useMediaQuery(WIDE)
  const desktop = useMediaQuery(DESKTOP)
  const active = useActiveNav()
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [pendingAsk, setPendingAsk] = useState<string | null>(null)
  const main = useRef<HTMLElement>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  usePress(launcher, { scale: 0.94 })
  const clearPending = useCallback(() => setPendingAsk(null), [])

  // New page → top of the scroll area, close any open sheets.
  useEffect(() => {
    main.current?.scrollTo({ top: 0 })
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (wide) setAskOpen(false)
  }, [wide])

  // When the assistant is not docked, a question from elsewhere opens it.
  useEffect(() => {
    if (wide) return
    const onAsk = (e: Event) => {
      if (askOpen) return // the open panel handles it itself
      setPendingAsk((e as CustomEvent<string>).detail)
      setAskOpen(true)
    }
    window.addEventListener(ASK_EVENT, onAsk)
    return () => window.removeEventListener(ASK_EVENT, onAsk)
  }, [wide, askOpen])

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>

      {desktop ? (
        <div className={styles.sidebarCol}>
          <Sidebar active={active} />
        </div>
      ) : (
        <header className={styles.topbar}>
          <button type="button" className={styles.iconBtn} onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <Brand />
          <span className={styles.topbarSpacer} />
        </header>
      )}

      <main ref={main} id="main" className={styles.main} tabIndex={-1}>
        <div className={styles.mainInner}>
          <Outlet />
        </div>
      </main>

      {wide ? (
        <div className={styles.assistantCol}>
          <AssistantPanel />
        </div>
      ) : (
        <>
          <button ref={launcher} type="button" className={styles.launcher} onClick={() => setAskOpen(true)}>
            <MessageCircle size={18} aria-hidden />
            <span>Ask Clera</span>
          </button>
          <Sheet open={askOpen} onClose={() => setAskOpen(false)} label="Ask Clera" width={400}>
            <AssistantPanel
              onClose={() => setAskOpen(false)}
              autoFocus
              pendingAsk={pendingAsk}
              onPendingConsumed={clearPending}
            />
          </Sheet>
        </>
      )}

      {!desktop ? (
        <Sheet open={navOpen} onClose={() => setNavOpen(false)} side="left" width={280} label="Menu">
          <Sidebar active={active} onNavigate={() => setNavOpen(false)} />
        </Sheet>
      ) : null}
    </div>
  )
}
