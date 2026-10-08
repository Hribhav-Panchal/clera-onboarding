import { buildRoles } from '../data/seed'
import { STATE_VERSION, initialState, type AppState } from './reducer'

export const STORAGE_KEY = 'clera:state:v1'

type Persisted = Omit<AppState, 'roles'>

function storage(): Storage | null {
  try {
    const s = window.localStorage
    const probe = '__clera_probe__'
    s.setItem(probe, probe)
    s.removeItem(probe)
    return s
  } catch {
    // Private mode, blocked cookies, or SSR — run in memory only.
    return null
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Defensive parse — anything unexpected falls back to a fresh state. */
export function parseState(raw: string | null): AppState | null {
  if (!raw) return null
  try {
    const data: unknown = JSON.parse(raw)
    if (!isObject(data) || data.version !== STATE_VERSION) return null
    if (!isObject(data.profile) || !Array.isArray(data.matches) || !Array.isArray(data.applications)) return null
    const base = initialState()
    const roles = buildRoles()
    const p = data as unknown as Persisted
    return {
      ...base,
      ...p,
      profile: {
        ...base.profile,
        ...p.profile,
        essentials: { ...base.profile.essentials, ...p.profile.essentials },
        // Older saves predate profile details and extra documents.
        details: { ...base.profile.details, ...(isObject(p.profile.details) ? p.profile.details : {}) },
        documents: Array.isArray(p.profile.documents) ? p.profile.documents : [],
      },
      // Drop references to roles that no longer exist in the catalogue.
      matches: p.matches.filter((m) => roles[m.roleId]),
      applications: p.applications.filter((a) => roles[a.roleId]),
      drafts: isObject(p.drafts) ? p.drafts : {},
      roles,
    }
  } catch {
    return null
  }
}

export function loadState(): AppState {
  const s = storage()
  return parseState(s?.getItem(STORAGE_KEY) ?? null) ?? initialState()
}

export function saveState(state: AppState): void {
  const s = storage()
  if (!s) return
  const { roles: _roles, ...persisted } = state
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(persisted))
  } catch {
    // Quota exceeded — the app keeps working in memory.
  }
}
