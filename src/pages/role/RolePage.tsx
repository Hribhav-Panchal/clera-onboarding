import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/Button'
import { CompanyLogo } from '../../components/CompanyLogo'
import { StatusPill } from '../../components/StatusPill'
import type { Application, Role } from '../../data/types'
import { useReveal } from '../../lib/useReveal'
import { applicationFor, pillForStage } from '../../state/selectors'
import { useAppState, useDispatch } from '../../state/store'
import { BookedView } from './BookedView'
import { ClosedView } from './ClosedView'
import { InvitedView } from './InvitedView'
import { MatchView } from './MatchView'
import { SentView } from './SentView'
import styles from './role.module.css'

export function RolePage() {
  const { roleId = '' } = useParams()
  const state = useAppState()
  const dispatch = useDispatch()
  const role = state.roles[roleId]
  const app = role ? applicationFor(state, role.id) : null
  const page = useRef<HTMLDivElement>(null)
  // Re-run the entrance whenever the role moves to a new stage.
  useReveal(page, `${roleId}:${app?.stage ?? 'match'}`)

  useEffect(() => {
    if (role) dispatch({ type: 'match/seen', roleId: role.id })
  }, [role, dispatch])

  if (!role) {
    return (
      <div className={styles.page}>
        <BackLink to="/matches" label="Back to matches" />
        <div className={styles.missing}>
          <h1 className={styles.h1}>This role is no longer available</h1>
          <p className={styles.sub}>It may have been filled or removed by the company. Your other matches are unaffected.</p>
          <Button variant="secondary" to="/matches">
            See your matches
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div ref={page} className={styles.page}>
      {app ? <Stage role={role} app={app} /> : <MatchView role={role} />}
    </div>
  )
}

function Stage({ role, app }: { role: Role; app: Application }) {
  switch (app.stage) {
    case 'waiting':
      return <SentView role={role} app={app} />
    case 'invited':
      return <InvitedView role={role} app={app} />
    case 'booked':
      return <BookedView role={role} app={app} />
    case 'closed':
    default:
      return <ClosedView role={role} app={app} />
  }
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className={styles.back} data-reveal>
      <ArrowLeft size={14} strokeWidth={2} className={styles.backIcon} aria-hidden />
      {label}
    </Link>
  )
}

/** Compact header used once a request exists (R2–R5). */
export function RoleHeader({ role, app }: { role: Role; app: Application }) {
  const meta = [role.pay, role.workStyle, role.location].filter(Boolean).join(' · ')
  return (
    <div className={styles.compactHeader} data-reveal>
      <CompanyLogo initials={role.initials} tone="muted" size={44} />
      <div className={styles.compactText}>
        <p className={styles.compactTitle}>
          <Link to={`/roles/${role.id}`} className={styles.plainLink}>
            {role.company} · {role.title}
          </Link>
        </p>
        <p className={styles.compactMeta}>{meta}</p>
      </div>
      <StatusPill state={pillForStage(app.stage)} />
    </div>
  )
}
