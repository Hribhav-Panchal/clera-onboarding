import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { errorMessage, saveEssentials, startMatching } from '../../api/client'
import { Button } from '../../components/Button'
import { ChoiceGroup } from '../../components/ChoiceGroup'
import { TextField } from '../../components/Field'
import { OnboardingShell } from '../../components/OnboardingShell'
import { Tag } from '../../components/Tag'
import { useToast } from '../../components/Toast'
import type { Essentials, VisaNeed, WorkStyle } from '../../data/types'
import { listJoin } from '../../lib/format'
import { gsap, prefersReducedMotion } from '../../lib/motion'
import { useReveal } from '../../lib/useReveal'
import { LIMITS, parsePay, validateEssentials, type EssentialsErrors } from '../../lib/validation'
import { useAppState, useDispatch } from '../../state/store'
import { onboardingSteps } from './steps'
import styles from './EssentialsPage.module.css'

const WORK_STYLES: { value: WorkStyle; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

const VISA: { value: VisaNeed; label: string }[] = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
  { value: 'unsure', label: 'Not sure' },
]

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function summarize(e: Essentials): string {
  const modes = e.workStyles.map((w) => WORK_STYLES.find((x) => x.value === w)!.label.toLowerCase())
  const city = e.location.split(',')[0].trim()
  return [e.targetRole.trim(), city, modes.length ? listJoin(modes).replace(' and ', ' or ') : null]
    .filter(Boolean)
    .join(' · ')
}

export function EssentialsPage() {
  const { profile } = useAppState()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const e = profile.essentials
  const [errors, setErrors] = useState<EssentialsErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof Essentials, boolean>>>({})
  const [payText, setPayText] = useState(e.minBasePay ? e.minBasePay.toLocaleString('en-US') : '')
  const [save, setSave] = useState<SaveStatus>(profile.savedAt ? 'saved' : 'idle')
  const [submitting, setSubmitting] = useState(false)
  const dirty = useRef(false)
  const page = useRef<HTMLDivElement>(null)
  const quick = useRef<HTMLDivElement>(null)
  useReveal(page)

  const fromResume = profile.source === 'resume' || profile.source === 'mcp'
  const valid = useMemo(() => Object.keys(validateEssentials(e)).length === 0, [e])

  // Autosave 600ms after the last edit.
  useEffect(() => {
    if (!dirty.current) return
    setSave('saving')
    const ctrl = new AbortController()
    const t = window.setTimeout(async () => {
      try {
        const { savedAt } = await saveEssentials(e, ctrl.signal)
        dispatch({ type: 'essentials/saved', at: savedAt })
        setSave('saved')
      } catch (err) {
        if (!ctrl.signal.aborted) setSave('error')
        void err
      }
    }, 600)
    return () => {
      window.clearTimeout(t)
      ctrl.abort()
    }
  }, [e, dispatch])

  // Warn before closing the tab mid-save.
  useEffect(() => {
    if (save !== 'saving') return
    const h = (ev: BeforeUnloadEvent) => ev.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [save])

  if (profile.onboarded) return <Navigate to="/" replace />
  if (profile.source === null) return <Navigate to="/onboarding/resume" replace />

  const change = (patch: Partial<Essentials>) => {
    dirty.current = true
    dispatch({ type: 'essentials/changed', patch })
    // Only re-check fields already showing an error, so messages clear as you fix them.
    const all = validateEssentials({ ...e, ...patch })
    setErrors((prev) => {
      const out: EssentialsErrors = {}
      for (const k of Object.keys(prev) as (keyof Essentials)[]) if (all[k]) out[k] = all[k]
      return out
    })
  }

  const blur = (k: keyof Essentials) => {
    setTouched((t) => ({ ...t, [k]: true }))
    const all = validateEssentials(e)
    setErrors((prev) => ({ ...prev, [k]: all[k] }))
  }

  const submit = async () => {
    const all = validateEssentials(e)
    setErrors(all)
    setTouched({ targetRole: true, location: true, minBasePay: true, workStyles: true, visa: true })
    const firstInvalid = (['targetRole', 'location', 'minBasePay', 'workStyles', 'visa'] as const).find((k) => all[k])
    if (firstInvalid) {
      const el = document.querySelector<HTMLElement>(`[data-field="${firstInvalid}"] input, [data-field="${firstInvalid}"] [role] button`)
      el?.focus()
      el?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
      return
    }
    setSubmitting(true)
    try {
      const { startedAt } = await startMatching(e)
      dispatch({ type: 'onboarding/completed', at: startedAt })
      navigate('/', { replace: true })
    } catch (err) {
      toast({ message: errorMessage(err), tone: 'error', action: { label: 'Retry', onClick: () => void submit() } })
    } finally {
      setSubmitting(false)
    }
  }

  const onPayChange = (raw: string) => {
    setPayText(raw)
    const n = parsePay(raw)
    change({ minBasePay: n })
  }

  const statusText =
    save === 'saving' ? 'Saving…' : save === 'saved' ? 'All changes saved' : save === 'error' ? 'Could not save.' : ''

  return (
    <OnboardingShell
      steps={onboardingSteps(profile, 'essentials')}
      saving={save === 'saving'}
      onSaveExit={() => toast({ message: 'Progress saved. Come back any time to finish setting up.' })}
    >
      <div ref={page} className={styles.task}>
        <div className={styles.intro}>
          <p className={styles.eyebrow} data-reveal>
            Step 2 of 2
          </p>
          <h1 className={styles.title} data-split>
            What should your next role look like?
          </h1>
          <p className={styles.lede} data-reveal>
            {fromResume
              ? 'We filled these in from your resume. Confirm them and we start looking.'
              : 'Tell us the basics and we start looking. You can refine everything later.'}
          </p>
        </div>

        {fromResume && valid ? (
          <>
            <div ref={quick} className={styles.looksRight} data-reveal>
              <div className={styles.looksText}>
                <p className={styles.looksTitle}>{summarize(e)}</p>
                <p className={styles.looksBody}>Filled from your resume. If this looks right, start matching and refine later.</p>
              </div>
              <Button onClick={() => void submit()} loading={submitting} loadingLabel="Starting matching">
                Start matching
              </Button>
            </div>
            <p className={styles.or} data-reveal>
              Or check each detail below
            </p>
          </>
        ) : null}

        <div data-field="targetRole" data-reveal>
          <TextField
            label="Target role"
            tag={profile.prefilled.targetRole ? <Tag>From your resume</Tag> : null}
            value={e.targetRole}
            maxLength={LIMITS.role}
            autoComplete="organization-title"
            placeholder="e.g. Product Designer"
            onChange={(ev) => change({ targetRole: ev.target.value })}
            onBlur={() => blur('targetRole')}
            error={errors.targetRole}
            hint="Change this if you want a different direction."
          />
        </div>

        <div data-field="location" data-reveal>
          <TextField
            label="Preferred location"
            tag={profile.prefilled.location ? <Tag>From your resume</Tag> : null}
            value={e.location}
            maxLength={LIMITS.location}
            autoComplete="address-level2"
            placeholder="City, or Remote"
            onChange={(ev) => change({ location: ev.target.value })}
            onBlur={() => blur('location')}
            error={errors.location}
          />
        </div>

        <div data-field="minBasePay" data-reveal>
          <TextField
            label="Minimum base pay · optional"
            value={payText}
            inputMode="decimal"
            placeholder="Add an amount"
            prefix={payText ? '$' : undefined}
            onChange={(ev) => onPayChange(ev.target.value)}
            onBlur={() => {
              blur('minBasePay')
              if (e.minBasePay && Number.isFinite(e.minBasePay)) setPayText(e.minBasePay.toLocaleString('en-US'))
            }}
            error={errors.minBasePay}
            hint={errors.minBasePay ? undefined : 'Leave this open if you are flexible.'}
          />
        </div>

        <div data-field="workStyles" data-reveal>
          <ChoiceGroup
            multiple
            label="Which work styles would you consider?"
            hint="Pick all that work for you."
            options={WORK_STYLES}
            value={e.workStyles}
            onChange={(v) => {
              setTouched((t) => ({ ...t, workStyles: true }))
              change({ workStyles: v })
            }}
            error={touched.workStyles ? validateEssentials(e).workStyles : undefined}
          />
        </div>

        <div data-field="visa" data-reveal>
          <ChoiceGroup
            label="Will you need visa sponsorship for a US role?"
            hint="This keeps roles that cannot sponsor out of your matches."
            options={VISA}
            value={e.visa ? [e.visa] : []}
            onChange={([v]) => {
              setTouched((t) => ({ ...t, visa: true }))
              change({ visa: v })
            }}
            error={touched.visa ? validateEssentials(e).visa : undefined}
          />
        </div>

        <p className={styles.privacy} data-reveal>
          Your profile stays private. A company sees it only when you send an introduction, which you review first.
          Industries and company size can wait.
        </p>

        <div className={styles.footer} data-reveal>
          <Button variant="secondary" to="/onboarding/resume">
            Back
          </Button>
          <span className={styles.grow} />
          <SaveIndicator status={save} text={statusText} onRetry={() => change({})} />
          <Button onClick={() => void submit()} loading={submitting} loadingLabel="Starting matching">
            Start matching
          </Button>
        </div>
      </div>
    </OnboardingShell>
  )
}

function SaveIndicator({ status, text, onRetry }: { status: SaveStatus; text: string; onRetry: () => void }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (ref.current && status !== 'idle' && !prefersReducedMotion()) {
      gsap.fromTo(ref.current, { autoAlpha: 0, y: 4 }, { autoAlpha: 1, y: 0, duration: 0.25 })
    }
  }, [status])
  return (
    <span ref={ref} className={`${styles.saved} ${status === 'error' ? styles.saveError : ''}`} role="status" aria-live="polite">
      {text}
      {status === 'error' ? (
        <button type="button" className="link" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </span>
  )
}
