import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AssistantPanel } from '../assistant/AssistantPanel'
import { MatchesPage } from '../pages/MatchesPage'
import { EssentialsPage } from '../pages/onboarding/EssentialsPage'
import { ResumePage } from '../pages/onboarding/ResumePage'
import { RolePage } from '../pages/role/RolePage'
import { initialState, reducer, sampleState } from '../state/reducer'
import { renderAt } from './render'

describe('A1 · Add your resume', () => {
  it('rejects a non-PDF with a clear message', async () => {
    renderAt('/onboarding/resume', <ResumePage />, initialState())
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'cv.docx', { type: 'application/msword' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('is not a PDF')
    expect(screen.getByText('Choose another file')).toBeInTheDocument()
  })

  it('handles a file dropped on the zone', async () => {
    renderAt('/onboarding/resume', <ResumePage />, initialState())
    const zone = screen.getByRole('button', { name: /Add your resume/ })
    fireEvent.drop(zone, { dataTransfer: { files: [new File([''], 'empty.pdf', { type: 'application/pdf' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('empty')
  })
})

describe('A2 · Confirm essentials', () => {
  it('blocks submit and explains what is missing', async () => {
    const s = reducer(initialState(), { type: 'profile/startManual', source: 'manual' })
    renderAt('/onboarding/essentials', <EssentialsPage />, s)
    // No "looks right" shortcut without a resume.
    expect(screen.queryByText(/If this looks right/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Start matching' }))
    expect(await screen.findByText('Add the role you want next.')).toBeInTheDocument()
    expect(screen.getByText('Pick at least one work style.')).toBeInTheDocument()
    expect(screen.getByText(/Choose an answer/)).toBeInTheDocument()
  })

  it('clears an error as soon as it is fixed', async () => {
    const s = reducer(initialState(), { type: 'profile/startManual', source: 'manual' })
    renderAt('/onboarding/essentials', <EssentialsPage />, s)
    await userEvent.click(screen.getByRole('button', { name: 'Start matching' }))
    await userEvent.type(screen.getByLabelText('Target role'), 'Product Designer')
    expect(screen.queryByText('Add the role you want next.')).not.toBeInTheDocument()
  })

  it('redirects to step 1 when nothing was started', () => {
    renderAt('/onboarding/essentials', <EssentialsPage />, initialState())
    expect(screen.getByText('elsewhere')).toBeInTheDocument()
  })
})

describe('B1 · Matches', () => {
  it('dismisses a match and lets you undo it', async () => {
    renderAt('/matches', <MatchesPage />, sampleState())
    const list = screen.getByRole('tabpanel')
    expect(within(list).getAllByRole('heading', { level: 2 })).toHaveLength(3)
    await userEvent.click(screen.getByRole('button', { name: /Not for me: Founding Designer at Catalyst/ }))
    await waitFor(() => expect(within(list).getAllByRole('heading', { level: 2 })).toHaveLength(2), { timeout: 3000 })
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(within(list).getAllByRole('heading', { level: 2 })).toHaveLength(3))
  })

  it('shows an empty state per tab', async () => {
    const s = sampleState()
    s.matches = s.matches.filter((m) => m.status !== 'dismissed')
    renderAt('/matches', <MatchesPage />, s)
    await userEvent.click(screen.getByRole('tab', { name: /Dismissed/ }))
    expect(screen.getByText('Nothing dismissed')).toBeInTheDocument()
  })
})

describe('R1 → R2 · Ask for an introduction', () => {
  it('will not send an answer that is too short, then sends', async () => {
    renderAt('/roles/colare-founding-product-designer', <RolePage />, sampleState(), '/roles/:roleId')
    const answer = screen.getByLabelText(/What makes this role a good fit/)
    await userEvent.clear(answer)
    await userEvent.type(answer, 'Too short')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText(/at least a sentence/)).toBeInTheDocument()
    await userEvent.type(answer, ' — I have shipped research-led products end to end.')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText('Your introduction is on its way', {}, { timeout: 4000 })).toBeInTheDocument()
  })

  it('handles an unknown role', () => {
    renderAt('/roles/nope', <RolePage />, sampleState(), '/roles/:roleId')
    expect(screen.getByText('This role is no longer available')).toBeInTheDocument()
  })
})

describe('Ask Clera', () => {
  it('only sends real messages and answers them', async () => {
    renderAt('/', <AssistantPanel />, sampleState())
    const send = screen.getByRole('button', { name: 'Send message' })
    expect(send).toBeDisabled()
    const box = screen.getByLabelText('Ask Clera anything')
    await userEvent.type(box, '   ')
    expect(send).toBeDisabled()
    await userEvent.type(box, 'compare my matches{Enter}')
    expect(screen.getByText('compare my matches')).toBeInTheDocument()
    await act(async () => {})
    expect(await screen.findByText(/Ranked by fit/, {}, { timeout: 4000 })).toBeInTheDocument()
  })
})

describe('B1 · Apply from the card', () => {
  it('applies straight away when the profile answers everything, then the card leaves', async () => {
    renderAt('/matches', <MatchesPage />, sampleState())
    const list = screen.getByRole('tabpanel')
    await userEvent.click(screen.getByRole('button', { name: 'Apply: Founding Product Designer at Colare' }))
    expect(await screen.findByRole('button', { name: /^Applied: / }, { timeout: 4000 })).toBeDisabled()
    await waitFor(() => expect(within(list).getAllByRole('heading', { level: 2 })).toHaveLength(2), { timeout: 4000 })
    expect(screen.getByRole('tab', { name: /Applied/ })).toHaveTextContent('5')
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('flips to questions when the role needs answers Clera does not have', async () => {
    renderAt('/matches', <MatchesPage />, sampleState())
    await userEvent.click(screen.getByRole('button', { name: 'Apply: Founding Designer at Catalyst' }))
    expect(screen.getByRole('button', { name: /^Answer 2 questions: Founding Designer at Catalyst/ })).toBeEnabled()
    expect(screen.getByText(/asks two questions your profile doesn’t answer yet/)).toBeInTheDocument()
  })

  it('opens the role when the card itself is clicked', () => {
    renderAt('/matches', <MatchesPage />, sampleState())
    expect(screen.getByRole('link', { name: 'Founding Product Designer' })).toHaveAttribute(
      'href',
      '/roles/colare-founding-product-designer',
    )
    expect(screen.queryByRole('button', { name: /Details/ })).not.toBeInTheDocument()
  })
})

describe('R1 · questions that need you', () => {
  it('drafts an empty answer with Help me with AI and blocks applying until all are answered', async () => {
    renderAt('/roles/catalyst-founding-designer', <RolePage />, sampleState(), '/roles/:roleId')
    expect(screen.getAllByText('Needs your answer').length).toBe(2)
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText(/Answer this, or use Help me with AI/)).toBeInTheDocument()
    const helpers = screen.getAllByRole('button', { name: 'Help me with AI' })
    expect(helpers).toHaveLength(2)
    await userEvent.click(helpers[1])
    expect((screen.getByLabelText(/zero to one/) as HTMLTextAreaElement).value).toMatch(/Fieldnote/)
  })
})
