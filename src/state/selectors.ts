import type { Application, ApplicationStage, Match, Question, Role } from '../data/types'
import { dayLabel, daysSince, relativeTime, shortDate, clockTime } from '../lib/format'
import type { AppState } from './reducer'

export type PillState = 'setup' | 'looking' | 'needs-you' | 'waiting' | 'booked' | 'closed'

export const STAGE_STEPS = ['Requested', 'Waiting', 'Replied', 'Booked'] as const

/** How far along the four-step strip an application is (0-based index of the current step). */
export function stageIndex(stage: ApplicationStage | null): number {
  switch (stage) {
    case 'waiting':
      return 1
    case 'invited':
      return 2
    case 'booked':
      return 3
    default:
      return -1
  }
}

export function pillForStage(stage: ApplicationStage): PillState {
  return stage === 'invited' ? 'needs-you' : stage === 'waiting' ? 'waiting' : stage === 'booked' ? 'booked' : 'closed'
}

export interface TrackRow {
  role: Role
  app: Application
  pill: PillState
  /** Index of the furthest reached step for the mini strip. */
  reached: number
  next: string
  detail: string
}

export function trackRow(role: Role, app: Application, now = Date.now()): TrackRow {
  switch (app.stage) {
    case 'invited':
      return {
        role,
        app,
        pill: 'needs-you',
        reached: 2,
        next: 'Next: you',
        detail: app.repliedAt ? `They replied ${relativeTime(app.repliedAt, now)}` : 'They replied',
      }
    case 'waiting': {
      const d = daysSince(app.sentAt, now)
      return {
        role,
        app,
        pill: 'waiting',
        reached: 1,
        next: `Next: ${role.company} · ${d === 0 ? 'sent today' : `${d} day${d === 1 ? '' : 's'}`}`,
        detail:
          d >= 2
            ? `Introduction sent ${dayLabel(app.sentAt, now)} · most companies reply within a week`
            : `Introduction sent ${dayLabel(app.sentAt, now)}`,
      }
    }
    case 'booked':
      return {
        role,
        app,
        pill: 'booked',
        reached: 3,
        next: app.bookedSlot ? `Next: interview · ${shortDate(app.bookedSlot)}` : 'Next: interview',
        detail: app.bookedSlot ? `Booked for ${clockTime(app.bookedSlot, app.slotTimeZone)} Pacific` : 'Interview booked',
      }
    case 'closed':
    default:
      return {
        role,
        app,
        pill: 'closed',
        reached: app.repliedAt ? 2 : 1,
        next: 'Closed · role filled',
        detail: app.closedReason ?? 'This role is no longer moving forward',
      }
  }
}

const STAGE_ORDER: Record<ApplicationStage, number> = { invited: 0, booked: 1, waiting: 2, closed: 3 }

export function trackRows(state: AppState, now = Date.now()): TrackRow[] {
  return state.applications
    .filter((a) => !a.hidden && !a.withdrawn && state.roles[a.roleId])
    .map((a) => trackRow(state.roles[a.roleId], a, now))
    .sort((x, y) => STAGE_ORDER[x.app.stage] - STAGE_ORDER[y.app.stage] || y.app.sentAt.localeCompare(x.app.sentAt))
}

export type TrackFilter = 'all' | 'needs-you' | 'waiting' | 'booked' | 'closed'

export function filterTrack(rows: TrackRow[], f: TrackFilter): TrackRow[] {
  return f === 'all' ? rows : rows.filter((r) => r.pill === f)
}

export function trackCounts(rows: TrackRow[]): Record<TrackFilter, number> {
  return {
    all: rows.length,
    'needs-you': rows.filter((r) => r.pill === 'needs-you').length,
    waiting: rows.filter((r) => r.pill === 'waiting').length,
    booked: rows.filter((r) => r.pill === 'booked').length,
    closed: rows.filter((r) => r.pill === 'closed').length,
  }
}

export type MatchFilter = 'new' | 'requested' | 'dismissed'

export function matchesBy(state: AppState, f: MatchFilter): { match: Match; role: Role }[] {
  return state.matches
    .filter((m) => m.status === f && state.roles[m.roleId])
    .map((m) => ({ match: m, role: state.roles[m.roleId] }))
    .sort((a, b) => b.role.fit - a.role.fit)
}

export function matchCounts(state: AppState): Record<MatchFilter, number> {
  const c = { new: 0, requested: 0, dismissed: 0 }
  for (const m of state.matches) if (state.roles[m.roleId]) c[m.status]++
  return c
}

/** The answer that would be sent for a question right now. */
export function answerFor(q: Question, drafts: Record<string, string> | undefined): string {
  return drafts?.[q.id] ?? (q.kind === 'choice' ? (q.prefill ?? '') : q.prefill)
}

/** Questions Clera can't answer from the profile and the candidate hasn't yet. */
export function unanswered(role: Role, drafts: Record<string, string> | undefined): Question[] {
  return role.questions.filter((q) => !answerFor(q, drafts).trim())
}

export function applicationFor(state: AppState, roleId: string): Application | null {
  return state.applications.find((a) => a.roleId === roleId && !a.withdrawn) ?? null
}

export interface NextStep {
  eyebrow: string
  title: string
  body: string
  cta: { label: string; to: string }
}

/** The single most useful thing for the candidate to do, in priority order. */
export function nextStep(state: AppState, rows: TrackRow[]): NextStep | null {
  const invited = rows.find((r) => r.app.stage === 'invited')
  const fresh = state.matches.filter((m) => m.status === 'new').length
  if (fresh > 0) {
    return {
      eyebrow: 'YOUR NEXT STEP',
      title: `${fresh} ${fresh === 1 ? 'match is' : 'matches are'} ready for you`,
      body: 'Pick the ones worth an introduction. We only contact a company when you say so.',
      cta: { label: 'Review matches', to: '/matches' },
    }
  }
  if (invited) {
    return {
      eyebrow: 'YOUR NEXT STEP',
      title: `${invited.role.company} would like to meet you`,
      body: 'Pick a time for a 30-minute introductory call. Nothing is booked until you confirm it.',
      cta: { label: 'Pick a time', to: `/roles/${invited.role.id}` },
    }
  }
  return null
}
