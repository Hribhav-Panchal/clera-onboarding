import { ExternalLink, Pencil, Plus, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { saveProfileDetail } from '../../api/client'
import { askAssistant } from '../../assistant/ask'
import { useAssistantContext } from '../../assistant/context'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { SourceTag } from '../../components/SourceTag'
import { useToast } from '../../components/Toast'
import type { DetailSource, LinkKind, ProfileDetails } from '../../data/types'
import { dayLabel, listJoin } from '../../lib/format'
import { gsap, prefersReducedMotion } from '../../lib/motion'
import { useReveal } from '../../lib/useReveal'
import { normalizeUrl } from '../../lib/validation'
import { useAppState, useDispatch } from '../../state/store'
import { PreferencesCard } from './PreferencesCard'
import p from './profile.module.css'

export const LINK_LABELS: Record<LinkKind, string> = {
  portfolio: 'Portfolio',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  website: 'Website',
  other: 'Link',
}

const LIMITS = { headline: 120, summary: 600, skill: 40, skills: 30, note: 280 }

/** Profile — everything Clera knows about the candidate, and where it came from. */
export function ProfilePage() {
  const { profile } = useAppState()
  const page = useRef<HTMLDivElement>(null)
  useReveal(page)
  useAssistantContext(
    'profile',
    'This is what I know about you. Tell me anything else worth knowing — start with “Remember that…” and I will add it here.',
    ['Remember that I prefer small teams', 'What is missing from my profile?', 'Should I set a minimum pay?'],
  )
  const d = profile.details

  return (
    <div ref={page} className={p.page}>
      <header className={p.header} data-reveal>
        <h1 className={p.h1}>Profile</h1>
        <p className={p.sub}>What Clera knows about you. Companies only see it when you send an introduction.</p>
      </header>

      <Sources />
      <About details={d} />
      <ExperienceSection details={d} />
      <div className={p.split}>
        <SkillsSection details={d} />
        <EducationSection details={d} />
      </div>
      <NotesSection details={d} />
      <LinksSection details={d} />
      <PreferencesCard />
    </div>
  )
}

/* ------------------------------------------------------------- Sources */

function Sources() {
  const { profile } = useAppState()
  const d = profile.details
  const fromChat = d.notes.filter((n) => n.source === 'chat').length + d.skills.filter((s) => s.source === 'chat').length
  const parts: string[] = []
  if (profile.resume) parts.push(`your resume (${profile.resume.fileName}, added ${dayLabel(profile.resume.uploadedAt)})`)
  if (d.aboutSource === 'chat' && !profile.resume) parts.push('your connected AI conversations')
  if (fromChat) parts.push(`${fromChat} ${fromChat === 1 ? 'thing' : 'things'} you told Clera in chat`)
  const used = new Set<DetailSource>([
    ...(d.aboutSource ? [d.aboutSource] : []),
    ...d.experience.map((x) => x.source),
    ...d.skills.map((x) => x.source),
    ...d.notes.map((x) => x.source),
    ...d.links.map((x) => x.source),
  ])

  return (
    <div className={p.sources} data-reveal>
      <div className={p.sourcesText}>
        <p className={p.sourcesTitle}>{parts.length ? `Built from ${listJoin(parts)}.` : 'Your profile is mostly empty.'}</p>
        <p className={p.meta}>
          {parts.length
            ? 'Every detail shows where it came from. Edit anything that is wrong — your edits win over anything Clera reads later.'
            : 'Add your resume or tell Clera about yourself in chat, and the details will show up here.'}
        </p>
        {used.size ? (
          <div className={p.legend}>
            {(['resume', 'chat', 'you'] as const)
              .filter((s) => used.has(s))
              .map((s) => (
                <SourceTag key={s} source={s} />
              ))}
          </div>
        ) : null}
      </div>
      <Button variant="secondary" to="/documents">
        {profile.resume ? 'Update resume' : 'Add resume'}
      </Button>
    </div>
  )
}

/* --------------------------------------------------------------- About */

function About({ details }: { details: ProfileDetails }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [headline, setHeadline] = useState(details.headline)
  const [summary, setSummary] = useState(details.summary)
  const [saving, setSaving] = useState(false)
  const empty = !details.headline && !details.summary

  const start = () => {
    setHeadline(details.headline)
    setSummary(details.summary)
    setEditing(true)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await saveProfileDetail()
      dispatch({ type: 'details/aboutChanged', headline: headline.trim(), summary: summary.trim() })
      setEditing(false)
      toast({ message: 'About saved.', tone: 'success' })
    } catch {
      toast({ message: 'Could not save. Try again.', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={p.section} aria-labelledby="about-title" data-reveal>
      <div className={p.sectionHead}>
        <h2 id="about-title" className={p.h2}>
          About
        </h2>
        {details.aboutSource && !editing ? <SourceTag source={details.aboutSource} /> : null}
        <span className={p.grow} />
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={start} leading={<Pencil size={13} />}>
            {empty ? 'Add' : 'Edit'}
          </Button>
        ) : null}
      </div>
      <Card padding="md">
        {editing ? (
          <form className={p.form} onSubmit={save}>
            <label className={p.label}>
              Headline
              <input
                className={p.input}
                value={headline}
                maxLength={LIMITS.headline}
                autoFocus
                placeholder="e.g. Product designer who turns complex workflows into simple tools"
                onChange={(e) => setHeadline(e.target.value)}
              />
            </label>
            <label className={p.label}>
              Summary
              <textarea
                className={p.textarea}
                value={summary}
                maxLength={LIMITS.summary}
                rows={4}
                placeholder="A few sentences on what you do and what you want next."
                onChange={(e) => setSummary(e.target.value)}
              />
              <span className={p.counter}>
                {summary.length}/{LIMITS.summary}
              </span>
            </label>
            <div className={p.actions}>
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} disabled={!headline.trim()}>
                Save
              </Button>
            </div>
          </form>
        ) : empty ? (
          <p className={p.empty}>Add a one-line headline so companies know what you do at a glance.</p>
        ) : (
          <>
            <p className={p.headline}>{details.headline}</p>
            {details.summary ? <p className={p.summary}>{details.summary}</p> : null}
          </>
        )}
      </Card>
    </section>
  )
}

/* ---------------------------------------------------------- Experience */

function ExperienceSection({ details }: { details: ProfileDetails }) {
  return (
    <section className={p.section} aria-labelledby="exp-title" data-reveal>
      <div className={p.sectionHead}>
        <h2 id="exp-title" className={p.h2}>
          Experience
        </h2>
      </div>
      <Card padding="none">
        {details.experience.length === 0 ? (
          <p className={`${p.empty} ${p.pad}`}>
            Nothing yet. <Link to="/documents" className="link">Add your resume</Link> and Clera fills this in.
          </p>
        ) : (
          <ul className={p.rows}>
            {details.experience.map((x) => (
              <li key={x.id} className={p.row}>
                <div className={p.rowMain}>
                  <p className={p.rowTitle}>
                    {x.title} · {x.company}
                  </p>
                  <p className={p.meta}>
                    {[`${x.start} – ${x.end ?? 'present'}`, x.location].filter(Boolean).join(' · ')}
                  </p>
                  {x.highlights.length ? (
                    <ul className={p.bullets}>
                      {x.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <SourceTag source={x.source} at={x.addedAt} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}

/* -------------------------------------------------------------- Skills */

function SkillsSection({ details }: { details: ProfileDetails }) {
  const dispatch = useDispatch()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const list = useRef<HTMLUListElement>(null)

  const add = (e: FormEvent) => {
    e.preventDefault()
    const name = draft.trim().replace(/\s+/g, ' ')
    if (!name) return
    if (details.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setError(`“${name}” is already on your profile.`)
      return
    }
    if (details.skills.length >= LIMITS.skills) {
      setError(`Keep it to ${LIMITS.skills} skills — the strongest ones read best.`)
      return
    }
    dispatch({ type: 'details/skillAdded', name, at: new Date().toISOString() })
    setDraft('')
    setError('')
    requestAnimationFrame(() => {
      const last = list.current?.lastElementChild
      if (last && !prefersReducedMotion()) gsap.from(last, { scale: 0.6, autoAlpha: 0, duration: 0.4, ease: 'back.out(2)' })
    })
  }

  return (
    <section className={p.section} aria-labelledby="skills-title" data-reveal>
      <div className={p.sectionHead}>
        <h2 id="skills-title" className={p.h2}>
          Skills
        </h2>
      </div>
      <Card padding="md" className={p.fill}>
        {details.skills.length ? (
          <ul ref={list} className={p.chips}>
            {details.skills.map((s) => (
              <li key={s.name} className={p.chip} title={`${s.name} · ${s.source === 'resume' ? 'from your resume' : s.source === 'chat' ? 'from your chats' : 'added by you'}`}>
                <span className={`${p.dot} ${p[`dot-${s.source}`]}`} aria-hidden />
                {s.name}
                <button
                  type="button"
                  className={p.chipRemove}
                  aria-label={`Remove ${s.name}`}
                  onClick={() => dispatch({ type: 'details/skillRemoved', name: s.name })}
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={p.empty}>No skills yet.</p>
        )}
        <form className={p.inlineForm} onSubmit={add}>
          <label htmlFor="add-skill" className="sr-only">
            Add a skill
          </label>
          <input
            id="add-skill"
            className={p.input}
            value={draft}
            maxLength={LIMITS.skill}
            placeholder="Add a skill"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? 'skill-error' : undefined}
            onChange={(e) => {
              setDraft(e.target.value)
              setError('')
            }}
          />
          <Button type="submit" variant="secondary" size="sm" disabled={!draft.trim()} leading={<Plus size={14} />}>
            Add
          </Button>
        </form>
        {error ? (
          <p id="skill-error" className={p.error} role="alert">
            {error}
          </p>
        ) : null}
        <p className={p.legendLine}>
          <span className={`${p.dot} ${p['dot-resume']}`} aria-hidden /> Resume
          <span className={`${p.dot} ${p['dot-chat']}`} aria-hidden /> Chats
          <span className={`${p.dot} ${p['dot-you']}`} aria-hidden /> You
        </p>
      </Card>
    </section>
  )
}

/* ----------------------------------------------------------- Education */

function EducationSection({ details }: { details: ProfileDetails }) {
  return (
    <section className={p.section} aria-labelledby="edu-title" data-reveal>
      <div className={p.sectionHead}>
        <h2 id="edu-title" className={p.h2}>
          Education
        </h2>
      </div>
      <Card padding="md" className={p.fill}>
        {details.education.length === 0 ? (
          <p className={p.empty}>Nothing yet. It comes from your resume.</p>
        ) : (
          <ul className={p.stack}>
            {details.education.map((x) => (
              <li key={x.id}>
                <p className={p.rowTitle}>{x.school}</p>
                <p className={p.meta}>{[x.degree, x.year].filter(Boolean).join(' · ')}</p>
                <div className={p.tagRow}>
                  <SourceTag source={x.source} at={x.addedAt} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}

/* ---------------------------------------------- Notes (chats + by you) */

function NotesSection({ details }: { details: ProfileDetails }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const [draft, setDraft] = useState('')

  const add = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    dispatch({
      type: 'details/noteAdded',
      note: { id: `note-${Date.now().toString(36)}`, text, source: 'you', addedAt: new Date().toISOString() },
    })
    setDraft('')
  }

  const remove = (id: string) => {
    const index = details.notes.findIndex((n) => n.id === id)
    const note = details.notes[index]
    if (!note) return
    dispatch({ type: 'details/noteRemoved', id })
    toast({ message: 'Removed from your profile.', action: { label: 'Undo', onClick: () => dispatch({ type: 'details/noteRestored', note, index }) } })
  }

  return (
    <section className={p.section} aria-labelledby="notes-title" data-reveal>
      <div className={p.sectionHead}>
        <h2 id="notes-title" className={p.h2}>
          What you’ve told Clera
        </h2>
        <span className={p.grow} />
        <Button variant="ghost" size="sm" onClick={() => askAssistant('What is missing from my profile?')}>
          Ask what’s missing
        </Button>
      </div>
      <Card padding="none">
        {details.notes.length ? (
          <ul className={p.rows}>
            {details.notes.map((n) => (
              <li key={n.id} className={p.row}>
                <div className={p.rowMain}>
                  <p className={p.note}>{n.text}</p>
                  <p className={p.meta}>
                    {n.source === 'chat' ? 'Said in chat' : 'Added'} {dayLabel(n.addedAt)}
                  </p>
                </div>
                <SourceTag source={n.source} at={n.addedAt} />
                <button type="button" className={p.iconBtn} aria-label={`Remove: ${n.text}`} onClick={() => remove(n.id)}>
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`${p.empty} ${p.pad}`}>
            Preferences and context you share in chat land here — try telling Clera “Remember that I prefer small teams”.
          </p>
        )}
        <form className={`${p.inlineForm} ${p.pad} ${p.topBorder}`} onSubmit={add}>
          <label htmlFor="add-note" className="sr-only">
            Add something Clera should know
          </label>
          <input
            id="add-note"
            className={p.input}
            value={draft}
            maxLength={LIMITS.note}
            placeholder="Add something Clera should know about you"
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="sm" disabled={!draft.trim()} leading={<Plus size={14} />}>
            Add
          </Button>
        </form>
      </Card>
    </section>
  )
}

/* --------------------------------------------------------------- Links */

export function LinksSection({ details, compactHead = false }: { details: ProfileDetails; compactHead?: boolean }) {
  const dispatch = useDispatch()
  const [kind, setKind] = useState<LinkKind>('portfolio')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const add = (e: FormEvent) => {
    e.preventDefault()
    const clean = normalizeUrl(url)
    if (!clean) {
      setError('Enter a web address, like example.com/portfolio.')
      return
    }
    if (details.links.some((l) => l.url === clean)) {
      setError('That link is already on your profile.')
      return
    }
    dispatch({
      type: 'details/linkAdded',
      link: { id: `link-${Date.now().toString(36)}`, kind, url: clean, source: 'you', addedAt: new Date().toISOString() },
    })
    setUrl('')
    setError('')
  }

  return (
    <section className={p.section} aria-labelledby="links-title" data-reveal>
      <div className={p.sectionHead}>
        <h2 id="links-title" className={compactHead ? p.h3 : p.h2}>
          Links
        </h2>
      </div>
      <Card padding="none">
        {details.links.length ? (
          <ul className={p.rows}>
            {details.links.map((l) => (
              <li key={l.id} className={p.row}>
                <div className={p.rowMain}>
                  <p className={p.rowTitle}>{LINK_LABELS[l.kind]}</p>
                  <a className={`link ${p.url}`} href={l.url} target="_blank" rel="noopener noreferrer">
                    {l.url.replace(/^https?:\/\//, '')}
                    <ExternalLink size={12} aria-hidden />
                  </a>
                </div>
                <SourceTag source={l.source} at={l.addedAt} />
                <button
                  type="button"
                  className={p.iconBtn}
                  aria-label={`Remove ${LINK_LABELS[l.kind]} link`}
                  onClick={() => dispatch({ type: 'details/linkRemoved', id: l.id })}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`${p.empty} ${p.pad}`}>Add a portfolio or LinkedIn so companies can see your work.</p>
        )}
        <form className={`${p.inlineForm} ${p.pad} ${p.topBorder}`} onSubmit={add} noValidate>
          <label htmlFor="link-kind" className="sr-only">
            Link type
          </label>
          <select id="link-kind" className={p.select} value={kind} onChange={(e) => setKind(e.target.value as LinkKind)}>
            {(Object.keys(LINK_LABELS) as LinkKind[]).map((k) => (
              <option key={k} value={k}>
                {LINK_LABELS[k]}
              </option>
            ))}
          </select>
          <label htmlFor="link-url" className="sr-only">
            Web address
          </label>
          <input
            id="link-url"
            className={p.input}
            type="url"
            inputMode="url"
            autoComplete="url"
            value={url}
            placeholder="example.com/your-work"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? 'link-error' : undefined}
            onChange={(e) => {
              setUrl(e.target.value)
              setError('')
            }}
          />
          <Button type="submit" variant="secondary" size="sm" disabled={!url.trim()} leading={<Plus size={14} />}>
            Add
          </Button>
          {error ? (
            <p id="link-error" className={p.error} role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </Card>
    </section>
  )
}
