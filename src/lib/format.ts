import { DAY, HOUR, MINUTE, PACIFIC, timeZoneLabel } from './time'

/** "2 hours ago", "just now", "yesterday" */
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime()
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE)
    return `${m} minute${m === 1 ? '' : 's'} ago`
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR)
    return `${h} hour${h === 1 ? '' : 's'} ago`
  }
  const d = Math.floor(diff / DAY)
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}

/** "today", "yesterday", "Tuesday" (within a week) or "Oct 2". */
export function dayLabel(iso: string, now = Date.now()): string {
  const date = new Date(iso)
  const startOf = (t: number) => {
    const x = new Date(t)
    x.setHours(0, 0, 0, 0)
    return x.getTime()
  }
  const days = Math.round((startOf(now) - startOf(date.getTime())) / DAY)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'long' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Whole days elapsed since `iso`, never negative. */
export function daysSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY))
}

export function clockTime(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone })
}

export function slotLabel(iso: string, timeZone = PACIFIC): string {
  return clockTime(iso, timeZone)
}

/** "Wednesday, October 14" */
export function longDate(iso: string, timeZone = PACIFIC): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone })
}

/** "Wed, Oct 14" */
export function shortDate(iso: string, timeZone = PACIFIC): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone })
}

/** "10:30 to 11:00 AM" — collapses the meridiem when both ends share it. */
export function timeRange(startIso: string, minutes: number, timeZone = PACIFIC): string {
  const start = new Date(startIso)
  const end = new Date(start.getTime() + minutes * MINUTE)
  const fmt = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone })
  const a = fmt(start)
  const b = fmt(end)
  const [aTime, aMer] = a.split(' ')
  const [, bMer] = b.split(' ')
  return aMer === bMer ? `${aTime} to ${b}` : `${a} to ${b}`
}

export function tzShort(timeZone: string): string {
  return timeZoneLabel(timeZone).short
}

export function monthDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ordinalDay(iso: string): string {
  const d = new Date(iso).getDate()
  const s = d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th'
  return `${d}${s}`
}

/** 145000 → "$145,000" */
export function currency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 5) return 'Good evening'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']
export function countWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n)
}

/** Join with commas and "and": ["a","b","c"] → "a, b and c" */
export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
