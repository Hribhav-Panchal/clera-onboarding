import { ArrowUp, ArrowRight, RotateCw, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { askClera, errorMessage, isAbort } from '../api/client'
import { gsap, prefersReducedMotion } from '../lib/motion'
import { usePress } from '../lib/usePress'
import { MAX_CHAT_LENGTH } from '../lib/validation'
import { useAppState, useDispatch } from '../state/store'
import { ASK_EVENT } from './ask'
import { useAssistantValue } from './context'
import { rememberedFact, replyFor } from './replies'
import styles from './AssistantPanel.module.css'

interface Msg {
  id: number
  from: 'clera' | 'you'
  text: string
  failed?: boolean
}

let seq = 0

export function AssistantPanel({
  onClose,
  autoFocus = false,
  pendingAsk,
  onPendingConsumed,
}: {
  onClose?: () => void
  autoFocus?: boolean
  /** A question handed over from elsewhere in the app (see ask.ts). */
  pendingAsk?: string | null
  onPendingConsumed?: () => void
}) {
  const ctx = useAssistantValue()
  const state = useAppState()
  const dispatch = useDispatch()
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // One thread per context so moving between pages keeps each conversation.
  const [threads, setThreads] = useState<Record<string, Msg[]>>({})
  const thread = threads[ctx.key] ?? []
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const sendBtn = useRef<HTMLButtonElement>(null)
  const composing = useRef(false)
  usePress(sendBtn, { scale: 0.9 })

  // Cancel any in-flight reply when the context changes or we unmount.
  useEffect(() => {
    return () => abort.current?.abort()
  }, [ctx.key])

  useEffect(() => {
    setPending(false)
  }, [ctx.key])

  useEffect(() => {
    if (autoFocus) input.current?.focus()
  }, [autoFocus])

  // Grow the textarea with its content (1–5 lines).
  useLayoutEffect(() => {
    const el = input.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 22 * 5)}px`
  }, [draft])

  // Keep the newest message in view.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [thread.length, pending])

  const animateIn = useCallback((id: number) => {
    requestAnimationFrame(() => {
      const el = scroller.current?.querySelector(`[data-msg="${id}"]`)
      if (el && !prefersReducedMotion()) gsap.from(el, { y: 10, autoAlpha: 0, duration: 0.35, ease: 'power3.out' })
    })
  }, [])

  const append = useCallback(
    (key: string, m: Msg) => {
      setThreads((t) => ({ ...t, [key]: [...(t[key] ?? []), m] }))
      animateIn(m.id)
    },
    [animateIn],
  )

  const send = useCallback(
    async (text: string, retryOf?: number) => {
      const clean = text.trim().slice(0, MAX_CHAT_LENGTH)
      if (!clean || pending) return
      const key = ctx.key
      if (retryOf !== undefined) {
        setThreads((t) => ({ ...t, [key]: (t[key] ?? []).map((m) => (m.id === retryOf ? { ...m, failed: false } : m)) }))
      } else {
        append(key, { id: ++seq, from: 'you', text: clean })
        setDraft('')
      }
      setPending(true)
      abort.current?.abort()
      const ctrl = new AbortController()
      abort.current = ctrl
      try {
        const reply = await askClera(clean, (m) => replyFor(m, stateRef.current), ctrl.signal)
        append(key, { id: ++seq, from: 'clera', text: reply })
        // "Remember that …" turns into a profile note sourced from chat.
        const fact = rememberedFact(clean)
        if (fact) {
          const at = new Date().toISOString()
          dispatch({ type: 'details/noteAdded', note: { id: `note-${Date.now().toString(36)}`, text: fact, source: 'chat', addedAt: at } })
        }
      } catch (err) {
        if (isAbort(err)) return
        setThreads((t) => {
          const list = t[key] ?? []
          const idx = retryOf ?? list[list.length - 1]?.id
          return { ...t, [key]: list.map((m) => (m.id === idx ? { ...m, failed: true } : m)) }
        })
        console.warn(errorMessage(err))
      } finally {
        if (abort.current === ctrl) {
          abort.current = null
          setPending(false)
        }
      }
    },
    [append, ctx.key, pending, dispatch],
  )

  // Questions handed over from buttons elsewhere ("Prepare for this role").
  const sendRef = useRef(send)
  useEffect(() => {
    sendRef.current = send
  }, [send])
  useEffect(() => {
    const onAsk = (e: Event) => void sendRef.current((e as CustomEvent<string>).detail)
    window.addEventListener(ASK_EVENT, onAsk)
    return () => window.removeEventListener(ASK_EVENT, onAsk)
  }, [])
  useEffect(() => {
    if (!pendingAsk) return
    void sendRef.current(pendingAsk)
    onPendingConsumed?.()
  }, [pendingAsk, onPendingConsumed])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(draft)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !composing.current && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send(draft)
    }
  }

  const trimmed = draft.trim()
  const nearLimit = draft.length > MAX_CHAT_LENGTH * 0.9

  return (
    <aside className={styles.panel} aria-label="Ask Clera">
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Ask Clera</h2>
          <p className={styles.subtitle}>Explore roles, update your profile or fix your CV.</p>
        </div>
        {onClose ? (
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close assistant">
            <X size={18} />
          </button>
        ) : null}
      </header>

      <div ref={scroller} className={styles.thread} aria-live="polite" aria-relevant="additions">
        <div className={`${styles.bubble} ${styles.clera}`} key={ctx.key} data-intro>
          {ctx.intro}
        </div>

        {thread.length === 0 && ctx.suggestions.length > 0 ? (
          <div className={styles.suggestions}>
            <p className={styles.eyebrow}>TRY ASKING</p>
            {ctx.suggestions.map((s) => (
              <SuggestionChip key={s} text={s} disabled={pending} onPick={() => void send(s)} />
            ))}
          </div>
        ) : null}

        {thread.map((m) => (
          <div key={m.id} data-msg={m.id} className={`${styles.bubble} ${m.from === 'you' ? styles.you : styles.clera}`}>
            {m.text}
            {m.failed ? (
              <button type="button" className={styles.retry} onClick={() => void send(m.text, m.id)}>
                <RotateCw size={12} /> Not sent. Retry
              </button>
            ) : null}
          </div>
        ))}

        {pending ? (
          <div className={`${styles.bubble} ${styles.clera} ${styles.typing}`} aria-label="Clera is typing">
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>

      <form className={styles.inputArea} onSubmit={onSubmit}>
        <div className={styles.input}>
          <label htmlFor="ask-clera" className="sr-only">
            Ask Clera anything
          </label>
          <textarea
            id="ask-clera"
            ref={input}
            rows={1}
            value={draft}
            maxLength={MAX_CHAT_LENGTH}
            placeholder="Ask anything…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onCompositionStart={() => (composing.current = true)}
            onCompositionEnd={() => (composing.current = false)}
          />
          <button
            ref={sendBtn}
            type="submit"
            className={styles.send}
            disabled={!trimmed || pending}
            aria-label="Send message"
          >
            <ArrowUp size={16} strokeWidth={2} />
          </button>
        </div>
        {nearLimit ? (
          <p className={styles.counter} aria-live="polite">
            {MAX_CHAT_LENGTH - draft.length} characters left
          </p>
        ) : null}
      </form>
    </aside>
  )
}

function SuggestionChip({ text, onPick, disabled }: { text: string; onPick: () => void; disabled: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)
  usePress(ref, { scale: 0.985 })
  return (
    <button ref={ref} type="button" className={styles.chip} onClick={onPick} disabled={disabled}>
      <span>{text}</span>
      <ArrowRight size={14} className={styles.chipArrow} aria-hidden />
    </button>
  )
}
