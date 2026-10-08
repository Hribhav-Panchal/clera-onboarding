import { describe, expect, it } from 'vitest'
import { buildRoles, sampleAccount } from '../data/seed'
import { timeRange } from '../lib/format'
import { zonedTimeToIso } from '../lib/time'
import { checkResumeFile, hasPdfSignature, parsePay, validateEssentials } from '../lib/validation'
import { parseState, STORAGE_KEY } from '../state/persist'
import { initialState, reducer, sampleState } from '../state/reducer'
import { matchCounts, nextStep, trackRow, trackRows } from '../state/selectors'

const file = (name: string, body: BlobPart, type = 'application/pdf') => new File([body], name, { type })

describe('resume file checks', () => {
  it('accepts a PDF', () => {
    expect(checkResumeFile(file('cv.pdf', '%PDF-1.4'))).toEqual({ ok: true })
  })
  it('rejects other formats, empty and oversized files', () => {
    expect(checkResumeFile(file('cv.docx', 'x', 'application/msword')).ok).toBe(false)
    expect(checkResumeFile(file('cv.pdf', '')).ok).toBe(false)
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'cv.pdf', { type: 'application/pdf' })
    expect(checkResumeFile(big).ok).toBe(false)
    expect(checkResumeFile(null).ok).toBe(false)
  })
  it('detects renamed non-PDF files by signature', async () => {
    expect(await hasPdfSignature(file('cv.pdf', '%PDF-1.7 ...'))).toBe(true)
    expect(await hasPdfSignature(file('cv.pdf', 'PK\u0003\u0004'))).toBe(false)
  })
})

describe('essentials', () => {
  it('parses pay in the formats people type', () => {
    expect(parsePay('')).toBeNull()
    expect(parsePay('145000')).toBe(145000)
    expect(parsePay('$145,000')).toBe(145000)
    expect(parsePay('145k')).toBe(145000)
    expect(parsePay('145.5K')).toBe(145500)
    expect(parsePay('lots')).toBeNaN()
  })
  it('requires role, location, a work style and a visa answer', () => {
    const errs = validateEssentials({ targetRole: ' ', location: '', minBasePay: null, workStyles: [], visa: null })
    expect(Object.keys(errs).sort()).toEqual(['location', 'targetRole', 'visa', 'workStyles'])
  })
  it('flags implausible pay', () => {
    const base = { targetRole: 'Designer', location: 'SF', workStyles: ['remote' as const], visa: 'no' as const }
    expect(validateEssentials({ ...base, minBasePay: 150 }).minBasePay).toMatch(/thousands/)
    expect(validateEssentials({ ...base, minBasePay: 50_000_000 }).minBasePay).toBeTruthy()
    expect(validateEssentials({ ...base, minBasePay: Number.NaN }).minBasePay).toBeTruthy()
    expect(validateEssentials({ ...base, minBasePay: 150_000 })).toEqual({})
  })
})

describe('time', () => {
  it('converts Pacific wall-clock time across DST', () => {
    expect(zonedTimeToIso(2026, 1, 14, 10, 30, 'America/Los_Angeles')).toBe('2026-01-14T18:30:00.000Z')
    expect(zonedTimeToIso(2026, 7, 14, 10, 30, 'America/Los_Angeles')).toBe('2026-07-14T17:30:00.000Z')
  })
  it('collapses the meridiem in ranges', () => {
    const iso = zonedTimeToIso(2026, 10, 14, 10, 30, 'America/Los_Angeles')
    expect(timeRange(iso, 30, 'America/Los_Angeles')).toBe('10:30 to 11:00 AM')
    const late = zonedTimeToIso(2026, 10, 14, 11, 45, 'America/Los_Angeles')
    expect(timeRange(late, 30, 'America/Los_Angeles')).toBe('11:45 AM to 12:15 PM')
  })
})

describe('reducer', () => {
  const roleId = 'colare-founding-product-designer'
  const at = new Date().toISOString()

  it('walks a role from match to booked', () => {
    let s = sampleState()
    s = reducer(s, { type: 'application/sent', roleId, answers: { a: 'b' }, at })
    expect(s.matches.find((m) => m.roleId === roleId)?.status).toBe('requested')
    s = reducer(s, { type: 'application/replied', roleId, slots: ['2030-01-01T18:00:00.000Z'], at })
    expect(s.applications.find((a) => a.roleId === roleId)?.stage).toBe('invited')
    s = reducer(s, { type: 'application/booked', roleId, slot: '2030-01-01T18:00:00.000Z', at })
    expect(s.applications.find((a) => a.roleId === roleId)?.stage).toBe('booked')
    s = reducer(s, { type: 'application/bookingCancelled', roleId })
    expect(s.applications.find((a) => a.roleId === roleId)?.stage).toBe('invited')
  })

  it('ignores a duplicate send', () => {
    let s = reducer(sampleState(), { type: 'application/sent', roleId, answers: {}, at })
    const again = reducer(s, { type: 'application/sent', roleId, answers: { x: 'y' }, at })
    expect(again).toBe(s)
    s = again
    expect(s.applications.filter((a) => a.roleId === roleId)).toHaveLength(1)
  })

  it('withdrawing returns the role to New', () => {
    let s = reducer(sampleState(), { type: 'application/sent', roleId, answers: {}, at })
    s = reducer(s, { type: 'application/withdrawn', roleId })
    expect(s.applications.some((a) => a.roleId === roleId)).toBe(false)
    expect(s.matches.find((m) => m.roleId === roleId)?.status).toBe('new')
  })

  it('does not book a role that was never invited', () => {
    const s = reducer(sampleState(), { type: 'application/sent', roleId, answers: {}, at })
    expect(reducer(s, { type: 'application/booked', roleId, slot: at, at })).toEqual(s)
  })

  it('de-duplicates delivered matches and drops unknown roles', () => {
    const s = sampleState()
    const next = reducer(s, {
      type: 'matches/delivered',
      matches: [
        { roleId, status: 'new', receivedAt: at, unseen: true },
        { roleId: 'does-not-exist', status: 'new', receivedAt: at, unseen: true },
      ],
    })
    expect(next).toBe(s)
  })

  it('editing a prefilled field drops its "from your resume" tag', () => {
    let s = reducer(initialState(), {
      type: 'resume/uploaded',
      resume: { fileName: 'a.pdf', size: 1, uploadedAt: at },
      essentials: { targetRole: 'Designer', location: 'SF', minBasePay: null, workStyles: ['remote'], visa: 'no' },
    })
    expect(s.profile.prefilled.targetRole).toBe(true)
    s = reducer(s, { type: 'essentials/changed', patch: { targetRole: 'Engineer' } })
    expect(s.profile.prefilled.targetRole).toBeUndefined()
    expect(s.profile.prefilled.location).toBe(true)
  })
})

describe('persistence', () => {
  it('falls back on corrupt or foreign data', () => {
    expect(parseState(null)).toBeNull()
    expect(parseState('{nope')).toBeNull()
    expect(parseState(JSON.stringify({ version: 99 }))).toBeNull()
    expect(parseState(JSON.stringify({ version: 1, profile: {}, matches: 'x', applications: [] }))).toBeNull()
  })
  it('round-trips and drops references to removed roles', () => {
    const s = sampleState()
    const { roles: _r, ...persisted } = s
    persisted.matches.push({ roleId: 'gone', status: 'new', receivedAt: '', unseen: true })
    const back = parseState(JSON.stringify(persisted))!
    expect(back.matches.some((m) => m.roleId === 'gone')).toBe(false)
    expect(back.profile.firstName).toBe(s.profile.firstName)
    expect(Object.keys(back.roles).length).toBeGreaterThan(0)
    expect(STORAGE_KEY).toMatch(/v1$/)
  })
})

describe('selectors', () => {
  it('orders the track with what needs you first', () => {
    const rows = trackRows(sampleState())
    expect(rows[0].pill).toBe('needs-you')
    expect(rows[rows.length - 1].pill).toBe('closed')
  })
  it('prefers new matches, then invitations, as the next step', () => {
    const s = sampleState()
    expect(nextStep(s, trackRows(s))?.cta.to).toBe('/matches')
    const noNew = { ...s, matches: s.matches.map((m) => (m.status === 'new' ? { ...m, status: 'dismissed' as const } : m)) }
    expect(nextStep(noNew, trackRows(noNew))?.cta.label).toBe('Pick a time')
    expect(matchCounts(noNew).new).toBe(0)
  })
  it('describes a waiting row in plain words', () => {
    const now = Date.now()
    const { applications } = sampleAccount(now)
    const roles = buildRoles(now)
    const vellum = applications.find((a) => a.roleId === 'vellum-product-designer')!
    const row = trackRow(roles[vellum.roleId], vellum, now)
    expect(row.next).toBe('Next: Vellum · 2 days')
    expect(row.pill).toBe('waiting')
  })
})
