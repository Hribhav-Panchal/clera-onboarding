import { ArrowRight, Check, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dismissMatch, errorMessage, requestIntro, restoreMatch, withdrawRequest } from '../api/client'
import { useAssistantContext } from '../assistant/context'
import { Button } from '../components/Button'
import { CompanyLogo } from '../components/CompanyLogo'
import { FilterTabs } from '../components/FilterTabs'
import { FitPill } from '../components/FitPill'
import { StatusPill } from '../components/StatusPill'
import { Tag } from '../components/Tag'
import { useToast } from '../components/Toast'
import { summarize } from './onboarding/EssentialsPage'
import type { Match, Role } from '../data/types'
import { countWord, currency } from '../lib/format'
import { gsap, prefersReducedMotion, useGSAP } from '../lib/motion'
import { useHoverLift } from '../lib/useHoverLift'
import { usePress } from '../lib/usePress'
import { Spinner } from '../components/Spinner'
import { useReveal } from '../lib/useReveal'
import { answerFor, applicationFor, matchCounts, matchesBy, pillForStage, unanswered, type MatchFilter } from '../state/selectors'
import { useAppState, useDispatch } from '../state/store'
import styles from './MatchesPage.module.css'

export function MatchesPage() {
  const state = useAppState()
  const [filter, setFilter] = useState<MatchFilter>('new')
  const page = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  useReveal(page)
  const counts = matchCounts(state)
  const items = useMemo(() => matchesBy(state, filter), [state, filter])
  const fresh = matchesBy(state, 'new')
  const top = fresh[0]?.role

  useAssistantContext(
    `matches:${fresh.length}`,
    fresh.length
      ? `${countWord(fresh.length)} ${fresh.length === 1 ? 'match' : 'matches'} came in. ${top!.company} is the closest fit. Say the word and I will draft your request so you only review it.`
      : 'You are all caught up. I will tell you when new matches land.',
    fresh.length
      ? [`Prepare my request for ${top!.company}`, fresh.length > 1 ? `Compare these ${fresh.length === 2 ? 'two' : fresh.length === 3 ? 'three' : ''}`.trim() : 'Explain this match', 'Dismiss the ones with conflicts']
      : ['What kind of roles will I see?', 'Update my preferences', 'How long do replies usually take?'],
  )

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo('[data-card]', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power3.out' })
    },
    { scope: list, dependencies: [filter], revertOnUpdate: true },
  )

  const e = state.profile.essentials
  const prefs = [summarize(e), e.minBasePay ? `from ${currency(e.minBasePay)}` : 'pay open'].join(' · ')

  return (
    <div ref={page} className={styles.page}>
      <header className={styles.header} data-reveal>
        <h1 className={styles.h1}>Your matches</h1>
        <p className={styles.sub}>Start with one. Reviewing a match does not send your profile anywhere.</p>
      </header>

      <div className={styles.prefs} data-reveal>
        <p className={styles.prefsText}>{capitalizeModes(prefs)}</p>
        <Button variant="ghost" to="/profile">
          Edit preferences
        </Button>
      </div>

      <div data-reveal>
        <FilterTabs
          label="Filter matches"
          controls="match-list"
          value={filter}
          onChange={setFilter}
          tabs={[
            { key: 'new', label: 'New', count: counts.new },
            { key: 'requested', label: 'Applied', count: counts.requested },
            { key: 'dismissed', label: 'Dismissed', count: counts.dismissed },
          ]}
        />
      </div>

      <ul ref={list} id="match-list" role="tabpanel" className={styles.list} aria-label={`${filter} matches`}>
        {items.length === 0 ? (
          <li data-card>
            <EmptyState filter={filter} />
          </li>
        ) : (
          items.map(({ match, role }) => <MatchCard key={role.id} match={match} role={role} />)
        )}
      </ul>

      {items.length > 0 ? (
        <p className={styles.footnote} data-reveal>
          A match is a starting point. Clera narrows the search; you decide after reading the role and its trade-offs.
        </p>
      ) : null}
    </div>
  )
}

function capitalizeModes(s: string) {
  // "remote or hybrid" reads as a value in this bar: "Remote or hybrid".
  return s.replace(/ · (remote|hybrid|on-site)/, (_m, w: string) => ` · ${w.charAt(0).toUpperCase()}${w.slice(1)}`)
}

function EmptyState({ filter }: { filter: MatchFilter }) {
  const copy = {
    new: {
      title: 'You are all caught up',
      body: 'Clera keeps looking. New matches show up here and in your email.',
      cta: { label: 'Edit preferences', to: '/profile' },
    },
    requested: {
      title: 'No applications yet',
      body: 'When you apply to a role, it moves here so you can follow it.',
      cta: null,
    },
    dismissed: {
      title: 'Nothing dismissed',
      body: 'Roles you mark “Not for me” land here. You can restore them any time.',
      cta: null,
    },
  }[filter]
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{copy.title}</p>
      <p className={styles.emptyBody}>{copy.body}</p>
      {copy.cta ? (
        <Button variant="secondary" to={copy.cta.to}>
          {copy.cta.label}
        </Button>
      ) : null}
    </div>
  )
}

function MatchCard({ match, role }: { match: Match; role: Role }) {
  const state = useAppState()
  const dispatch = useDispatch()
  const toast = useToast()
  const navigate = useNavigate()
  const ref = useRef<HTMLLIElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [applyState, setApplyState] = useState<'idle' | 'applying' | 'applied'>('idle')
  useHoverLift(card, { lift: 1 })
  const app = applicationFor(state, role.id)
  const missing = unanswered(role, state.drafts[role.id])
  const needsAnswers = Boolean(match.needsAnswers) && missing.length > 0
  const label = `${role.title} at ${role.company}`
  const detailsHref = `/roles/${role.id}`

  // If the card unmounts mid-animation (navigation), still record the application.
  const pendingSend = useRef<null | (() => void)>(null)
  useEffect(() => () => pendingSend.current?.(), [])

  const collapse = (after: () => void) => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return after()
    gsap
      .timeline({ onComplete: after })
      .to(el, { autoAlpha: 0, x: -24, duration: 0.22, ease: 'power2.in' })
      .to(el, { height: 0, marginTop: 0, marginBottom: 0, duration: 0.28, ease: 'power3.inOut' }, '-=0.04')
  }

  const setStatus = (status: Match['status']) => dispatch({ type: 'match/setStatus', roleId: role.id, status })

  const dismiss = async () => {
    setBusy(true)
    try {
      await dismissMatch(role.id)
      collapse(() => {
        setStatus('dismissed')
        toast({
          message: `${role.company} moved to Dismissed.`,
          action: {
            label: 'Undo',
            onClick: () => {
              setStatus('new')
              void restoreMatch(role.id).catch(() => undefined)
            },
          },
        })
      })
    } catch (err) {
      setBusy(false)
      toast({ message: errorMessage(err), tone: 'error' })
    }
  }

  const restore = async () => {
    setBusy(true)
    try {
      await restoreMatch(role.id)
      collapse(() => setStatus('new'))
      toast({ message: `${role.company} is back in New.` })
    } catch (err) {
      setBusy(false)
      toast({ message: errorMessage(err), tone: 'error' })
    }
  }

  const apply = async () => {
    if (applyState !== 'idle') return
    // Some roles ask things Clera can't answer from the profile: flip to the form.
    if (missing.length > 0) {
      dispatch({ type: 'match/needsAnswers', roleId: role.id })
      return
    }
    setApplyState('applying')
    try {
      const answers = Object.fromEntries(role.questions.map((q) => [q.id, answerFor(q, state.drafts[role.id]).trim()]))
      const { sentAt } = await requestIntro(role.id, answers)
      const commit = () => {
        pendingSend.current = null
        dispatch({ type: 'application/sent', roleId: role.id, answers, at: sentAt })
      }
      pendingSend.current = commit
      setApplyState('applied')
      // Hold the tick for a beat, then the card leaves the stack.
      window.setTimeout(
        () =>
          collapse(() => {
            commit()
            toast({
              message: `Applied to ${role.company}.`,
              tone: 'success',
              action: {
                label: 'Undo',
                onClick: () => {
                  dispatch({ type: 'application/withdrawn', roleId: role.id })
                  void withdrawRequest(role.id).catch(() => undefined)
                },
              },
            })
          }),
        prefersReducedMotion() ? 0 : 750,
      )
    } catch (err) {
      setApplyState('idle')
      toast({ message: errorMessage(err), tone: 'error', action: { label: 'Retry', onClick: () => void apply() } })
    }
  }

  // Listed facts first, then what the listing leaves out.
  const ordered = [
    role.company,
    role.pay,
    role.workStyle,
    role.location,
    role.workStyle ? null : 'work pattern not listed',
    role.pay ? null : 'pay not listed',
  ].filter(Boolean)

  return (
    <li ref={ref} data-card className={styles.item}>
      <div ref={card} className={`${styles.card} ${applyState === 'applied' ? styles.cardApplied : ''}`}>
        <div className={styles.top}>
          <CompanyLogo initials={role.initials} tone={role.tone} size={36} />
          <div className={styles.text}>
            <div className={styles.titleRow}>
              <h2 className={styles.title}>
                {/* Stretched link: the whole card opens the role. */}
                <Link to={detailsHref} className={styles.cardLink}>
                  {role.title}
                </Link>
              </h2>
              {match.status === 'new' && match.unseen ? <Tag>New</Tag> : null}
            </div>
            <p className={styles.meta}>{ordered.join(' · ')}</p>
          </div>
          <FitPill fit={role.fit} />
          <div className={styles.actions}>
            {match.status === 'new' ? (
              <>
                <IconButton label={`Not for me: ${label}`} onClick={() => void dismiss()} disabled={busy || applyState !== 'idle'}>
                  <X size={18} strokeWidth={2} />
                </IconButton>
                <ApplyButton
                  state={applyState}
                  needsAnswers={needsAnswers}
                  count={missing.length}
                  label={label}
                  onApply={() => void apply()}
                  onAnswer={() => navigate(`${detailsHref}#ask`)}
                />
              </>
            ) : match.status === 'requested' ? (
              app ? <StatusPill state={pillForStage(app.stage)} /> : null
            ) : (
              <Button variant="secondary" onClick={() => void restore()} loading={busy}>
                Restore
              </Button>
            )}
          </div>
        </div>
        <p className={styles.why}>{role.why}</p>
        {needsAnswers ? (
          <div className={styles.needs} role="status">
            <span className={styles.needsDot} aria-hidden />
            <p>
              {role.company} asks {missing.length === 1 ? 'one question' : `${countWord(missing.length).toLowerCase()} questions`} your
              profile doesn’t answer yet. Clera can help you draft {missing.length === 1 ? 'it' : 'them'}.
            </p>
          </div>
        ) : role.conflict && match.status === 'new' ? (
          <div className={styles.clarify}>
            <span className={styles.clarifyDot} aria-hidden />
            <p>{role.conflict}</p>
          </div>
        ) : null}
      </div>
    </li>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  const ref = useRef<HTMLButtonElement>(null)
  usePress(ref, { scale: 0.9, disabled })
  return (
    <button ref={ref} type="button" className={styles.iconBtn} aria-label={label} title="Not for me" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

/**
 * Apply → (spinner) → ✓ Applied, or — when the role asks things Clera
 * can't answer — flips over to "Answer N questions".
 */
function ApplyButton({
  state,
  needsAnswers,
  count,
  label,
  onApply,
  onAnswer,
}: {
  state: 'idle' | 'applying' | 'applied'
  needsAnswers: boolean
  count: number
  label: string
  onApply: () => void
  onAnswer: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const face = useRef<HTMLSpanElement>(null)
  const wasNeeds = useRef(needsAnswers)
  const wasApplied = useRef(false)
  usePress(ref, { disabled: state !== 'idle' })

  // Flip on the X axis when the button changes job.
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) {
      wasNeeds.current = needsAnswers
      return
    }
    if (needsAnswers && !wasNeeds.current) {
      gsap.fromTo(el, { rotateX: -90 }, { rotateX: 0, duration: 0.5, ease: 'back.out(1.8)' })
    }
    wasNeeds.current = needsAnswers
  }, [needsAnswers])

  useEffect(() => {
    if (state === 'applied' && !wasApplied.current && face.current && !prefersReducedMotion()) {
      gsap.fromTo(face.current, { scale: 0.4, rotate: -30 }, { scale: 1, rotate: 0, duration: 0.45, ease: 'back.out(2.6)' })
    }
    wasApplied.current = state === 'applied'
  }, [state])

  const words = count === 1 ? 'Answer 1 question' : `Answer ${count} questions`
  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.apply} ${needsAnswers ? styles.applyNeeds : ''} ${state === 'applied' ? styles.applyDone : ''}`}
      aria-label={needsAnswers ? `${words}: ${label}` : state === 'applied' ? `Applied: ${label}` : `Apply: ${label}`}
      aria-busy={state === 'applying' || undefined}
      disabled={state !== 'idle'}
      onClick={needsAnswers ? onAnswer : onApply}
    >
      {state === 'applying' ? (
        <Spinner size={16} />
      ) : state === 'applied' ? (
        <>
          <span ref={face} className={styles.tick} aria-hidden>
            <Check size={14} strokeWidth={3} />
          </span>
          Applied
        </>
      ) : needsAnswers ? (
        <>
          {words}
          <ArrowRight size={15} aria-hidden />
        </>
      ) : (
        'Apply'
      )}
    </button>
  )
}
