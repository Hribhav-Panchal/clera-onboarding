import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAssistantContext } from '../../assistant/context'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { StageTracker } from '../../components/StageTracker'
import { useToast } from '../../components/Toast'
import type { Application, Role } from '../../data/types'
import { countWord, listJoin, longDate, monthDay, ordinalDay } from '../../lib/format'
import { matchesBy } from '../../state/selectors'
import { useAppState, useDispatch } from '../../state/store'
import { BackLink, RoleHeader } from './RolePage'
import styles from './role.module.css'

/** R5 · Role · not moving forward */
export function ClosedView({ role, app }: { role: Role; app: Application }) {
  const state = useAppState()
  const dispatch = useDispatch()
  const toast = useToast()
  const navigate = useNavigate()
  const open = matchesBy(state, 'new').map((m) => m.role)
  const [fallbackClosedAt] = useState(() => new Date().toISOString())
  const closedAt = app.closedAt ?? fallbackClosedAt
  const reached = app.bookedAt ? 3 : app.repliedAt ? 2 : 1
  const next = open[0]

  useAssistantContext(
    `role-closed:${role.id}`,
    `${role.company} went with someone else. That happens a lot at seed stage. Your answers were strong${next ? ` and I can reuse them for ${next.company} right now` : ''}.`,
    [next ? `Reuse my answers for ${next.company}` : 'What should I do next?', `Find more roles like ${role.company}`, 'Hide this from my track'],
  )

  const hide = () => {
    dispatch({ type: 'application/hidden', roleId: role.id, hidden: true })
    toast({
      message: `${role.company} is hidden from your track.`,
      action: { label: 'Undo', onClick: () => dispatch({ type: 'application/hidden', roleId: role.id, hidden: false }) },
    })
    navigate('/')
  }

  const readNote = app.readAt ? `, which they read on the ${ordinalDay(app.readAt)}` : ''

  return (
    <>
      <BackLink to="/" label="Back to home" />
      <RoleHeader role={role} app={app} />
      <div data-reveal>
        <StageTracker current={reached} closed note={`Closed · ${monthDay(closedAt)}`} />
      </div>

      <Card padding="md" className={styles.why} data-reveal>
        <h1 className={styles.h1} data-split>
          {role.company} is not moving forward
        </h1>
        <p className={styles.whyBody}>
          {app.closedReason && !/filled/i.test(app.closedReason)
            ? `${app.closedReason}.`
            : `They filled the role with another candidate on ${longDate(closedAt).split(', ')[1]}.`}{' '}
          This was not a judgement on your answers{readNote}. Your profile and preferences are unchanged.
        </p>
      </Card>

      {open.length > 0 ? (
        <Card tone="hero" padding="sm" className={styles.stillOpen} data-reveal>
          <div className={styles.grow}>
            <p className={styles.cardTitle}>
              {countWord(open.length)} of your matches {open.length === 1 ? 'is' : 'are'} still open
            </p>
            <p className={styles.cardBodySmall}>
              {listJoin(open.map((r) => r.company))} {open.length === 1 ? 'is' : 'are'} waiting on you. Your {role.company}{' '}
              answers can be reused.
            </p>
          </div>
          <Button to="/matches">Review open matches</Button>
        </Card>
      ) : (
        <Card tone="subtle" padding="sm" data-reveal>
          <p className={styles.cardTitle}>Clera keeps looking</p>
          <p className={styles.cardBodySmall}>We will email you when new matches land.</p>
        </Card>
      )}

      <p className={styles.footnote} data-reveal>
        Keep this role in your history, or{' '}
        <button type="button" className={styles.inlineLink} onClick={hide}>
          hide it from the track
        </button>
        .
      </p>
    </>
  )
}
