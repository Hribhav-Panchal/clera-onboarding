import { useEffect, useMemo, useRef, useState } from 'react'
import { confirmInterview, errorMessage, requestAnotherTime } from '../../api/client'
import { useAssistantContext } from '../../assistant/context'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ChoiceGroup } from '../../components/ChoiceGroup'
import { StageTracker } from '../../components/StageTracker'
import { useToast } from '../../components/Toast'
import type { Application, Role } from '../../data/types'
import { longDate, shortDate, slotLabel, timeRange, tzShort } from '../../lib/format'
import { gsap, prefersReducedMotion } from '../../lib/motion'
import { TIME_ZONES, isPast, localTimeZone, timeZoneLabel } from '../../lib/time'
import { useDispatch } from '../../state/store'
import { BackLink, RoleHeader } from './RolePage'
import styles from './role.module.css'

const CALL_MINUTES = 30

/** R3 · Role · invited — pick one of the offered times. */
export function InvitedView({ role, app }: { role: Role; app: Application }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const [tz, setTz] = useState(app.slotTimeZone)
  const [picking, setPicking] = useState(false)
  const [slot, setSlot] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [asked, setAsked] = useState(false)
  const [asking, setAsking] = useState(false)
  const selection = useRef<HTMLDivElement>(null)

  const slots = useMemo(() => [...app.offeredSlots].sort(), [app.offeredSlots])
  const open = slots.filter((s) => !isPast(s))
  const allPast = slots.length > 0 && open.length === 0

  useAssistantContext(
    `role-invited:${role.id}`,
    `${role.company} replied and offered ${slots.length === 3 ? 'three' : slots.length} times. A morning slot leaves you time to prepare. Want help getting ready once it is confirmed?`,
    ['Which time should I pick?', 'What is an introductory call like?', `Help me prepare for ${role.company}`],
  )

  // Group by calendar day in the chosen time zone.
  const days = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const s of slots) {
      const key = longDate(s, tz)
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return [...map.entries()]
  }, [slots, tz])

  // Selection card slides in when a time is picked.
  useEffect(() => {
    if (!slot || !selection.current || prefersReducedMotion()) return
    gsap.fromTo(
      selection.current,
      { autoAlpha: 0, y: 12, scale: 0.98 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' },
    )
  }, [slot])

  const confirm = async () => {
    if (!slot) return
    setConfirming(true)
    try {
      const { bookedAt } = await confirmInterview(role.id, slot)
      dispatch({ type: 'application/booked', roleId: role.id, slot, at: bookedAt })
      toast({ message: `Interview with ${role.company} confirmed.`, tone: 'success' })
    } catch (err) {
      toast({ message: errorMessage(err), tone: 'error' })
      setConfirming(false)
    }
  }

  const another = async () => {
    setAsking(true)
    try {
      await requestAnotherTime(role.id)
      setAsked(true)
      setSlot(null)
      toast({ message: `We asked ${role.company} for more times. You will get an email when they reply.` })
    } catch (err) {
      toast({ message: errorMessage(err), tone: 'error' })
    } finally {
      setAsking(false)
    }
  }

  const zones = TIME_ZONES.some((z) => z.id === localTimeZone())
    ? TIME_ZONES
    : [{ id: localTimeZone(), ...timeZoneLabel(localTimeZone()) }, ...TIME_ZONES]

  return (
    <>
      <BackLink to="/" label="Back to home" />
      <RoleHeader role={role} app={app} />
      <div data-reveal>
        <StageTracker current={2} note="Next: you · pick a time" />
      </div>

      <header className={styles.stageHeading} data-reveal>
        <h1 className={styles.h1} data-split>
          They would like to meet you
        </h1>
        <p className={styles.sub}>
          Pick a time for a {CALL_MINUTES}-minute introductory call. You review it before anything is confirmed.
        </p>
      </header>

      <Card padding="md" className={styles.times} data-reveal>
        {allPast || slots.length === 0 ? (
          <div className={styles.timesEmpty}>
            <p className={styles.cardTitle}>These times have passed</p>
            <p className={styles.cardBodySmall}>Ask {role.company} for new times. Nothing is booked.</p>
            <Button variant="secondary" onClick={() => void another()} loading={asking} disabled={asked}>
              {asked ? 'New times requested' : 'Request new times'}
            </Button>
          </div>
        ) : (
          days.map(([day, list]) => (
            <ChoiceGroup
              key={day}
              label={`${day} · ${timeZoneLabel(tz).label}`}
              size="lg"
              showCheck={false}
              options={list.map((s) => ({ value: s, label: slotLabel(s, tz), disabled: isPast(s) }))}
              value={slot ? [slot] : []}
              onChange={([v]) => setSlot(v)}
            />
          ))
        )}
        {!allPast && slots.length > 0 ? (
          picking ? (
            <label className={styles.tzPicker}>
              <span>Show times in</span>
              <select
                value={tz}
                autoFocus
                onChange={(e) => {
                  setTz(e.target.value)
                  setPicking(false)
                }}
                onBlur={() => setPicking(false)}
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <button type="button" className={`link ${styles.tzLink}`} onClick={() => setPicking(true)}>
              Change time zone
            </button>
          )
        ) : null}
      </Card>

      {slot ? (
        <div ref={selection} aria-live="polite">
          <Card tone="hero" radius={14} padding="md" className={styles.selection}>
            <p className={styles.selectionEyebrow}>Your selection</p>
            <p className={styles.selectionTitle}>
              {shortDate(slot, tz)} · {timeRange(slot, CALL_MINUTES, tz)} {tzShort(tz)}
            </p>
            <p className={styles.cardBodySmall}>
              {CALL_MINUTES} minutes · Video call · {role.company} team. A calendar invite follows confirmation.
            </p>
            <div className={styles.inlineActions}>
              <Button onClick={() => void confirm()} loading={confirming} loadingLabel="Confirming interview">
                Confirm interview
              </Button>
              <Button variant="ghost" onClick={() => void another()} loading={asking} disabled={asked || confirming}>
                {asked ? 'New times requested' : 'Request another time'}
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <p className={styles.footnote} data-reveal>
          {asked
            ? `We asked ${role.company} for more times. You can still pick one of these.`
            : 'Choose a time above to review it before confirming.'}
        </p>
      )}

      {slot ? (
        <p className={styles.footnote}>Leave yourself space to prepare. You can reschedule after confirming if something changes.</p>
      ) : null}
    </>
  )
}
