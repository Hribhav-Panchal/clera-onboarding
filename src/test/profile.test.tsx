import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { rememberedFact } from '../assistant/replies'
import { parsedDetails } from '../data/seed'
import { checkDocumentFile, normalizeUrl } from '../lib/validation'
import { DocumentsPage, guessKind } from '../pages/DocumentsPage'
import { ProfilePage } from '../pages/profile/ProfilePage'
import { parseState } from '../state/persist'
import { mergeDetails, reducer, sampleState } from '../state/reducer'
import { renderAt } from './render'

describe('profile details', () => {
  it('keeps your own edits and chat notes when a new resume is read', () => {
    let s = sampleState()
    s = reducer(s, { type: 'details/aboutChanged', headline: 'My words', summary: 'Mine' })
    s = reducer(s, { type: 'details/skillAdded', name: 'Rust', at: '' })
    const merged = mergeDetails(s.profile.details, parsedDetails('resume'))
    expect(merged.headline).toBe('My words')
    expect(merged.aboutSource).toBe('you')
    expect(merged.skills.some((x) => x.name === 'Rust' && x.source === 'you')).toBe(true)
    expect(merged.skills.some((x) => x.source === 'chat')).toBe(true)
    expect(merged.notes.length).toBe(s.profile.details.notes.length)
  })

  it('ignores duplicate skills regardless of case', () => {
    const s = reducer(sampleState(), { type: 'details/skillAdded', name: 'figma', at: '' })
    expect(s.profile.details.skills.filter((x) => x.name.toLowerCase() === 'figma')).toHaveLength(1)
  })

  it('migrates saves made before details existed', () => {
    const { roles: _r, ...persisted } = sampleState()
    const old = { ...persisted, profile: { ...persisted.profile } } as Record<string, unknown> & { profile: Record<string, unknown> }
    delete old.profile.details
    delete old.profile.documents
    const back = parseState(JSON.stringify(old))!
    expect(back.profile.details.skills).toEqual([])
    expect(back.profile.documents).toEqual([])
  })

  it('turns "Remember that…" into a note', () => {
    expect(rememberedFact('Remember that I prefer small teams.')).toBe('I prefer small teams')
    expect(rememberedFact('please note: no on-site roles')).toBe('No on-site roles')
    expect(rememberedFact('compare my matches')).toBeNull()
  })
})

describe('documents and links', () => {
  it('normalises links and rejects junk', () => {
    expect(normalizeUrl('example.com/me')).toBe('https://example.com/me')
    expect(normalizeUrl('https://linkedin.com/in/x/')).toBe('https://linkedin.com/in/x/')
    expect(normalizeUrl('example.com')).toBe('https://example.com')
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeUrl('not a url')).toBeNull()
    expect(normalizeUrl('localhost')).toBeNull()
  })

  it('checks extra documents', () => {
    const f = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type })
    expect(checkDocumentFile(f('portfolio.pdf', 'application/pdf'), 0).ok).toBe(true)
    expect(checkDocumentFile(f('shot.png', 'image/png'), 0).ok).toBe(true)
    expect(checkDocumentFile(f('app.exe', 'application/octet-stream'), 0).ok).toBe(false)
    expect(checkDocumentFile(f('fake.pdf', 'image/png'), 0).ok).toBe(false)
    expect(checkDocumentFile(f('a.pdf', 'application/pdf', 0), 0).ok).toBe(false)
    expect(checkDocumentFile(f('a.pdf', 'application/pdf'), 10).ok).toBe(false)
  })

  it('guesses a sensible type from the file name', () => {
    expect(guessKind('Hribhav_Portfolio_2026.pdf')).toBe('portfolio')
    expect(guessKind('cover-letter-colare.docx')).toBe('cover-letter')
    expect(guessKind('notes.txt')).toBe('other')
  })

  it('uploads a document privately and lets you share it', async () => {
    renderAt('/documents', <DocumentsPage />, sampleState())
    const input = document.querySelectorAll('input[type=file]')[1] as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'Case studies portfolio.pdf', { type: 'application/pdf' })] } })
    const share = await screen.findByRole('switch', {}, { timeout: 4000 })
    expect(share).not.toBeChecked()
    expect(screen.getByLabelText(/Document type for Case studies/)).toHaveValue('portfolio')
    await userEvent.click(share)
    expect(share).toBeChecked()
  })

  it('rejects a bad link with a message', async () => {
    renderAt('/documents', <DocumentsPage />, sampleState())
    await userEvent.type(screen.getByLabelText('Web address'), 'not a url')
    await userEvent.click(screen.getAllByRole('button', { name: 'Add' })[0])
    expect(await screen.findByText(/Enter a web address/)).toBeInTheDocument()
  })
})

describe('Profile page', () => {
  it('labels where each detail came from and supports undo on notes', async () => {
    renderAt('/profile', <ProfilePage />, sampleState())
    expect(screen.getByText(/Built from your resume/)).toBeInTheDocument()
    expect(screen.getAllByText('From your chats').length).toBeGreaterThan(0)
    const before = screen.getAllByRole('button', { name: /^Remove: / }).length
    await userEvent.click(screen.getAllByRole('button', { name: /^Remove: / })[0])
    expect(screen.getAllByRole('button', { name: /^Remove: / })).toHaveLength(before - 1)
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Remove: / })).toHaveLength(before))
  })
})
