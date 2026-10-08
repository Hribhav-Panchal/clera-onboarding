const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const PACIFIC = 'America/Los_Angeles'

export function hoursAgo(h: number, now = Date.now()): string {
  return new Date(now - h * HOUR).toISOString()
}

export function daysAgo(d: number, now = Date.now()): string {
  return new Date(now - d * DAY).toISOString()
}

/** Offset (ms) between UTC and `timeZone` at the given instant. */
function tzOffset(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - instant.getTime()
}

/** Wall-clock time in `timeZone` → UTC ISO string. DST-safe (re-checks offset once). */
export function zonedTimeToIso(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  timeZone: string,
): string {
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  let ts = guess - tzOffset(new Date(guess), timeZone)
  const corrected = guess - tzOffset(new Date(ts), timeZone)
  if (corrected !== ts) ts = corrected
  return new Date(ts).toISOString()
}

/** Calendar date parts for "today" in a time zone. */
function todayIn(timeZone: string, now = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(new Date(now))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return { y: Number(get('year')), m: Number(get('month')), d: Number(get('day')), dow: weekdays.indexOf(get('weekday')) }
}

/** Next given weekday (0=Sun) at least `minDaysAhead` days away, in `timeZone`. */
export function nextWeekday(dow: number, timeZone: string, minDaysAhead = 2, now = Date.now()) {
  const t = todayIn(timeZone, now)
  let add = (dow - t.dow + 7) % 7
  if (add < minDaysAhead) add += 7
  const base = new Date(Date.UTC(t.y, t.m - 1, t.d + add))
  return { y: base.getUTCFullYear(), m: base.getUTCMonth() + 1, d: base.getUTCDate() }
}

export function isPast(iso: string, now = Date.now()): boolean {
  return new Date(iso).getTime() <= now
}

export const TIME_ZONES: { id: string; label: string; short: string }[] = [
  { id: 'America/Los_Angeles', label: 'Pacific Time', short: 'Pacific' },
  { id: 'America/Denver', label: 'Mountain Time', short: 'Mountain' },
  { id: 'America/Chicago', label: 'Central Time', short: 'Central' },
  { id: 'America/New_York', label: 'Eastern Time', short: 'Eastern' },
  { id: 'Europe/London', label: 'UK Time', short: 'UK' },
  { id: 'Asia/Kolkata', label: 'India Time', short: 'India' },
]

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || PACIFIC
  } catch {
    return PACIFIC
  }
}

export function timeZoneLabel(id: string): { label: string; short: string } {
  const known = TIME_ZONES.find((z) => z.id === id)
  if (known) return known
  const city = id.split('/').pop()?.replace(/_/g, ' ') ?? id
  return { label: `${city} time`, short: city }
}

export { MINUTE, HOUR, DAY }
