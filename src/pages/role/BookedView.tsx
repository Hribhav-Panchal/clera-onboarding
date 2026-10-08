import { Check } from 'lucide-react'
import { useRef, useState } from 'react'
import { cancelInterview, errorMessage } from '../../api/client'
import { askAssistant } from '../../assistant/ask'
import { useAssistantContext } from '../../assistant/context'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { StageTracker } from '../../components/StageTracker'
import { useToast } from '../../components/Toast'
import type { Application, Role } from '../../data/types'
import { clockTime, longDate, shortDate, timeRange, tzShort } from '../../lib/format'
import { buildIcs, downloadFile } from '../../lib/ics'
import { gsap, prefersReducedMotion } from '../../lib/motion'
import { useDispatch } from '../../state/store'
import { BackLink, RoleHeader } from './RolePage'
import styles from './role.module.css'

const PREP = [
  'Reread the role and the two answers you sent.',
  'Choose one project story that shows research through delivery.',
  'Write down two questions for the team, including the office expectation.',
]

/** R4 · Role · booked */
export function BookedView({ role, app }: { role: Role; app: Application }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const [pending, setPending] = useState<null | 'reschedule' | 'cancel'>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<boolean[]>(() => PREP.map(() => false))
  const slot = app.bookedSlot!
  const tz = app.slotTimeZone
  const weekday = longDate(slot, tz).split(',')[0]

  useAssistantContext(
    `role-booked:${role.id}`,
    `Booked for ${weekday}. If you want, I can run a short mock conversation based on their two questions and your answers.`,
    ['Run a mock intro call', 'What should I ask about the office expectation?', 'Add this to my calendar'],
  )

  const downloadInvite = () => {
    downloadFile(
      `clera-${role.company.toLowerCase().replace(/\s+/g, '-')}-interview.ics`,
      buildIcs({
        uid: `${role.id}-${slot}`,
        start: slot,
        minutes: 30,
        title: `${role.company} · ${role.title} — intro call`,
        description: `30-minute intro with the ${role.company} team. The meeting link is in the invite from ${role.company}.`,
      }),
    )
  }

  const act = async () => {
    if (!pending) return
    setBusy(true)
    try {
      await cancelInterview(role.id)
      dispatch({ type: 'application/bookingCancelled', roleId: role.id })
      toast({
        message:
          pending === 'reschedule'
            ? `Pick a new time. ${role.company} keeps the other offered times open.`
            : `Interview cancelled. ${role.company} has been told.`,
      })
    } catch (err) {
      toast({ message: errorMessage(err), tone: 'error' })
      setBusy(false)
    }
  }

  return (
    <>
      <BackLink to="/" label="Back to home" />
      <RoleHeader role={role} app={app} />
      <div data-reveal>
        <StageTracker current={3} note={`${shortDate(slot, tz).replace(',', '')} · ${clockTime(slot, tz)}`} />
      </div>

      <header className={styles.stageHeading} data-reveal>
        <h1 className={styles.h1} data-split>
          You are booked with {role.company}
        </h1>
        <p className={styles.sub}>Confirmed. Here is everything for the next step.</p>
      </header>

      <Card padding="md" className={styles.booking} data-reveal>
        <p className={styles.bookingRole}>
          {role.title} · {role.company}
        </p>
        <p className={styles.bookingWhen}>
          {longDate(slot, tz)} · {timeRange(slot, 30, tz)} {tzShort(tz)}
        </p>
        <p className={styles.cardBodySmall}>
          30-minute intro · Video call · {role.company} team. The meeting link is in your calendar invite.
        </p>
        {pending ? (
          <div className={styles.confirm} role="group" aria-label={pending === 'cancel' ? 'Confirm cancellation' : 'Confirm reschedule'}>
            <p>{pending === 'cancel' ? `Cancel your interview with ${role.company}?` : 'Release this time and pick another?'}</p>
            <span className={styles.grow} />
            <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
              Keep it
            </Button>
            <Button variant={pending === 'cancel' ? 'danger' : 'secondary'} onClick={() => void act()} loading={busy}>
              {pending === 'cancel' ? 'Cancel interview' : 'Reschedule'}
            </Button>
          </div>
        ) : (
          <div className={styles.inlineActions}>
            <Button variant="secondary" onClick={downloadInvite}>
              View calendar invite
            </Button>
            <Button variant="ghost" onClick={() => setPending('reschedule')}>
              Reschedule
            </Button>
            <Button variant="ghost" onClick={() => setPending('cancel')}>
              Cancel interview
            </Button>
          </div>
        )}
      </Card>

      <Card tone="hero" radius={14} padding="md" className={styles.prep} data-reveal>
        <h2 className={styles.cardTitle}>A focused way to prepare</h2>
        <ul className={styles.prepList}>
          {PREP.map((p, i) => (
            <PrepItem
              key={p}
              text={p}
              done={done[i]}
              onToggle={() => setDone((d) => d.map((x, j) => (j === i ? !x : x)))}
            />
          ))}
        </ul>
        <div>
          <Button onClick={() => askAssistant(`Help me prepare for ${role.company}`)}>Prepare for this role</Button>
        </div>
      </Card>
    </>
  )
}

function PrepItem({ text, done, onToggle }: { text: string; done: boolean; onToggle: () => void }) {
  const box = useRef<HTMLSpanElement>(null)
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        className={`${styles.prepItem} ${done ? styles.prepDone : ''}`}
        onClick={() => {
          onToggle()
          if (!done && box.current && !prefersReducedMotion()) {
            gsap.fromTo(box.current, { scale: 0.6 }, { scale: 1, duration: 0.45, ease: 'back.out(2.5)' })
          }
        }}
      >
        <span ref={box} className={styles.prepBox} aria-hidden>
          {done ? <Check size={12} strokeWidth={2.5} /> : null}
        </span>
        <span>{text}</span>
      </button>
    </li>
  )
}
