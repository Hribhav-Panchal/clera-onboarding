export type WorkStyle = 'remote' | 'hybrid' | 'onsite'
export type VisaNeed = 'no' | 'yes' | 'unsure'
export type ProfileSource = 'resume' | 'manual' | 'chat' | 'mcp'

export interface Essentials {
  targetRole: string
  location: string
  /** Whole US dollars per year. `null` means the candidate is flexible. */
  minBasePay: number | null
  workStyles: WorkStyle[]
  visa: VisaNeed | null
}

export interface ResumeFile {
  fileName: string
  size: number
  uploadedAt: string
}

/** Where a piece of profile information came from. */
export type DetailSource = 'resume' | 'chat' | 'you'

export interface Sourced {
  source: DetailSource
  addedAt: string
}

export interface Experience extends Sourced {
  id: string
  title: string
  company: string
  location: string | null
  /** "2022" or "Mar 2022" — kept as written on the resume. */
  start: string
  /** null = present */
  end: string | null
  highlights: string[]
}

export interface Education extends Sourced {
  id: string
  school: string
  degree: string
  year: string | null
}

export interface Skill extends Sourced {
  name: string
}

export interface ProfileNote extends Sourced {
  id: string
  text: string
}

export type LinkKind = 'portfolio' | 'linkedin' | 'github' | 'website' | 'other'

export interface ProfileLink extends Sourced {
  id: string
  kind: LinkKind
  url: string
}

export interface ProfileDetails {
  headline: string
  summary: string
  /** Source of the headline + summary pair. null while empty. */
  aboutSource: DetailSource | null
  experience: Experience[]
  education: Education[]
  skills: Skill[]
  notes: ProfileNote[]
  links: ProfileLink[]
}

export type DocumentKind = 'portfolio' | 'cover-letter' | 'certificate' | 'writing-sample' | 'reference' | 'other'

export interface ExtraDocument {
  id: string
  name: string
  size: number
  mime: string
  kind: DocumentKind
  addedAt: string
  /** Off by default: only the resume goes out with an introduction unless you say so. */
  shared: boolean
}

export interface Profile {
  firstName: string
  email: string
  source: ProfileSource | null
  resume: ResumeFile | null
  essentials: Essentials
  /** Which essentials were pre-filled by Clera (drives the "From your resume" tags). */
  prefilled: Partial<Record<keyof Essentials, boolean>>
  onboarded: boolean
  /** ISO timestamp of the last autosave of the onboarding form. */
  savedAt: string | null
  details: ProfileDetails
  documents: ExtraDocument[]
}

export type LogoTone = 'sage' | 'muted' | 'clay'

export interface FitReason {
  kind: 'match' | 'gap'
  text: string
}

export type Question =
  | {
      id: string
      kind: 'choice'
      prompt: string
      options: string[]
      prefill: string | null
      source: 'preferences'
      sourceNote: string
    }
  | {
      id: string
      kind: 'text'
      prompt: string
      prefill: string
      source: 'resume'
      sourceNote: string
      maxLength: number
    }

export interface Role {
  id: string
  company: string
  initials: string
  tone: LogoTone
  title: string
  /** Display string, or null when the listing does not include pay. */
  pay: string | null
  /** Display string, or null when the listing does not say. */
  workStyle: string | null
  workStyleDetail: string | null
  location: string
  stage: string | null
  postedAt: string
  fit: number
  fitReasons: FitReason[]
  /** One-line reason shown on the match card. */
  why: string
  /** Optional caution shown under the match card. */
  conflict: string | null
  essentials: string
  clarify: string | null
  description: string
  questions: Question[]
  sharedFields: string
}

export type MatchStatus = 'new' | 'dismissed' | 'requested'

export interface Match {
  roleId: string
  status: MatchStatus
  receivedAt: string
  /** True until the candidate opens the role for the first time. */
  unseen: boolean
}

export type ApplicationStage = 'waiting' | 'invited' | 'booked' | 'closed'

export interface Application {
  roleId: string
  stage: ApplicationStage
  sentAt: string
  answers: Record<string, string>
  /** Interview slots offered by the company (ISO strings). */
  offeredSlots: string[]
  /** The company's time zone for the offered slots. */
  slotTimeZone: string
  repliedAt: string | null
  bookedSlot: string | null
  bookedAt: string | null
  closedAt: string | null
  closedReason: string | null
  readAt: string | null
  hidden: boolean
  withdrawn: boolean
}

export type AIProvider = 'claude' | 'chatgpt' | 'gemini' | 'grok'

export interface AIConnection {
  provider: AIProvider
  account: string
  connectedAt: string
  verifiedAt: string
}
