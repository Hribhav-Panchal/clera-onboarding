import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { errorMessage, requestIntro, restoreMatch } from '../../api/client'
import { useAssistantContext } from '../../assistant/context'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ChoiceGroup } from '../../components/ChoiceGroup'
import { CompanyLogo } from '../../components/CompanyLogo'
import { FitPill } from '../../components/FitPill'
import { StageTracker } from '../../components/StageTracker'
import { Tag } from '../../components/Tag'
import { useToast } from '../../components/Toast'
import type { Question, Role } from '../../data/types'
import { relativeTime } from '../../lib/format'
import { gsap, prefersReducedMotion } from '../../lib/motion'
import { useAppState, useDispatch } from '../../state/store'
import { BackLink } from './RolePage'
import styles from './role.module.css'

const REWRITES = (company: string) => [
  `I want a role where I can shape a product from early research through delivery. My work simplifying complex workflows is directly relevant to what ${company} is building.`,
  `I do my best work when I own a problem end to end — from talking to customers to shipping. I have spent the last few years turning complex workflows into simple tools, which is close to what ${company} is doing.`,
  `Early-stage teams need a designer who can move between research, interaction design and front-end detail. That is how I have worked, and ${company}'s product is the kind of complex workflow I like to simplify.`,
]

export function MatchView({ role }: { role: Role }) {
  const state = useAppState()
  const dispatch = useDispatch()
  const toast = useToast()
  const location = useLocation()
  const match = state.matches.find((m) => m.roleId === role.id)
  const drafts = state.drafts[role.id] ?? {}
  const [sending, setSending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showFull, setShowFull] = useState(false)
  const ask = useRef<HTMLElement>(null)

  useAssistantContext(
    `role-match:${role.id}`,
    'I drafted your fit answer from your resume. Read it as yours; the hybrid question is pre-answered from your preferences.',
    ['Make the answer shorter', 'Mention my design systems work', `Explain the ${role.fit} percent`],
  )

  // "Request intro" on a match card deep-links here.
  useEffect(() => {
    if (location.hash !== '#ask' || !ask.current) return
    const t = window.setTimeout(() => {
      ask.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
      ask.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"], textarea')?.focus({ preventScroll: true })
    }, 350)
    return () => window.clearTimeout(t)
  }, [location.hash])

  const answerFor = (q: Question) => drafts[q.id] ?? (q.kind === 'choice' ? q.prefill ?? '' : q.prefill)
  const setAnswer = (q: Question, v: string) => {
    dispatch({ type: 'draft/set', roleId: role.id, questionId: q.id, value: v })
    if (errors[q.id]) setErrors((e) => ({ ...e, [q.id]: '' }))
  }

  const validate = () => {
    const out: Record<string, string> = {}
    for (const q of role.questions) {
      const a = answerFor(q).trim()
      if (q.kind === 'choice' && !a) out[q.id] = 'Choose an answer.'
      if (q.kind === 'text') {
        if (a.length < 20) out[q.id] = 'Write at least a sentence so the team has something to go on.'
        else if (a.length > q.maxLength) out[q.id] = `Keep this under ${q.maxLength} characters.`
      }
    }
    return out
  }

  const send = async () => {
    const errs = validate()
    setErrors(errs)
    const first = Object.keys(errs).find((k) => errs[k])
    if (first) {
      document.querySelector<HTMLElement>(`[data-q="${first}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    setSending(true)
    try {
      const answers = Object.fromEntries(role.questions.map((q) => [q.id, answerFor(q).trim()]))
      const { sentAt } = await requestIntro(role.id, answers)
      dispatch({ type: 'application/sent', roleId: role.id, answers, at: sentAt })
      toast({ message: `Introduction sent to ${role.company}.`, tone: 'success' })
    } catch (err) {
      toast({ message: errorMessage(err), tone: 'error', action: { label: 'Retry', onClick: () => void send() } })
    } finally {
      setSending(false)
    }
  }

  const facts: [string, string][] = [
    ['PAY', role.pay ?? 'Not listed'],
    ['LOCATION', role.location],
    ['WORK STYLE', role.workStyleDetail ?? 'Not listed'],
    ...(role.stage ? ([['STAGE', role.stage]] as [string, string][]) : []),
    ['POSTED', relativeTime(role.postedAt)],
  ]

  return (
    <>
      <BackLink to="/matches" label="Back to matches" />

      {match?.status === 'dismissed' ? (
        <div className={styles.dismissed} data-reveal>
          <p>You marked this role “Not for me”. It is hidden from New.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              dispatch({ type: 'match/setStatus', roleId: role.id, status: 'new' })
              void restoreMatch(role.id).catch(() => undefined)
            }}
          >
            Restore
          </Button>
        </div>
      ) : null}

      <header className={styles.roleHeader} data-reveal>
        <CompanyLogo initials={role.initials} tone="muted" size={56} />
        <div className={styles.titles}>
          <p className={styles.companyName}>{role.company}</p>
          <h1 className={styles.roleTitle}>{role.title}</h1>
        </div>
        <div className={styles.fit}>
          <FitPill fit={role.fit} reasons={role.fitReasons} improveHref="/documents" size="lg" />
        </div>
        <dl className={styles.facts}>
            {facts.map(([k, v]) => (
              <div key={k} className={styles.fact}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
      </header>

      <div data-reveal>
        <StageTracker current={-1} note="Not requested yet" />
      </div>

      <Card padding="md" data-reveal>
        <h2 className={styles.cardTitle}>The essentials</h2>
        <p className={styles.cardBody}>{role.essentials}</p>
      </Card>

      {role.clarify ? (
        <Card tone="amber" padding="md" data-reveal>
          <h2 className={styles.cardTitle}>What to clarify before you ask for an introduction</h2>
          <p className={styles.cardBody}>{role.clarify}</p>
        </Card>
      ) : null}

      <div data-reveal>
        <button
          type="button"
          className="link"
          aria-expanded={showFull}
          aria-controls="full-description"
          onClick={() => setShowFull((s) => !s)}
        >
          {showFull ? 'Hide the full description ↑' : 'Read the full description →'}
        </button>
        <Collapsible open={showFull} id="full-description">
          <div className={styles.description}>
            {role.description.split('\n\n').map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </Collapsible>
      </div>

      <section ref={ask} id="ask" className={styles.askSection} aria-labelledby="ask-title">
        <div className={styles.askIntro} data-reveal>
          <h2 id="ask-title" className={styles.sectionTitle}>
            Ask for an introduction
          </h2>
          <p className={styles.sectionBody}>
            {role.company} asks {role.questions.length === 2 ? 'two' : role.questions.length} questions. We filled them in
            from what you already told us. Edit anything, then send.
          </p>
        </div>

        {role.questions.map((q, i) => (
          <Card key={q.id} padding="md" className={styles.question} data-q={q.id} data-reveal>
            {q.kind === 'choice' ? (
              <ChoiceGroup
                label={`${i + 1} · ${q.prompt}`}
                options={q.options.map((o) => ({ value: o, label: o }))}
                value={answerFor(q) ? [answerFor(q)] : []}
                onChange={([v]) => setAnswer(q, v)}
                showCheck={false}
                error={errors[q.id] || undefined}
                footer={
                  <p className={styles.tagLine}>
                    <Tag size="sm">From your preferences</Tag>
                    <span>{q.sourceNote}</span>
                  </p>
                }
              />
            ) : (
              <TextAnswer
                index={i + 1}
                q={q}
                value={answerFor(q)}
                error={errors[q.id]}
                onChange={(v) => setAnswer(q, v)}
                rewrites={REWRITES(role.company)}
              />
            )}
          </Card>
        ))}

        <div className={styles.review} data-reveal>
          <div className={styles.reviewText}>
            <p className={styles.reviewTitle}>
              {role.company} receives {role.sharedFields}.
            </p>
            <p className={styles.reviewBody}>Only this company. Nothing else about you is shared. Change visibility in Profile.</p>
          </div>
          <Button onClick={() => void send()} loading={sending} loadingLabel="Sending introduction">
            Send introduction
          </Button>
        </div>
      </section>
    </>
  )
}

function TextAnswer({
  index,
  q,
  value,
  error,
  onChange,
  rewrites,
}: {
  index: number
  q: Extract<Question, { kind: 'text' }>
  value: string
  error?: string
  onChange: (v: string) => void
  rewrites: string[]
}) {
  const id = `answer-${q.id}`
  const area = useRef<HTMLTextAreaElement>(null)
  const typing = useRef<gsap.core.Tween | null>(null)
  const [isDraft, setIsDraft] = useState(rewrites.includes(value))
  const [writing, setWriting] = useState(false)

  useEffect(() => () => void typing.current?.kill(), [])

  // Auto-size to content.
  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const rewrite = () => {
    const i = rewrites.indexOf(value)
    const next = rewrites[(i + 1) % rewrites.length]
    setIsDraft(true)
    if (prefersReducedMotion()) return onChange(next)
    // Type the new draft in, so the change is visible and readable.
    typing.current?.kill()
    setWriting(true)
    const o = { n: 0 }
    typing.current = gsap.to(o, {
      n: next.length,
      duration: Math.min(1.4, next.length / 140),
      ease: 'none',
      onUpdate: () => onChange(next.slice(0, Math.round(o.n))),
      onComplete: () => {
        onChange(next)
        setWriting(false)
      },
    })
  }

  const over = value.length > q.maxLength
  return (
    <div className={styles.textAnswer}>
      <label htmlFor={id} className={styles.qLabel}>
        {index} · {q.prompt}
      </label>
      <textarea
        ref={area}
        id={id}
        className={`${styles.answer} ${error ? styles.answerInvalid : ''}`}
        value={value}
        rows={2}
        readOnly={writing}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={`${id}-meta ${error ? `${id}-err` : ''}`}
        onChange={(e) => {
          setIsDraft(false)
          onChange(e.target.value)
        }}
      />
      {error ? (
        <p id={`${id}-err`} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.answerRow} id={`${id}-meta`}>
        {isDraft ? (
          <>
            <Tag size="sm" tone="amber">
              Draft by Clera
            </Tag>
            <span className={styles.answerNote}>{q.sourceNote}</span>
          </>
        ) : (
          <span className={`${styles.answerNote} ${over ? styles.over : ''}`}>
            {value.length}/{q.maxLength} characters
          </span>
        )}
        <span className={styles.grow} />
        <Button variant="ghost" onClick={rewrite} disabled={writing}>
          Rewrite
        </Button>
      </div>
    </div>
  )
}

function Collapsible({ open, id, children }: { open: boolean; id: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (first.current || prefersReducedMotion()) {
      first.current = false
      gsap.set(el, { height: open ? 'auto' : 0, autoAlpha: open ? 1 : 0 })
      return
    }
    if (open) gsap.fromTo(el, { height: 0, autoAlpha: 0 }, { height: 'auto', autoAlpha: 1, duration: 0.45, ease: 'power3.out' })
    else gsap.to(el, { height: 0, autoAlpha: 0, duration: 0.3, ease: 'power2.inOut' })
  }, [open])
  return (
    <div ref={ref} id={id} className={styles.collapsible} aria-hidden={!open}>
      {children}
    </div>
  )
}
