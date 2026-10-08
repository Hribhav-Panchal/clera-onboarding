import { createContext, useContext, useEffect, useReducer, useRef, type Dispatch, type ReactNode } from 'react'
import { STORAGE_KEY, loadState, parseState, saveState } from './persist'
import { reducer, type Action, type AppState } from './reducer'

const StateCtx = createContext<AppState | null>(null)
const DispatchCtx = createContext<Dispatch<Action> | null>(null)

export function StoreProvider({ children, initial }: { children: ReactNode; initial?: AppState }) {
  const [state, dispatch] = useReducer(reducer, initial, (init) => init ?? loadState())
  const skipNextSave = useRef(false)
  const latest = useRef(state)
  useEffect(() => {
    latest.current = state
  }, [state])

  // Flush immediately if the tab is hidden or closed inside the debounce window.
  useEffect(() => {
    const flush = () => saveState(latest.current)
    const onVisibility = () => document.visibilityState === 'hidden' && flush()
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Persist (debounced) so rapid typing does not thrash localStorage.
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    const t = window.setTimeout(() => saveState(state), 150)
    return () => window.clearTimeout(t)
  }, [state])

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const next = parseState(e.newValue)
      if (next) {
        skipNextSave.current = true
        dispatch({ type: 'state/replace', state: next })
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <DispatchCtx.Provider value={dispatch}>
      <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
    </DispatchCtx.Provider>
  )
}

export function useAppState(): AppState {
  const s = useContext(StateCtx)
  if (!s) throw new Error('useAppState must be used inside <StoreProvider>')
  return s
}

export function useDispatch(): Dispatch<Action> {
  const d = useContext(DispatchCtx)
  if (!d) throw new Error('useDispatch must be used inside <StoreProvider>')
  return d
}
