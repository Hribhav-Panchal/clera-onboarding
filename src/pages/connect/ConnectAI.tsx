import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { connectAssistant, disconnectAssistant, errorMessage, isAbort } from '../../api/client'
import { useAssistantContext } from '../../assistant/context'
import { AIMark } from '../../components/AIMark'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { useToast } from '../../components/Toast'
import { PARSED_ESSENTIALS, parsedDetails } from '../../data/seed'
import type { AIConnection, AIProvider } from '../../data/types'
import { copyText } from '../../lib/clipboard'
import { relativeTime } from '../../lib/format'
import { gsap, prefersReducedMotion } from '../../lib/motion'
import { useHoverLift } from '../../lib/useHoverLift'
import { usePress } from '../../lib/usePress'
import { useReveal } from '../../lib/useReveal'
import { useAppState, useDispatch } from '../../state/store'
import styles from './ConnectAI.module.css'

export const PROVIDERS: { id: AIProvider; name: string; vendor: string; open: (q: string) => string }[] = [
  { id: 'claude', name: 'Claude', vendor: 'Anthropic', open: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}` },
  { id: 'chatgpt', name: 'ChatGPT', vendor: 'OpenAI', open: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}` },
  { id: 'gemini', name: 'Gemini', vendor: 'Google', open: () => 'https://gemini.google.com/app' },
  { id: 'grok', name: 'Grok', vendor: 'xAI', open: (q) => `https://grok.com/?q=${encodeURIComponent(q)}` },
]

const STARTER =
  'Compare my Clera matches with my preferences. Explain the fit and trade-offs, then tell me what to clarify before I ask for an introduction.'

// Placeholder until the production connector URL is confirmed — set VITE_CLERA_MCP_URL.
const MCP_URL: string = import.meta.env.VITE_CLERA_MCP_URL || 'https://getclera.com/mcp'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * C1 / C2. `mode="onboarding"` is the "Connect Clera MCP" path from A1:
 * after connecting, details are pulled in and the candidate goes to A2.
 */
export function ConnectAI({ mode = 'settings' }: { mode?: 'settings' | 'onboarding' }) {
  const { ai } = useAppState()
  return ai && mode === 'settings' ? <Connected connection={ai} /> : <Choose mode={mode} />
}

function Choose({ mode }: { mode: 'settings' | 'onboarding' }) {
  const state = useAppState()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const [provider, setProvider] = useState<AIProvider>('claude')
  const [account, setAccount] = useState(state.profile.email)
  const [editing, setEditing] = useState(false)
  const [draftEmail, setDraftEmail] = useState(account)
  const [emailError, setEmailError] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)
  const access = useRef<HTMLDivElement>(null)
  const page = useRef<HTMLDivElement>(null)
  useReveal(page)
  const p = PROVIDERS.find((x) => x.id === provider)!

  useAssistantContext(
    `connect:${provider}`,
    'Connecting an assistant is optional. It lets you talk about your matches wherever you already think, and nothing gets sent without you.',
    [`What will ${p.name} be able to see?`, 'Can I disconnect later?', 'Skip this for now'],
  )

  useEffect(() => () => abort.current?.abort(), [])

  // Swap the permissions copy with a quick cross-fade when the provider changes.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (access.current && !prefersReducedMotion()) {
      gsap.fromTo(access.current.querySelectorAll('[data-swap]'), { autoAlpha: 0, y: 4 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.03 })
    }
    setError('')
  }, [provider])

  const connect = async () => {
    setConnecting(true)
    setError('')
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      const connection = await connectAssistant(provider, account, ctrl.signal)
      dispatch({ type: 'ai/connected', connection })
      if (mode === 'onboarding') {
        dispatch({
          type: 'profile/imported',
          source: 'mcp',
          essentials: { ...PARSED_ESSENTIALS, workStyles: [...PARSED_ESSENTIALS.workStyles] },
          details: parsedDetails('chat'),
        })
        toast({ message: `Connected to ${p.name}. We pulled in your details — check them below.`, tone: 'success' })
        navigate('/onboarding/essentials')
      }
    } catch (err) {
      if (isAbort(err)) return
      setError(`${p.name} did not finish connecting. ${errorMessage(err)}`)
    } finally {
      setConnecting(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = PROVIDERS.findIndex((x) => x.id === provider)
    let n = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % PROVIDERS.length
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + PROVIDERS.length) % PROVIDERS.length
    if (n < 0) return
    e.preventDefault()
    setProvider(PROVIDERS[n].id)
    e.currentTarget.querySelector<HTMLElement>(`[data-provider="${PROVIDERS[n].id}"]`)?.focus()
  }

  const saveEmail = () => {
    const v = draftEmail.trim()
    if (!EMAIL_RE.test(v)) {
      setEmailError('Enter a valid email address.')
      return
    }
    setAccount(v)
    setEditing(false)
    setEmailError('')
  }

  return (
    <div ref={page} className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow} data-reveal>
          Optional
        </p>
        <h1 className={styles.h1} data-split>
          Talk through your search in the AI you already use
        </h1>
        <p className={styles.sub} data-reveal>
          Pick the assistant you use. {p.name} opens in a new tab to approve access, then you are done. Clera works fine
          without this.
        </p>
      </header>

      <div className={styles.tools} role="radiogroup" aria-label="Assistant" onKeyDown={onKeyDown} data-reveal>
        {PROVIDERS.map((t) => (
          <ToolCard key={t.id} tool={t} selected={t.id === provider} disabled={connecting} onSelect={() => setProvider(t.id)} />
        ))}
      </div>

      <Card padding="md" className={styles.access} ref={access} data-reveal>
        <h2 className={styles.cardTitle} data-swap>
          What {p.name} will be able to do
        </h2>
        <ul className={styles.checks}>
          {['See your profile, resume, matches and request status', 'Draft answers and compare roles with you', 'Never send a request or change a preference without your confirmation in Clera'].map(
            (line) => (
              <li key={line} data-swap>
                <Check size={16} strokeWidth={2} className={styles.check} aria-hidden />
                {line}
              </li>
            ),
          )}
        </ul>
        {editing ? (
          <div className={styles.emailEdit}>
            <label htmlFor="ai-account" className="sr-only">
              Account email
            </label>
            <input
              id="ai-account"
              type="email"
              autoComplete="email"
              value={draftEmail}
              autoFocus
              aria-invalid={Boolean(emailError) || undefined}
              aria-describedby={emailError ? 'ai-account-err' : undefined}
              onChange={(e) => {
                setDraftEmail(e.target.value)
                setEmailError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEmail()
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <Button size="sm" onClick={saveEmail}>
              Use this
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            {emailError ? (
              <p id="ai-account-err" className={styles.emailError} role="alert">
                {emailError}
              </p>
            ) : null}
          </div>
        ) : (
          <p className={styles.account}>
            Connecting as {account}.{' '}
            <button
              type="button"
              className={`link ${styles.small}`}
              onClick={() => {
                setDraftEmail(account)
                setEditing(true)
              }}
            >
              Use a different account
            </button>{' '}
            · You can disconnect any time.
          </p>
        )}
      </Card>

      {error ? (
        <p className={styles.error} role="alert" data-reveal>
          {error}
        </p>
      ) : null}

      <div className={styles.footer} data-reveal>
        <Button
          variant="ghost"
          onClick={() => {
            if (connecting) {
              abort.current?.abort()
              setConnecting(false)
              return
            }
            navigate(mode === 'onboarding' ? '/onboarding/resume' : '/')
          }}
        >
          {connecting ? 'Cancel' : mode === 'onboarding' ? 'Back' : 'Skip for now'}
        </Button>
        <Button onClick={() => void connect()} loading={connecting} loadingLabel={`Waiting for ${p.name}`}>
          {error ? 'Try again' : `Continue with ${p.name}`}
        </Button>
      </div>
      {connecting ? (
        <p className={styles.waiting} role="status">
          Waiting for you to approve access in {p.name}…
        </p>
      ) : null}
    </div>
  )
}

function ToolCard({
  tool,
  selected,
  disabled,
  onSelect,
}: {
  tool: (typeof PROVIDERS)[number]
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const mark = useRef<HTMLSpanElement>(null)
  useHoverLift(ref)
  usePress(ref, { scale: 0.98, disabled })
  useEffect(() => {
    if (selected && mark.current && !prefersReducedMotion()) {
      gsap.fromTo(mark.current, { rotate: -12, scale: 0.9 }, { rotate: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
    }
  }, [selected])
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      data-provider={tool.id}
      disabled={disabled && !selected}
      className={`${styles.tool} ${selected ? styles.selected : ''}`}
      onClick={onSelect}
    >
      <span ref={mark}>
        <AIMark provider={tool.id} />
      </span>
      <span className={styles.toolName}>{tool.name}</span>
      <span className={styles.toolVendor}>{tool.vendor}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ C2 */

function Connected({ connection }: { connection: AIConnection }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [manual, setManual] = useState(false)
  const page = useRef<HTMLDivElement>(null)
  useReveal(page)
  const p = PROVIDERS.find((x) => x.id === connection.provider)!
  const verified = relativeTime(connection.verifiedAt)

  useAssistantContext(
    `connected:${p.id}`,
    `Connected. From now on you can ask me about your matches here or in ${p.name}, and the answers stay in sync.`,
    ['Compare my three matches', 'Which match should I ask about first?', 'Draft my Colare answers'],
  )

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(t)
  }, [copied])

  const copy = async (text: string) => {
    const ok = await copyText(text)
    if (ok) setCopied(true)
    else toast({ message: 'Could not copy. Select the text and copy it manually.', tone: 'error' })
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      await disconnectAssistant(p.id)
      dispatch({ type: 'ai/disconnected' })
      toast({ message: `${p.name} disconnected. Clera no longer shares anything with it.` })
    } catch (err) {
      toast({ message: errorMessage(err), tone: 'error' })
      setBusy(false)
    }
  }

  return (
    <div ref={page} className={styles.page}>
      <header className={styles.header}>
        <div className={styles.readyRow} data-reveal>
          <AIMark provider={p.id} />
          <h1 className={styles.h1Large}>Clera is ready in {p.name}</h1>
          <span className={styles.connectedPill}>
            <span className={styles.pillDot} aria-hidden />
            Connected
          </span>
        </div>
        <p className={styles.sub} data-reveal>
          Connection verified for {connection.account}, {verified}.
        </p>
      </header>

      <Card tone="hero" radius={14} padding="md" className={styles.decision} data-reveal>
        <h2 className={styles.cardTitle}>Start with one decision</h2>
        <blockquote className={styles.quote}>{STARTER}</blockquote>
        <div className={styles.row}>
          <Button to={p.open(STARTER)} external>
            Open {p.name}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void copy(STARTER)}
            leading={copied ? <Check size={16} strokeWidth={2.25} /> : <Copy size={15} />}
          >
            <span aria-live="polite">{copied ? 'Copied' : 'Copy question'}</span>
          </Button>
        </div>
        <p className={styles.note}>Any request or preference change still comes back to you for review before it takes effect.</p>
      </Card>

      <Card padding="sm" className={styles.connection} data-reveal>
        <div className={styles.grow}>
          <p className={styles.cardTitle}>{p.name} · connected</p>
          <p className={styles.meta}>Can see profile, resume, matches and request status · Last verified {verified}</p>
        </div>
        {confirm ? (
          <div className={styles.row} role="group" aria-label="Confirm disconnect">
            <Button variant="ghost" onClick={() => setConfirm(false)} disabled={busy}>
              Keep
            </Button>
            <Button variant="danger" onClick={() => void disconnect()} loading={busy}>
              Disconnect {p.name}
            </Button>
          </div>
        ) : (
          <div className={styles.row}>
            <Button variant="ghost" to={p.open('')} external>
              Manage access
            </Button>
            <Button variant="secondary" onClick={() => setConfirm(true)}>
              Disconnect
            </Button>
          </div>
        )}
      </Card>

      <div className={styles.notFinished} data-reveal>
        <p className={styles.grow}>Did {p.name} not open, or did you decline access? Nothing changed on your side.</p>
        <Button variant="ghost" to={p.open(STARTER)} external>
          Open {p.name} again
        </Button>
        <Button variant="ghost" onClick={() => setManual((m) => !m)} aria-expanded={manual}>
          Manual setup
        </Button>
      </div>

      {manual ? (
        <Card padding="md" className={styles.manual}>
          <p className={styles.cardTitle}>Add Clera as a connector</p>
          <ol className={styles.steps}>
            <li>Open {p.name} settings and find connectors or integrations.</li>
            <li>Add a custom connector with this URL, then sign in with {connection.account}.</li>
          </ol>
          <div className={styles.urlRow}>
            <code>{MCP_URL}</code>
            <Button variant="secondary" size="sm" onClick={() => void copy(MCP_URL)}>
              {copied ? 'Copied' : 'Copy URL'}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
