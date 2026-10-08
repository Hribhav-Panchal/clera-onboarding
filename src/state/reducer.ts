import { buildRoles, newProfile, sampleAccount } from '../data/seed'
import type {
  AIConnection,
  Application,
  Essentials,
  ExtraDocument,
  Match,
  MatchStatus,
  Profile,
  ProfileDetails,
  ProfileLink,
  ProfileNote,
  ResumeFile,
  Role,
} from '../data/types'
import { PACIFIC } from '../lib/time'

export const STATE_VERSION = 1

export interface AppState {
  version: typeof STATE_VERSION
  profile: Profile
  roles: Record<string, Role>
  matches: Match[]
  applications: Application[]
  /** Set when the candidate presses "Start matching". */
  matchingStartedAt: string | null
  ai: AIConnection | null
  /** In-progress intro answers, keyed by role then question. */
  drafts: Record<string, Record<string, string>>
}

export type Action =
  | { type: 'resume/uploaded'; resume: ResumeFile; essentials: Essentials; details?: ProfileDetails }
  | { type: 'resume/replaced'; resume: ResumeFile; details: ProfileDetails }
  | { type: 'resume/removed' }
  | { type: 'profile/imported'; source: 'mcp'; essentials: Essentials; details?: ProfileDetails }
  | { type: 'details/aboutChanged'; headline: string; summary: string }
  | { type: 'details/skillAdded'; name: string; at: string }
  | { type: 'details/skillRemoved'; name: string }
  | { type: 'details/noteAdded'; note: ProfileNote }
  | { type: 'details/noteRemoved'; id: string }
  | { type: 'details/noteRestored'; note: ProfileNote; index: number }
  | { type: 'details/linkAdded'; link: ProfileLink }
  | { type: 'details/linkRemoved'; id: string }
  | { type: 'documents/added'; doc: ExtraDocument }
  | { type: 'documents/updated'; id: string; patch: Partial<Pick<ExtraDocument, 'kind' | 'shared'>> }
  | { type: 'documents/removed'; id: string }
  | { type: 'documents/restored'; doc: ExtraDocument; index: number }
  | { type: 'profile/startManual'; source: 'manual' | 'chat' | 'mcp' }
  | { type: 'essentials/changed'; patch: Partial<Essentials> }
  | { type: 'essentials/saved'; at: string }
  | { type: 'onboarding/completed'; at: string }
  | { type: 'matches/delivered'; matches: Match[] }
  | { type: 'match/setStatus'; roleId: string; status: MatchStatus }
  | { type: 'match/seen'; roleId: string }
  | { type: 'draft/set'; roleId: string; questionId: string; value: string }
  | { type: 'draft/clear'; roleId: string; questionId?: string }
  | { type: 'application/sent'; roleId: string; answers: Record<string, string>; at: string }
  | { type: 'application/withdrawn'; roleId: string }
  | { type: 'application/replied'; roleId: string; slots: string[]; at: string }
  | { type: 'application/booked'; roleId: string; slot: string; at: string }
  | { type: 'application/bookingCancelled'; roleId: string }
  | { type: 'application/closed'; roleId: string; at: string; reason: string }
  | { type: 'application/hidden'; roleId: string; hidden: boolean }
  | { type: 'ai/connected'; connection: AIConnection }
  | { type: 'ai/disconnected' }
  | { type: 'state/replace'; state: AppState }
  | { type: 'state/reset' }
  | { type: 'state/loadSample' }

export function initialState(now = Date.now()): AppState {
  return {
    version: STATE_VERSION,
    profile: newProfile(),
    roles: buildRoles(now),
    matches: [],
    applications: [],
    matchingStartedAt: null,
    ai: null,
    drafts: {},
  }
}

export function sampleState(now = Date.now()): AppState {
  const { profile, matches, applications } = sampleAccount(now)
  return { ...initialState(now), profile, matches, applications, matchingStartedAt: profile.savedAt }
}

function withDetails(state: AppState, fn: (d: ProfileDetails) => ProfileDetails): AppState {
  const details = fn(state.profile.details)
  return details === state.profile.details ? state : { ...state, profile: { ...state.profile, details } }
}

/**
 * Bring in freshly parsed details without clobbering what the candidate
 * wrote or told Clera: their own edits and chat notes always survive.
 */
export function mergeDetails(current: ProfileDetails, incoming: ProfileDetails): ProfileDetails {
  const keepAbout = current.aboutSource === 'you' && current.headline
  const mine = <T extends { source: string }>(xs: T[]) => xs.filter((x) => x.source !== incoming.aboutSource)
  const skills = [...mine(current.skills)]
  for (const s of incoming.skills) if (!skills.some((x) => x.name.toLowerCase() === s.name.toLowerCase())) skills.push(s)
  const links = [...mine(current.links)]
  for (const l of incoming.links) if (!links.some((x) => x.url === l.url)) links.push(l)
  return {
    headline: keepAbout ? current.headline : incoming.headline,
    summary: keepAbout ? current.summary : incoming.summary,
    aboutSource: keepAbout ? 'you' : incoming.aboutSource,
    experience: incoming.experience.length ? incoming.experience : current.experience,
    education: incoming.education.length ? incoming.education : current.education,
    skills,
    notes: [...incoming.notes, ...current.notes.filter((n) => !incoming.notes.some((m) => m.id === n.id))],
    links,
  }
}

function updateApp(state: AppState, roleId: string, fn: (a: Application) => Application): AppState {
  let found = false
  const applications = state.applications.map((a) => {
    if (a.roleId !== roleId) return a
    found = true
    return fn(a)
  })
  return found ? { ...state, applications } : state
}

function setMatchStatus(matches: Match[], roleId: string, status: MatchStatus): Match[] {
  return matches.map((m) => (m.roleId === roleId ? { ...m, status } : m))
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'resume/uploaded':
      return {
        ...state,
        profile: {
          ...state.profile,
          source: 'resume',
          resume: action.resume,
          essentials: action.essentials,
          prefilled: { targetRole: true, location: true, workStyles: true, visa: true },
          details: action.details ? mergeDetails(state.profile.details, action.details) : state.profile.details,
        },
      }

    case 'resume/replaced':
      return {
        ...state,
        profile: { ...state.profile, resume: action.resume, details: mergeDetails(state.profile.details, action.details) },
      }

    case 'details/aboutChanged':
      return withDetails(state, (d) => ({ ...d, headline: action.headline, summary: action.summary, aboutSource: 'you' }))

    case 'details/skillAdded': {
      const name = action.name.trim()
      if (!name) return state
      return withDetails(state, (d) =>
        d.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())
          ? d
          : { ...d, skills: [...d.skills, { name, source: 'you', addedAt: action.at }] },
      )
    }

    case 'details/skillRemoved':
      return withDetails(state, (d) => ({ ...d, skills: d.skills.filter((s) => s.name !== action.name) }))

    case 'details/noteAdded':
      return withDetails(state, (d) => ({ ...d, notes: [action.note, ...d.notes] }))

    case 'details/noteRemoved':
      return withDetails(state, (d) => ({ ...d, notes: d.notes.filter((n) => n.id !== action.id) }))

    case 'details/noteRestored':
      return withDetails(state, (d) => {
        if (d.notes.some((n) => n.id === action.note.id)) return d
        const notes = [...d.notes]
        notes.splice(Math.min(action.index, notes.length), 0, action.note)
        return { ...d, notes }
      })

    case 'details/linkAdded':
      return withDetails(state, (d) =>
        d.links.some((l) => l.url === action.link.url) ? d : { ...d, links: [...d.links, action.link] },
      )

    case 'details/linkRemoved':
      return withDetails(state, (d) => ({ ...d, links: d.links.filter((l) => l.id !== action.id) }))

    case 'documents/added':
      if (state.profile.documents.some((x) => x.id === action.doc.id)) return state
      return { ...state, profile: { ...state.profile, documents: [...state.profile.documents, action.doc] } }

    case 'documents/updated':
      return {
        ...state,
        profile: {
          ...state.profile,
          documents: state.profile.documents.map((x) => (x.id === action.id ? { ...x, ...action.patch } : x)),
        },
      }

    case 'documents/removed':
      return { ...state, profile: { ...state.profile, documents: state.profile.documents.filter((x) => x.id !== action.id) } }

    case 'documents/restored': {
      if (state.profile.documents.some((x) => x.id === action.doc.id)) return state
      const documents = [...state.profile.documents]
      documents.splice(Math.min(action.index, documents.length), 0, action.doc)
      return { ...state, profile: { ...state.profile, documents } }
    }

    case 'profile/imported':
      return {
        ...state,
        profile: {
          ...state.profile,
          source: action.source,
          essentials: action.essentials,
          prefilled: { targetRole: true, location: true, workStyles: true, visa: true },
          details: action.details ? mergeDetails(state.profile.details, action.details) : state.profile.details,
        },
      }

    case 'resume/removed':
      return { ...state, profile: { ...state.profile, resume: null, source: null, prefilled: {} } }

    case 'profile/startManual':
      return { ...state, profile: { ...state.profile, source: action.source } }

    case 'essentials/changed': {
      const prefilled = { ...state.profile.prefilled }
      // Once the candidate edits a field it is theirs, not "from your resume".
      for (const k of Object.keys(action.patch) as (keyof Essentials)[]) delete prefilled[k]
      return {
        ...state,
        profile: { ...state.profile, essentials: { ...state.profile.essentials, ...action.patch }, prefilled },
      }
    }

    case 'essentials/saved':
      return { ...state, profile: { ...state.profile, savedAt: action.at } }

    case 'onboarding/completed':
      return { ...state, profile: { ...state.profile, onboarded: true, savedAt: action.at }, matchingStartedAt: action.at }

    case 'matches/delivered': {
      const existing = new Set(state.matches.map((m) => m.roleId))
      const fresh = action.matches.filter((m) => !existing.has(m.roleId) && state.roles[m.roleId])
      if (fresh.length === 0) return state
      return { ...state, matches: [...fresh, ...state.matches] }
    }

    case 'match/setStatus':
      return { ...state, matches: setMatchStatus(state.matches, action.roleId, action.status) }

    case 'match/seen':
      if (!state.matches.some((m) => m.roleId === action.roleId && m.unseen)) return state
      return {
        ...state,
        matches: state.matches.map((m) => (m.roleId === action.roleId ? { ...m, unseen: false } : m)),
      }

    case 'draft/set':
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [action.roleId]: { ...state.drafts[action.roleId], [action.questionId]: action.value },
        },
      }

    case 'draft/clear': {
      const forRole = { ...state.drafts[action.roleId] }
      if (action.questionId) delete forRole[action.questionId]
      const drafts = { ...state.drafts }
      if (!action.questionId || Object.keys(forRole).length === 0) delete drafts[action.roleId]
      else drafts[action.roleId] = forRole
      return { ...state, drafts }
    }

    case 'application/sent': {
      if (state.applications.some((a) => a.roleId === action.roleId && !a.withdrawn)) return state
      const app: Application = {
        roleId: action.roleId,
        stage: 'waiting',
        sentAt: action.at,
        answers: action.answers,
        offeredSlots: [],
        slotTimeZone: PACIFIC,
        repliedAt: null,
        bookedSlot: null,
        bookedAt: null,
        closedAt: null,
        closedReason: null,
        readAt: null,
        hidden: false,
        withdrawn: false,
      }
      const drafts = { ...state.drafts }
      delete drafts[action.roleId]
      return {
        ...state,
        applications: [app, ...state.applications.filter((a) => a.roleId !== action.roleId)],
        matches: setMatchStatus(state.matches, action.roleId, 'requested'),
        drafts,
      }
    }

    case 'application/withdrawn':
      return {
        ...state,
        applications: state.applications.filter((a) => a.roleId !== action.roleId),
        // The role goes back to being a match the candidate can reconsider.
        matches: setMatchStatus(state.matches, action.roleId, 'new'),
      }

    case 'application/replied':
      return updateApp(state, action.roleId, (a) =>
        a.stage === 'waiting'
          ? { ...a, stage: 'invited', repliedAt: action.at, readAt: a.readAt ?? action.at, offeredSlots: action.slots }
          : a,
      )

    case 'application/booked':
      return updateApp(state, action.roleId, (a) =>
        a.stage === 'invited' ? { ...a, stage: 'booked', bookedSlot: action.slot, bookedAt: action.at } : a,
      )

    case 'application/bookingCancelled':
      return updateApp(state, action.roleId, (a) =>
        a.stage === 'booked' ? { ...a, stage: 'invited', bookedSlot: null, bookedAt: null } : a,
      )

    case 'application/closed':
      return updateApp(state, action.roleId, (a) =>
        a.stage === 'closed' ? a : { ...a, stage: 'closed', closedAt: action.at, closedReason: action.reason },
      )

    case 'application/hidden':
      return updateApp(state, action.roleId, (a) => ({ ...a, hidden: action.hidden }))

    case 'ai/connected':
      return { ...state, ai: action.connection }

    case 'ai/disconnected':
      return { ...state, ai: null }

    case 'state/replace':
      return action.state

    case 'state/reset':
      return initialState()

    case 'state/loadSample':
      return sampleState()

    default:
      return state
  }
}
