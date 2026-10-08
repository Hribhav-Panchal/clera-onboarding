import { useState } from 'react'
import { errorMessage, withdrawRequest } from '../../api/client'
import { useAssistantContext } from '../../assistant/context'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { StageTracker } from '../../components/StageTracker'
import { StepList } from '../../components/StepList'
import { useToast } from '../../components/Toast'
import type { Application, Role } from '../../data/types'
import { clockTime, dayLabel } from '../../lib/format'
import { matchesBy } from '../../state/selectors'
import { useAppState, useDispatch } from '../../state/store'
import { BackLink, RoleHeader } from './RolePage'
import styles from './role.module.css'

/** R2 · Role · request sent */
export function SentView({ role, app }: { role: Role; app: Application }) {
  const state = useAppState()
  const dispatch = useDispatch()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [showSent, setShowSent] = useState(false)
  const other = matchesBy(state, 'new').find((m) => m.role.id !== role.id)?.role
  const day = dayLabel(app.sentAt)
  const time = clockTime(app.sentAt)
  const sentLabel = `Sent ${day}, ${time}`

  useAssistantContext(
    `role-sent:${role.id}`,
    `Sent at ${time.replace(/ (AM|PM)$/, '')}. I will tell you the moment ${role.company} replies.${other ? ` In the meantime, ${other.company} is worth a look.` : ''}`,
    ['How long do replies usually take?', other ? `Open the ${other.company} match` : 'Find me more roles like this', `What did I send to ${role.company}?`],
  )

  const withdraw = async () => {
    setWithdrawing(true)
    try {
      await withdrawRequest(role.id)
      dispatch({ type: 'application/withdrawn', roleId: role.id })
      toast({ message: `Request to ${role.company} withdrawn.` })
    } catch (err) {
      toast({ message: errorMessage(err), tone: 'error' })
      setWithdrawing(false)
    }
  }

  return (
    <>
      <BackLink to="/" label="Back to home" />
      <RoleHeader role={role} app={app} />
      <div data-reveal>
        <StageTracker current={1} note={`Next: ${role.company} · sent ${day}`} />
      </div>

      <header className={styles.stageHeading} data-reveal>
        <h1 className={styles.h1} data-split>
          Your introduction is on its way
        </h1>
        <p className={styles.sub}>The next move is {role.company}’s. There is nothing else you need to send.</p>
      </header>

      <Card padding="none" data-reveal>
        <StepList
          divided
          steps={[
            { title: sentLabel, body: `You approved the profile and ${Object.keys(app.answers).length === 2 ? 'two answers' : 'answers'} that went to ${role.company}.`, state: 'done' },
            { title: `Waiting for ${role.company}`, body: 'Most companies reply within a week. We email you the moment they do.', state: 'current', tone: 'amber' },
            { title: 'If they invite you', body: 'You pick a time. Nothing is booked until you confirm it.', state: 'todo' },
          ]}
        />
      </Card>

      <Card tone="subtle" padding="md" data-reveal>
        <h2 className={styles.cardTitle}>You can close this tab</h2>
        <p className={styles.cardBodySmall}>
          Updates go to {state.profile.email}. Checking back here will not make {role.company} reply faster.
        </p>
      </Card>

      <Card padding="md" data-reveal>
        <h2 className={styles.cardTitle}>Changed your mind?</h2>
        <p className={styles.cardBodySmall}>
          You can withdraw this request. {role.company} will see it as withdrawn, and what you already sent cannot be
          recalled. Your profile and other matches are not affected.
        </p>
        {confirming ? (
          <div className={styles.confirm} role="group" aria-label="Confirm withdrawal">
            <p>Withdraw your request to {role.company}?</p>
            <span className={styles.grow} />
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={withdrawing}>
              Keep request
            </Button>
            <Button variant="danger" onClick={() => void withdraw()} loading={withdrawing} loadingLabel="Withdrawing">
              Withdraw
            </Button>
          </div>
        ) : (
          <div className={styles.inlineActions}>
            <Button variant="ghost" onClick={() => setConfirming(true)}>
              Withdraw request
            </Button>
            <Button variant="ghost" onClick={() => setShowSent((s) => !s)} aria-expanded={showSent}>
              {showSent ? 'Hide what was sent' : 'View what was sent'}
            </Button>
          </div>
        )}
        {showSent ? (
          <dl className={styles.sent}>
            {role.questions.map((q, i) => (
              <div key={q.id}>
                <dt>
                  {i + 1} · {q.prompt}
                </dt>
                <dd>{app.answers[q.id] ?? '—'}</dd>
              </div>
            ))}
            <div>
              <dt>Also shared</dt>
              <dd>Your name, resume and portfolio link.</dd>
            </div>
          </dl>
        ) : null}
      </Card>

      <div data-reveal>
        <Button variant="secondary" to="/matches">
          Review another match
        </Button>
      </div>
    </>
  )
}
