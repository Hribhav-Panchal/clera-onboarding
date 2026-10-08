import { ChevronRight } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAssistantContext } from '../assistant/context'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { CompanyLogo } from '../components/CompanyLogo'
import { FilterTabs } from '../components/FilterTabs'
import { StageDots } from '../components/StageTracker'
import { StatusPill } from '../components/StatusPill'
import { StepList } from '../components/StepList'
import { greeting } from '../lib/format'
import { gsap, prefersReducedMotion, useGSAP } from '../lib/motion'
import { useHoverLift } from '../lib/useHoverLift'
import { useReveal } from '../lib/useReveal'
import { filterTrack, nextStep, trackCounts, trackRows, type TrackFilter, type TrackRow } from '../state/selectors'
import { useAppState } from '../state/store'
import styles from './HomePage.module.css'

export function HomePage() {
  const state = useAppState()
  const rows = useMemo(() => trackRows(state), [state])
  const looking = state.matches.length === 0 && rows.length === 0
  return looking ? <HomeLooking /> : <HomeReady rows={rows} />
}

/* --------------------------------------------------------------- A4 */

function HomeLooking() {
  const { profile } = useAppState()
  const page = useRef<HTMLDivElement>(null)
  useReveal(page)
  useAssistantContext(
    'home-looking',
    'Your profile is set. I will tell you the moment the first matches land. Want to look over your preferences while you wait?',
    ['What kind of roles will I see?', 'Change where updates are sent', 'Connect Claude or ChatGPT'],
  )

  return (
    <div ref={page} className={styles.page}>
      <header className={styles.greeting} data-reveal>
        <h1 className={styles.h1}>
          {greeting()}, {profile.firstName}
        </h1>
        <p className={styles.sub}>Your profile is saved. Nothing to do right now.</p>
      </header>

      <Card tone="hero" radius={14} padding="lg" className={styles.next} data-reveal>
        <div className={styles.nextCopy}>
          <p className={styles.eyebrow}>WHAT IS HAPPENING</p>
          <p className={styles.nextTitle}>Clera is looking for your first matches</p>
          <p className={styles.nextBody}>
            We are checking roles against your role, location and work preferences. We will email you the moment there is
            something to review.
          </p>
        </div>
        <Button variant="secondary" to="/profile">
          Review my preferences
        </Button>
      </Card>

      <Card radius={14} padding="none" data-reveal>
        <h2 className={styles.cardHeader}>How this works</h2>
        <StepList
          steps={[
            { title: 'Profile ready', body: 'Resume and matching essentials saved.', state: 'done' },
            {
              title: 'Finding matches',
              body: 'Clera is checking roles against your preferences. Usually within a day.',
              state: 'current',
            },
            {
              title: 'Your review',
              body: 'You decide which introductions to send. Nothing goes out without you.',
              state: 'todo',
            },
          ]}
        />
      </Card>

      <div className={styles.secondary} data-reveal>
        <InfoCard
          title="Updates by email"
          body={`Match and interview news goes to ${profile.email}. You can close this tab.`}
          link={{ label: 'Change email', to: '/settings' }}
        />
        <InfoCard
          title="Already use an AI assistant?"
          body="Connect Clera to Claude or ChatGPT and discuss your matches there once they are ready. Optional."
          link={{ label: 'Explore AI tools', to: '/settings/ai' }}
        />
      </div>
    </div>
  )
}

function InfoCard({ title, body, link }: { title: string; body: string; link: { label: string; to: string } }) {
  const ref = useRef<HTMLAnchorElement>(null)
  useHoverLift(ref)
  return (
    <Link ref={ref} to={link.to} className={styles.info}>
      <span className={styles.infoTitle}>{title}</span>
      <span className={styles.infoBody}>{body}</span>
      <span className={styles.infoLink}>
        {link.label}
        <span className={styles.arrow} aria-hidden>
          →
        </span>
      </span>
    </Link>
  )
}

/* --------------------------------------------------------------- 01 */

function HomeReady({ rows }: { rows: TrackRow[] }) {
  const state = useAppState()
  const [filter, setFilter] = useState<TrackFilter>('all')
  const page = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  useReveal(page)
  const step = nextStep(state, rows)
  const counts = trackCounts(rows)
  const visible = filterTrack(rows, filter)
  const invited = rows.find((r) => r.pill === 'needs-you')
  const waiting = rows.find((r) => r.pill === 'waiting')
  const active = rows.filter((r) => r.pill !== 'closed').length

  useAssistantContext(
    `home-ready:${invited?.role.id ?? ''}`,
    invited
      ? `${invited.role.company} replied. They asked for a time you are free next week.`
      : step
        ? 'New matches are in. I can compare them or draft a request for the closest fit.'
        : 'Nothing needs you right now. Everything is with the companies.',
    [
      invited ? `Pick a time for ${invited.role.company}` : 'Compare my matches',
      waiting ? `Draft a follow-up to ${waiting.role.company}` : 'How long do replies usually take?',
      `Find me more roles like ${(invited ?? waiting ?? rows[0])?.role.company ?? 'my matches'}`,
    ],
  )

  // Rows ease in whenever the filter changes.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo('[data-row]', { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' })
    },
    { scope: list, dependencies: [filter], revertOnUpdate: true },
  )

  return (
    <div ref={page} className={styles.page}>
      <header className={styles.greeting} data-reveal>
        <h1 className={styles.h1}>
          {greeting()}, {state.profile.firstName}
        </h1>
        <p className={styles.sub}>Here is where things stand today.</p>
      </header>

      {step ? (
        <Card tone="hero" radius={14} padding="lg" className={styles.next} data-reveal>
          <div className={styles.nextCopy}>
            <p className={styles.eyebrow}>{step.eyebrow}</p>
            <p className={styles.nextTitle}>{step.title}</p>
            <p className={styles.nextBody}>{step.body}</p>
          </div>
          <Button to={step.cta.to}>{step.cta.label}</Button>
        </Card>
      ) : null}

      <Card radius={14} padding="none" className={styles.track} data-reveal>
        <div className={styles.trackHeader}>
          <h2 className={styles.h2}>Your track</h2>
          <span className={styles.grow} />
          <span className={styles.meta}>{active} active</span>
        </div>
        {rows.length > 0 ? (
          <>
            <div className={styles.filters}>
              <FilterTabs
                label="Filter your track"
                controls="track-list"
                value={filter}
                onChange={setFilter}
                tabs={[
                  { key: 'all', label: 'All', count: counts.all },
                  { key: 'needs-you', label: 'Needs you', count: counts['needs-you'] },
                  { key: 'waiting', label: 'Waiting', count: counts.waiting },
                  { key: 'booked', label: 'Booked', count: counts.booked },
                  { key: 'closed', label: 'Closed', count: counts.closed },
                ]}
              />
            </div>
            <ul ref={list} id="track-list" className={styles.rows} role="tabpanel" aria-label="Your track">
              {visible.length === 0 ? (
                <li className={styles.emptyFilter} data-row>
                  Nothing here right now.
                </li>
              ) : (
                visible.map((r) => <TrackRowItem key={r.role.id} row={r} />)
              )}
            </ul>
          </>
        ) : (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No introductions yet</p>
            <p className={styles.emptyBody}>When you ask a company for an introduction, it shows up here with its next step.</p>
            <Button variant="secondary" to="/matches">
              Review matches
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

function TrackRowItem({ row }: { row: TrackRow }) {
  const { role, pill, reached, next, detail } = row
  const closed = pill === 'closed'
  return (
    <li data-row className={styles.rowItem}>
      <Link to={`/roles/${role.id}`} className={styles.row}>
        <CompanyLogo initials={role.initials} tone={role.tone} />
        <span className={styles.rowText}>
          <span className={styles.company}>{role.company}</span>
          <span className={styles.roleLine}>
            {role.title} · {role.location}
          </span>
        </span>
        <span className={styles.state}>
          <StatusPill state={pill} />
          <span className={styles.stageLine}>
            <StageDots reached={reached} muted={closed} />
            <span className={closed ? styles.nextMuted : styles.next2}>{next}</span>
          </span>
          <span className={styles.detail}>{detail}</span>
        </span>
        <ChevronRight size={16} className={styles.chev} aria-hidden />
      </Link>
    </li>
  )
}
