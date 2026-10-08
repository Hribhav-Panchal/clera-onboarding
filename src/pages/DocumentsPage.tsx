import { FileImage, FileText, Plus, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { deleteDocument, errorMessage, isAbort, uploadDocument, uploadResume } from '../api/client'
import { askAssistant } from '../assistant/ask'
import { useAssistantContext } from '../assistant/context'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useToast } from '../components/Toast'
import type { DocumentKind, ExtraDocument } from '../data/types'
import { bytes, dayLabel } from '../lib/format'
import { gsap, prefersReducedMotion } from '../lib/motion'
import { useReveal } from '../lib/useReveal'
import { checkDocumentFile, checkResumeFile, DOCUMENT_ACCEPT, MAX_DOCUMENTS } from '../lib/validation'
import { useAppState, useDispatch } from '../state/store'
import { LinksSection } from './profile/ProfilePage'
import p from './profile/profile.module.css'
import styles from './DocumentsPage.module.css'

export const DOC_KINDS: Record<DocumentKind, string> = {
  portfolio: 'Portfolio',
  'cover-letter': 'Cover letter',
  certificate: 'Certificate',
  'writing-sample': 'Writing sample',
  reference: 'Reference',
  other: 'Other',
}

export function guessKind(name: string): DocumentKind {
  const n = name.toLowerCase()
  if (/portfolio|case[-_ ]?stud/.test(n)) return 'portfolio'
  if (/cover/.test(n)) return 'cover-letter'
  if (/cert|certificate|license/.test(n)) return 'certificate'
  if (/reference|recommend/.test(n)) return 'reference'
  if (/writing|essay|article|sample/.test(n)) return 'writing-sample'
  return 'other'
}

interface Pending {
  key: string
  name: string
  size: number
  pct: number
  ctrl: AbortController
}

/** Documents — the resume plus anything else the candidate wants Clera to know. */
export function DocumentsPage() {
  const { profile } = useAppState()
  const page = useRef<HTMLDivElement>(null)
  useReveal(page)
  useAssistantContext('documents', 'I can tailor your CV for a specific role, or tighten it overall. Anything you add here helps me write better answers.', [
    'Improve my CV for Colare',
    'What is weak in my resume?',
    'Which documents should I share?',
  ])

  return (
    <div ref={page} className={p.page}>
      <header className={p.header} data-reveal>
        <h1 className={p.h1}>Documents</h1>
        <p className={p.sub}>
          Your resume, plus anything else that helps Clera represent you. Only your resume goes out with an introduction
          unless you choose to share more.
        </p>
      </header>
      <ResumeSection />
      <OtherDocuments />
      <LinksSection details={profile.details} />
      <AboutYou />
    </div>
  )
}

/* -------------------------------------------------------------- Resume */

function ResumeSection() {
  const { profile } = useAppState()
  const dispatch = useDispatch()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const ctrl = useRef<AbortController | null>(null)
  const r = profile.resume

  useEffect(() => () => ctrl.current?.abort(), [])

  const replace = async (file: File | undefined) => {
    if (!file) return
    const check = checkResumeFile(file)
    if (!check.ok) return toast({ message: check.reason, tone: 'error' })
    ctrl.current = new AbortController()
    setBusy(0)
    try {
      const res = await uploadResume(file, { signal: ctrl.current.signal, onProgress: setBusy })
      dispatch({ type: 'resume/replaced', resume: res.resume, details: res.details })
      toast({ message: 'Resume updated. Profile details refreshed — your own edits were kept.', tone: 'success' })
    } catch (err) {
      if (!isAbort(err)) toast({ message: errorMessage(err), tone: 'error' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className={p.section} aria-labelledby="resume-title" data-reveal>
      <div className={p.sectionHead}>
        <h2 id="resume-title" className={p.h2}>
          Resume
        </h2>
        <span className={p.meta}>Always shared with introductions</span>
      </div>
      <Card padding="md">
        <div className={styles.fileRow}>
          <span className={styles.fileIcon} aria-hidden>
            <FileText size={18} />
          </span>
          <div className={styles.fileText}>
            {r ? (
              <>
                <p className={styles.fileName}>{r.fileName}</p>
                <p className={p.meta}>
                  {busy !== null ? `Uploading · ${busy}%` : `PDF · ${bytes(r.size)} · added ${dayLabel(r.uploadedAt)}`}
                </p>
              </>
            ) : (
              <>
                <p className={styles.fileName}>No resume yet</p>
                <p className={p.meta}>Add one and Clera fills in your experience, education and skills.</p>
              </>
            )}
          </div>
          {r ? (
            <Button variant="ghost" onClick={() => askAssistant('Improve my CV for Colare')}>
              Improve with Clera
            </Button>
          ) : null}
          <Button
            variant="secondary"
            loading={busy !== null}
            loadingLabel="Uploading resume"
            onClick={() => input.current?.click()}
          >
            {r ? 'Replace' : 'Add resume'}
          </Button>
          <input
            ref={input}
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              void replace(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </Card>
    </section>
  )
}

/* ----------------------------------------------------- Other documents */

function OtherDocuments() {
  const { profile } = useAppState()
  const dispatch = useDispatch()
  const toast = useToast()
  const [pending, setPending] = useState<Pending[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const pendingRef = useRef(pending)
  useEffect(() => {
    pendingRef.current = pending
  }, [pending])
  useEffect(() => () => pendingRef.current.forEach((x) => x.ctrl.abort()), [])

  const docs = profile.documents
  const room = MAX_DOCUMENTS - docs.length - pending.length

  const addFiles = (files: FileList | File[] | null) => {
    const all = files ? Array.from(files) : []
    if (!all.length) return
    const errs: string[] = []
    let used = docs.length + pending.length
    for (const file of all) {
      const check = checkDocumentFile(file, used)
      if (!check.ok) {
        errs.push(check.reason)
        continue
      }
      used++
      void upload(file)
    }
    setErrors(errs)
  }

  const upload = async (file: File) => {
    const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`
    const ctrl = new AbortController()
    setPending((xs) => [...xs, { key, name: file.name, size: file.size, pct: 0, ctrl }])
    try {
      const doc = await uploadDocument(file, guessKind(file.name), {
        signal: ctrl.signal,
        onProgress: (pct) => setPending((xs) => xs.map((x) => (x.key === key ? { ...x, pct } : x))),
      })
      dispatch({ type: 'documents/added', doc })
      requestAnimationFrame(() => {
        const row = list.current?.querySelector(`[data-doc="${doc.id}"]`)
        if (row && !prefersReducedMotion()) gsap.from(row, { autoAlpha: 0, y: 8, duration: 0.35, ease: 'power3.out' })
      })
    } catch (err) {
      if (!isAbort(err)) setErrors((e) => [...e, `“${file.name}” didn’t upload. ${errorMessage(err)}`])
    } finally {
      setPending((xs) => xs.filter((x) => x.key !== key))
    }
  }

  const remove = (doc: ExtraDocument) => {
    const index = docs.findIndex((x) => x.id === doc.id)
    dispatch({ type: 'documents/removed', id: doc.id })
    void deleteDocument(doc.id).catch(() => undefined)
    toast({
      message: `Removed “${doc.name}”.`,
      action: { label: 'Undo', onClick: () => dispatch({ type: 'documents/restored', doc, index }) },
    })
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    depth.current = 0
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  return (
    <section className={p.section} aria-labelledby="docs-title" data-reveal>
      <div className={p.sectionHead}>
        <h2 id="docs-title" className={p.h2}>
          Other documents
        </h2>
        <span className={p.meta}>
          {docs.length}/{MAX_DOCUMENTS}
        </span>
      </div>
      <Card padding="none">
        {docs.length || pending.length ? (
          <ul ref={list} className={p.rows}>
            {docs.map((d) => (
              <li key={d.id} data-doc={d.id} className={`${p.row} ${styles.docRow}`}>
                <span className={styles.fileIcon} aria-hidden>
                  {d.mime.startsWith('image/') ? <FileImage size={18} /> : <FileText size={18} />}
                </span>
                <div className={p.rowMain}>
                  <p className={styles.fileName}>{d.name}</p>
                  <p className={p.meta}>
                    {bytes(d.size)} · added {dayLabel(d.addedAt)}
                  </p>
                </div>
                <label className="sr-only" htmlFor={`kind-${d.id}`}>
                  Document type for {d.name}
                </label>
                <select
                  id={`kind-${d.id}`}
                  className={p.select}
                  value={d.kind}
                  onChange={(e) => dispatch({ type: 'documents/updated', id: d.id, patch: { kind: e.target.value as DocumentKind } })}
                >
                  {(Object.keys(DOC_KINDS) as DocumentKind[]).map((k) => (
                    <option key={k} value={k}>
                      {DOC_KINDS[k]}
                    </option>
                  ))}
                </select>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={d.shared}
                    onChange={(e) => dispatch({ type: 'documents/updated', id: d.id, patch: { shared: e.target.checked } })}
                  />
                  <span className={styles.track} aria-hidden>
                    <span className={styles.thumb} />
                  </span>
                  <span className={styles.switchLabel}>Share with companies</span>
                </label>
                <button type="button" className={p.iconBtn} aria-label={`Remove ${d.name}`} onClick={() => remove(d)}>
                  <X size={14} />
                </button>
              </li>
            ))}
            {pending.map((x) => (
              <li key={x.key} className={`${p.row} ${styles.docRow}`} aria-live="polite">
                <span className={styles.fileIcon} aria-hidden>
                  <FileText size={18} />
                </span>
                <div className={p.rowMain}>
                  <p className={styles.fileName}>{x.name}</p>
                  <p className={p.meta}>
                    {bytes(x.size)} · Uploading {x.pct}%
                  </p>
                  <span className={styles.progress} aria-hidden>
                    <span style={{ transform: `scaleX(${x.pct / 100})` }} />
                  </span>
                </div>
                <button type="button" className={p.iconBtn} aria-label={`Cancel upload of ${x.name}`} onClick={() => x.ctrl.abort()}>
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div
          className={`${styles.drop} ${dragging ? styles.dragging : ''} ${docs.length || pending.length ? p.topBorder : ''}`}
          onDragEnter={(e) => {
            e.preventDefault()
            depth.current += 1
            setDragging(true)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault()
            depth.current = Math.max(0, depth.current - 1)
            if (!depth.current) setDragging(false)
          }}
          onDrop={onDrop}
        >
          <span className={styles.dropIcon} aria-hidden>
            <Upload size={18} />
          </span>
          <div className={styles.dropText}>
            <p className={styles.fileName}>{dragging ? 'Drop to add' : 'Add portfolio, cover letters, certificates…'}</p>
            <p className={p.meta}>PDF, Word, text or images · up to 10 MB each · private until you share them</p>
          </div>
          <Button variant="secondary" disabled={room <= 0} onClick={() => input.current?.click()} leading={<Plus size={14} />}>
            Add files
          </Button>
          <input
            ref={input}
            type="file"
            multiple
            accept={DOCUMENT_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
        {errors.length ? (
          <ul className={styles.errors} role="alert">
            {errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : null}
      </Card>
    </section>
  )
}

/* ----------------------------------------------------------- About you */

function AboutYou() {
  const { profile } = useAppState()
  const dispatch = useDispatch()
  const toast = useToast()
  const [text, setText] = useState('')
  const MAX = 500
  const count = profile.details.notes.length

  const save = (e: FormEvent) => {
    e.preventDefault()
    const clean = text.trim()
    if (!clean) return
    dispatch({
      type: 'details/noteAdded',
      note: { id: `note-${Date.now().toString(36)}`, text: clean, source: 'you', addedAt: new Date().toISOString() },
    })
    setText('')
    toast({ message: 'Added to your profile.', tone: 'success' })
  }

  return (
    <section className={p.section} aria-labelledby="about-you-title" data-reveal>
      <div className={p.sectionHead}>
        <h2 id="about-you-title" className={p.h2}>
          Tell Clera about yourself
        </h2>
      </div>
      <Card padding="md">
        <form className={p.form} onSubmit={save}>
          <label className={p.label}>
            <span className="sr-only">Something Clera should know</span>
            <textarea
              className={p.textarea}
              rows={3}
              maxLength={MAX}
              value={text}
              placeholder="Anything your resume doesn’t say: what you want more of, side projects, constraints, the kind of team you do your best work in."
              onChange={(e) => setText(e.target.value)}
            />
            <span className={p.counter}>
              {text.length}/{MAX}
            </span>
          </label>
          <div className={styles.aboutFoot}>
            <p className={p.meta}>
              {count ? (
                <>
                  {count} {count === 1 ? 'note' : 'notes'} on your <Link to="/profile" className="link">profile</Link>. You can also tell Clera in chat.
                </>
              ) : (
                'Shows up on your profile. You can also tell Clera in chat.'
              )}
            </p>
            <Button type="submit" disabled={!text.trim()}>
              Add to profile
            </Button>
          </div>
        </form>
      </Card>
    </section>
  )
}
