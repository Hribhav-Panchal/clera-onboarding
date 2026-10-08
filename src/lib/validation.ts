import type { Essentials } from '../data/types'

export const MAX_RESUME_BYTES = 10 * 1024 * 1024

export type FileCheck = { ok: true } | { ok: false; reason: string }

/** Cheap checks that do not need to read the file. */
export function checkResumeFile(file: File | null | undefined): FileCheck {
  if (!file) return { ok: false, reason: 'No file was selected.' }
  const isPdfName = /\.pdf$/i.test(file.name)
  const isPdfType = file.type === 'application/pdf' || file.type === ''
  if (!isPdfName || !isPdfType) {
    return { ok: false, reason: `“${file.name}” is not a PDF. Export your resume as a PDF and try again.` }
  }
  if (file.size === 0) return { ok: false, reason: 'That file is empty. Choose a different PDF.' }
  if (file.size > MAX_RESUME_BYTES) {
    return { ok: false, reason: 'That PDF is larger than 10 MB. Try a smaller export.' }
  }
  return { ok: true }
}

/** Verifies the PDF magic number ("%PDF-") so renamed files are caught early. */
export async function hasPdfSignature(file: Blob): Promise<boolean> {
  try {
    const head = file.slice(0, 5)
    const buf = typeof head.arrayBuffer === 'function' ? await head.arrayBuffer() : await new Response(head).arrayBuffer()
    return new TextDecoder().decode(buf) === '%PDF-'
  } catch {
    return false
  }
}

export type EssentialsErrors = Partial<Record<keyof Essentials, string>>

export const LIMITS = { role: 80, location: 80, pay: 2_000_000 } as const

export function validateEssentials(e: Essentials): EssentialsErrors {
  const errors: EssentialsErrors = {}
  const role = e.targetRole.trim()
  if (!role) errors.targetRole = 'Add the role you want next.'
  else if (role.length < 2) errors.targetRole = 'That looks too short for a role title.'
  else if (role.length > LIMITS.role) errors.targetRole = `Keep this under ${LIMITS.role} characters.`

  const loc = e.location.trim()
  if (!loc) errors.location = 'Add a city, or type “Remote”.'
  else if (loc.length > LIMITS.location) errors.location = `Keep this under ${LIMITS.location} characters.`

  if (e.minBasePay !== null) {
    if (!Number.isFinite(e.minBasePay) || e.minBasePay <= 0) errors.minBasePay = 'Enter a yearly amount, or leave it empty.'
    else if (e.minBasePay < 1000) errors.minBasePay = 'This is a yearly amount — did you mean thousands?'
    else if (e.minBasePay > LIMITS.pay) errors.minBasePay = 'That amount looks too high. Check for an extra zero.'
  }

  if (e.workStyles.length === 0) errors.workStyles = 'Pick at least one work style.'
  if (e.visa === null) errors.visa = 'Choose an answer so we can filter roles correctly.'
  return errors
}

/**
 * Parses free-form pay input: "145000", "$145,000", "145k", "145.5k".
 * Returns null for empty input and NaN for unparseable input.
 */
export function parsePay(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/[$,\s]/g, '')
  if (!s) return null
  const m = s.match(/^(\d+(?:\.\d+)?)(k)?$/)
  if (!m) return Number.NaN
  const n = Number(m[1]) * (m[2] ? 1000 : 1)
  return Math.round(n)
}

export const MAX_CHAT_LENGTH = 2000

/* ------------------------------------------------------- Extra documents */

export const MAX_DOCUMENTS = 10

const DOC_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/x-markdown', 'text/plain'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
}

export const DOCUMENT_ACCEPT = Object.keys(DOC_TYPES)
  .map((e) => `.${e}`)
  .join(',')

export function checkDocumentFile(file: File, existing: number): FileCheck {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const allowed = DOC_TYPES[ext]
  if (!allowed || (file.type && !allowed.includes(file.type))) {
    return { ok: false, reason: `“${file.name}” isn’t a supported type. Use PDF, Word, text or an image.` }
  }
  if (file.size === 0) return { ok: false, reason: `“${file.name}” is empty.` }
  if (file.size > MAX_RESUME_BYTES) return { ok: false, reason: `“${file.name}” is larger than 10 MB.` }
  if (existing >= MAX_DOCUMENTS) return { ok: false, reason: `You can keep up to ${MAX_DOCUMENTS} documents. Remove one first.` }
  return { ok: true }
}

/** Accepts "example.com/me" and adds https://. Returns null when it can't be a public web link. */
export function normalizeUrl(raw: string): string | null {
  const s = raw.trim()
  if (!s || /\s/.test(s)) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (!u.hostname.includes('.') || u.hostname.endsWith('.')) return null
    const out = u.toString()
    return u.pathname === '/' && !u.search && !u.hash ? out.slice(0, -1) : out
  } catch {
    return null
  }
}
