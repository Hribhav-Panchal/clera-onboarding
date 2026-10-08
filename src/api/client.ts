import { PARSED_ESSENTIALS, FIRST_MATCH_IDS } from '../data/seed'
import type { AIConnection, AIProvider, Essentials, Match, ResumeFile } from '../data/types'
import { hasPdfSignature } from '../lib/validation'

/*
 * Mock Clera API.
 *
 * Every function here is async, can fail, and honours AbortSignal — the
 * same contract a real fetch-based client would have — so screens are
 * written against realistic latency and error states. Swap the bodies for
 * real HTTP calls without touching the UI.
 */

export class ApiError extends Error {
  readonly retryable: boolean
  constructor(message: string, retryable = true) {
    super(message)
    this.name = 'ApiError'
    this.retryable = retryable
  }
}

export class AbortError extends Error {
  constructor() {
    super('Request was cancelled')
    this.name = 'AbortError'
  }
}

export type NetworkMode = 'normal' | 'slow' | 'flaky'

let mode: NetworkMode = 'normal'
export function setNetworkMode(next: NetworkMode) {
  mode = next
}
export function getNetworkMode(): NetworkMode {
  return mode
}

function latency(base: number) {
  const jitter = Math.random() * base * 0.4
  return mode === 'slow' ? base * 4 + jitter : base + jitter
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortError())
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(t)
      reject(new AbortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function call<T>(base: number, work: () => T, signal?: AbortSignal): Promise<T> {
  await wait(latency(base), signal)
  if (mode === 'flaky' && Math.random() < 0.5) {
    throw new ApiError('We could not reach Clera. Check your connection and try again.')
  }
  return work()
}

export function isAbort(err: unknown): boolean {
  return err instanceof AbortError || (err instanceof DOMException && err.name === 'AbortError')
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return 'Something went wrong on our side. Try again in a moment.'
}

/* ---------------------------------------------------------------- Resume */

export async function uploadResume(
  file: File,
  opts: { onProgress?: (pct: number) => void; signal?: AbortSignal } = {},
): Promise<{ resume: ResumeFile; essentials: Essentials }> {
  const { onProgress, signal } = opts
  if (!(await hasPdfSignature(file))) {
    throw new ApiError('This file does not look like a valid PDF. Try exporting it again.', false)
  }
  // Simulated chunked upload so the progress bar has something honest to show.
  const steps = 12
  for (let i = 1; i <= steps; i++) {
    await wait(latency(70), signal)
    onProgress?.(Math.round((i / steps) * 100))
  }
  return call(
    600,
    () => ({
      resume: { fileName: file.name, size: file.size, uploadedAt: new Date().toISOString() },
      essentials: { ...PARSED_ESSENTIALS, workStyles: [...PARSED_ESSENTIALS.workStyles] },
    }),
    signal,
  )
}

/* ------------------------------------------------------------- Profile */

export function saveEssentials(_e: Essentials, signal?: AbortSignal) {
  return call(350, () => ({ savedAt: new Date().toISOString() }), signal)
}

export function startMatching(_e: Essentials) {
  return call(700, () => ({ startedAt: new Date().toISOString() }))
}

export function fetchFirstMatches(): Promise<Match[]> {
  return call(400, () =>
    FIRST_MATCH_IDS.map((roleId) => ({ roleId, status: 'new', receivedAt: new Date().toISOString(), unseen: true })),
  )
}

/* ------------------------------------------------------------- Matches */

export function dismissMatch(_roleId: string) {
  return call(250, () => ({ ok: true }))
}

export function restoreMatch(_roleId: string) {
  return call(250, () => ({ ok: true }))
}

export function requestIntro(_roleId: string, _answers: Record<string, string>) {
  return call(900, () => ({ sentAt: new Date().toISOString() }))
}

export function withdrawRequest(_roleId: string) {
  return call(600, () => ({ ok: true }))
}

export function confirmInterview(_roleId: string, slot: string) {
  return call(800, () => {
    if (new Date(slot).getTime() <= Date.now()) {
      throw new ApiError('That time has already passed. Pick another time.', false)
    }
    return { bookedAt: new Date().toISOString() }
  })
}

export function requestAnotherTime(_roleId: string) {
  return call(600, () => ({ ok: true }))
}

export function cancelInterview(_roleId: string) {
  return call(700, () => ({ ok: true }))
}

/* -------------------------------------------------------- AI connections */

export function connectAssistant(provider: AIProvider, account: string, signal?: AbortSignal): Promise<AIConnection> {
  return call(
    1400,
    () => {
      const now = new Date().toISOString()
      return { provider, account, connectedAt: now, verifiedAt: now }
    },
    signal,
  )
}

export function disconnectAssistant(_provider: AIProvider) {
  return call(500, () => ({ ok: true }))
}

/* ----------------------------------------------------------- Assistant */

export function askClera(message: string, reply: (m: string) => string, signal?: AbortSignal) {
  return call(900 + Math.min(message.length * 4, 800), () => reply(message), signal)
}
