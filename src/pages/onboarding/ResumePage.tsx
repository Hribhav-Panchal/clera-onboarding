import { Check, FileText, MessageCircle, Upload, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorMessage, isAbort, uploadResume } from '../../api/client'
import { AIMark } from '../../components/AIMark'
import { Button } from '../../components/Button'
import { OnboardingShell } from '../../components/OnboardingShell'
import { useToast } from '../../components/Toast'
import { bytes } from '../../lib/format'
import { gsap, prefersReducedMotion } from '../../lib/motion'
import { useHoverLift } from '../../lib/useHoverLift'
import { useReveal } from '../../lib/useReveal'
import { checkResumeFile } from '../../lib/validation'
import { useAppState, useDispatch } from '../../state/store'
import { onboardingSteps } from './steps'
import styles from './ResumePage.module.css'

type Phase =
  | { kind: 'idle' }
  | { kind: 'uploading'; file: File; pct: number }
  | { kind: 'reading'; file: File }
  | { kind: 'done'; file: File }
  | { kind: 'error'; message: string }

export function ResumePage() {
  const { profile } = useAppState()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const input = useRef<HTMLInputElement>(null)
  const zone = useRef<HTMLDivElement>(null)
  const icon = useRef<HTMLSpanElement>(null)
  const abort = useRef<AbortController | null>(null)
  const page = useRef<HTMLDivElement>(null)
  useReveal(page)

  // Stop the browser from opening a PDF dropped anywhere outside the zone.
  useEffect(() => {
    const block = (e: Event) => e.preventDefault()
    window.addEventListener('dragover', block)
    window.addEventListener('drop', block)
    return () => {
      window.removeEventListener('dragover', block)
      window.removeEventListener('drop', block)
      abort.current?.abort()
    }
  }, [])

  // Icon lifts while a file hovers over the drop zone.
  useEffect(() => {
    if (!icon.current || prefersReducedMotion()) return
    const t = dragging
      ? gsap.to(icon.current, { y: -5, scale: 1.08, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      : gsap.to(icon.current, { y: 0, scale: 1, duration: 0.3, ease: 'power2.out' })
    return () => {
      t.kill()
    }
  }, [dragging])

  const busy = phase.kind === 'uploading' || phase.kind === 'reading' || phase.kind === 'done'

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (busy) return
      const list = files ? Array.from(files) : []
      if (list.length === 0) return
      if (list.length > 1) toast({ message: `Only one resume at a time — using “${list[0].name}”.` })
      const file = list[0]
      const check = checkResumeFile(file)
      if (!check.ok) {
        setPhase({ kind: 'error', message: check.reason })
        if (zone.current && !prefersReducedMotion()) {
          gsap.fromTo(zone.current, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' })
        }
        return
      }
      const ctrl = new AbortController()
      abort.current = ctrl
      setPhase({ kind: 'uploading', file, pct: 0 })
      try {
        const result = await uploadResume(file, {
          signal: ctrl.signal,
          onProgress: (pct) => {
            setPhase((p) => (p.kind === 'uploading' && p.file === file ? { ...p, pct } : p))
            if (pct === 100) setPhase({ kind: 'reading', file })
          },
        })
        dispatch({ type: 'resume/uploaded', resume: result.resume, essentials: result.essentials, details: result.details })
        setPhase({ kind: 'done', file })
        window.setTimeout(() => navigate('/onboarding/essentials'), prefersReducedMotion() ? 0 : 700)
      } catch (err) {
        if (isAbort(err)) {
          setPhase({ kind: 'idle' })
          return
        }
        setPhase({ kind: 'error', message: errorMessage(err) })
      } finally {
        if (abort.current === ctrl) abort.current = null
      }
    },
    [busy, dispatch, navigate, toast],
  )

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault()
    if (busy) return
    dragDepth.current += 1
    setDragging(true)
  }
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    void handleFiles(e.dataTransfer.files)
  }
  const choose = () => {
    if (!busy) input.current?.click()
  }
  const onZoneKey = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose()
    }
  }

  const startOther = (source: 'manual' | 'chat') => {
    dispatch({ type: 'profile/startManual', source })
    navigate('/onboarding/essentials')
  }

  return (
    <OnboardingShell
      steps={onboardingSteps(profile, 'profile')}
      onSaveExit={() => toast({ message: 'Progress saved. Come back any time to finish setting up.' })}
    >
      <div ref={page} className={styles.task}>
        <input
          ref={input}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.target.value = '' // allow re-selecting the same file after an error
          }}
        />
        <div className={styles.intro}>
          <p className={styles.eyebrow} data-reveal>
            Step 1 of 2
          </p>
          <h1 className={styles.title} data-split>
            Start with what you have.
          </h1>
          <p className={styles.lede} data-reveal>
            Add a resume so Clera can prepare your profile. You’ll review every detail before anything is shared.
          </p>
        </div>

        {profile.resume && phase.kind === 'idle' ? (
          <div className={styles.existing} data-reveal>
            <span className={styles.fileIcon} aria-hidden>
              <FileText size={18} />
            </span>
            <div className={styles.fileText}>
              <p className={styles.fileName}>{profile.resume.fileName}</p>
              <p className={styles.fileMeta}>{bytes(profile.resume.size)} · added</p>
            </div>
            <Button variant="ghost" onClick={choose}>
              Replace
            </Button>
            <Button to="/onboarding/essentials">Continue</Button>
          </div>
        ) : (
          <div
            ref={zone}
            data-reveal
            className={`${styles.upload} ${dragging ? styles.dragging : ''} ${phase.kind === 'error' ? styles.hasError : ''} ${busy ? styles.busy : ''}`}
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-label="Add your resume. Drop a PDF here or press Enter to choose a file."
            aria-describedby="upload-status"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return
              choose()
            }}
            onKeyDown={onZoneKey}
            onDragEnter={onDragEnter}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {phase.kind === 'uploading' || phase.kind === 'reading' || phase.kind === 'done' ? (
              <UploadProgress
                phase={phase}
                onCancel={() => {
                  abort.current?.abort()
                }}
              />
            ) : (
              <>
                <span ref={icon} className={styles.uploadIcon} aria-hidden>
                  <Upload size={22} strokeWidth={1.75} />
                </span>
                <p className={styles.uploadTitle}>{dragging ? 'Drop to upload' : 'Add your resume'}</p>
                <p id="upload-status" className={phase.kind === 'error' ? styles.uploadError : styles.uploadHint} role={phase.kind === 'error' ? 'alert' : undefined}>
                  {phase.kind === 'error' ? phase.message : 'Drop a PDF here or choose a file.'}
                </p>
                <Button variant="secondary" onClick={choose} tabIndex={-1} aria-hidden>
                  {phase.kind === 'error' ? 'Choose another file' : 'Choose file'}
                </Button>
              </>
            )}
          </div>
        )}

        <p className={styles.sectionLabel} data-reveal>
          Or start another way
        </p>
        <div className={styles.otherWays} data-reveal>
          <WayCard
            onClick={() => startOther('chat')}
            icon={
              <span className={styles.wayIcon}>
                <MessageCircle size={18} strokeWidth={1.75} />
              </span>
            }
            title="Tell Clera in chat"
            body="Answer a few questions and Clera builds the profile for you. About three minutes."
            cta="Start chatting"
          />
          <WayCard
            to="/onboarding/connect"
            icon={
              <span className={styles.marks}>
                <AIMark provider="claude" size="sm" />
                <AIMark provider="chatgpt" size="sm" />
                <AIMark provider="gemini" size="sm" />
              </span>
            }
            title="Connect Clera MCP"
            body="Already use Clera with Claude or ChatGPT? Pull your details from there."
            cta="Connect"
          />
        </div>

        <p className={styles.alt} data-reveal>
          <span>Or</span>
          <button type="button" className="link" onClick={() => startOther('manual')}>
            Enter details manually
          </button>
        </p>

        <div className={styles.notice} data-reveal>
          <span className={styles.noticeDot} aria-hidden />
          <div>
            <p className={styles.noticeTitle}>Private while you set up</p>
            <p className={styles.noticeBody}>
              Nothing is shared with a company until you send an introduction, and you review every one first.
            </p>
          </div>
        </div>
      </div>
    </OnboardingShell>
  )
}

function UploadProgress({
  phase,
  onCancel,
}: {
  phase: Extract<Phase, { kind: 'uploading' | 'reading' | 'done' }>
  onCancel: () => void
}) {
  const bar = useRef<HTMLSpanElement>(null)
  const pct = phase.kind === 'uploading' ? phase.pct : 100
  useEffect(() => {
    if (!bar.current) return
    if (prefersReducedMotion()) gsap.set(bar.current, { scaleX: pct / 100 })
    else gsap.to(bar.current, { scaleX: pct / 100, duration: 0.3, ease: 'power2.out' })
  }, [pct])

  const label =
    phase.kind === 'uploading' ? `Uploading · ${pct}%` : phase.kind === 'reading' ? 'Reading your resume…' : 'Ready. Opening your essentials…'

  return (
    <div className={styles.progress}>
      <div className={styles.progressRow}>
        <span className={`${styles.fileIcon} ${phase.kind === 'done' ? styles.fileDone : ''}`} aria-hidden>
          {phase.kind === 'done' ? <Check size={18} strokeWidth={2.25} /> : <FileText size={18} />}
        </span>
        <div className={styles.fileText}>
          <p className={styles.fileName}>{phase.file.name}</p>
          <p className={styles.fileMeta} id="upload-status" role="status">
            {bytes(phase.file.size)} · {label}
          </p>
        </div>
        {phase.kind === 'uploading' ? (
          <button type="button" className={styles.cancel} onClick={onCancel} aria-label="Cancel upload">
            <X size={16} />
          </button>
        ) : null}
      </div>
      <span className={styles.track} aria-hidden>
        <span ref={bar} className={`${styles.bar} ${phase.kind === 'reading' ? styles.shimmer : ''}`} />
      </span>
    </div>
  )
}

function WayCard({
  to,
  onClick,
  icon,
  title,
  body,
  cta,
}: {
  to?: string
  onClick?: () => void
  icon: React.ReactNode
  title: string
  body: string
  cta: string
}) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null)
  useHoverLift(ref)
  const inner = (
    <>
      {icon}
      <span className={styles.wayTitle}>{title}</span>
      <span className={styles.wayBody}>{body}</span>
      <span className={styles.wayCta}>
        {cta}
        <span className={styles.wayArrow} aria-hidden>
          →
        </span>
      </span>
    </>
  )
  return to ? (
    <Link ref={ref} to={to} className={styles.way}>
      {inner}
    </Link>
  ) : (
    <button ref={ref} type="button" onClick={onClick} className={styles.way}>
      {inner}
    </button>
  )
}
