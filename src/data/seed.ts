import { PACIFIC, daysAgo, hoursAgo, nextWeekday, zonedTimeToIso } from '../lib/time'
import type { Application, Essentials, Match, Profile, Role } from './types'

/*
 * Mock catalogue. Everything here would come from the Clera API in
 * production; see src/api/client.ts for the boundary.
 */

const defaultQuestions = (company: string, city: string): Role['questions'] => [
  {
    id: 'q-work-style',
    kind: 'choice',
    prompt: `Are you open to hybrid work in ${city}?`,
    options: ['Yes', 'Discuss details'],
    prefill: 'Yes',
    source: 'preferences',
    sourceNote: 'You said remote or hybrid works. Only you can confirm this.',
  },
  {
    id: 'q-fit',
    kind: 'text',
    prompt: 'What makes this role a good fit for you?',
    prefill: `I want a role where I can shape a product from early research through delivery. My work simplifying complex workflows is directly relevant to what ${company} is building.`,
    source: 'resume',
    sourceNote: 'Based on your resume. Read it as yours before sending.',
    maxLength: 600,
  },
]

export function buildRoles(now = Date.now()): Record<string, Role> {
  const roles: Role[] = [
    {
      id: 'colare-founding-product-designer',
      company: 'Colare',
      initials: 'CO',
      tone: 'muted',
      title: 'Founding Product Designer',
      pay: '$140k–$185k + equity',
      workStyle: 'Hybrid',
      workStyleDetail: 'Hybrid, days unconfirmed',
      location: 'San Francisco',
      stage: 'Seed, team of 9',
      postedAt: daysAgo(3, now),
      fit: 86,
      fitReasons: [
        { kind: 'match', text: 'Role and seniority match your target' },
        { kind: 'match', text: 'San Francisco, hybrid, within your preferences' },
        { kind: 'gap', text: 'Early-stage scope is broader than your recent roles' },
      ],
      why: 'Role and location match what you confirmed. Early-stage, so expect a broad scope.',
      conflict: null,
      essentials:
        'Shape the product from early research through delivery. Work closely with the team to turn customer needs into clear, usable experiences.',
      clarify:
        'Confirm the weekly office expectation, and how much of the role is product strategy, hands-on design or design engineering.',
      description:
        'Colare is building collaborative tooling for hardware teams. As the founding product designer you will own the end-to-end experience: interviewing customers, defining the problems worth solving, prototyping, and shipping alongside engineering. You will set up the foundations of our design system and help hire the next designers.\n\nYou will work directly with the founders and a team of nine. We expect a mix of product strategy, hands-on interface design and some front-end work.',
      questions: defaultQuestions('Colare', 'San Francisco'),
      sharedFields: 'your name, resume, these two answers and your portfolio link',
    },
    {
      id: 'tavus-senior-product-designer',
      company: 'Tavus',
      initials: 'TA',
      tone: 'muted',
      title: 'Senior Product Designer',
      pay: null,
      workStyle: null,
      workStyleDetail: null,
      location: 'San Francisco',
      stage: 'Series A',
      postedAt: daysAgo(5, now),
      fit: 72,
      fitReasons: [
        { kind: 'match', text: 'Design role in your preferred city' },
        { kind: 'gap', text: 'Work pattern is not listed' },
        { kind: 'gap', text: 'Pay is not listed' },
      ],
      why: 'Design role in your preferred city. Seniority and pay need confirming before an introduction.',
      conflict: null,
      essentials: 'Own core product surfaces end to end, from discovery through polish, in a fast-moving AI video product.',
      clarify: 'Ask about the pay range and whether the team works remote, hybrid or on-site.',
      description:
        'Tavus builds AI video tooling. The senior product designer will own key product surfaces, partner with research and engineering, and raise the bar on interaction quality.',
      questions: defaultQuestions('Tavus', 'San Francisco'),
      sharedFields: 'your name, resume, these two answers and your portfolio link',
    },
    {
      id: 'catalyst-founding-designer',
      company: 'Catalyst',
      initials: 'CA',
      tone: 'muted',
      title: 'Founding Designer',
      pay: '$210k–$300k + equity',
      workStyle: 'Hybrid',
      workStyleDetail: 'Hybrid, attendance unclear',
      location: 'Palo Alto',
      stage: 'Seed, team of 6',
      postedAt: daysAgo(1, now),
      fit: 58,
      fitReasons: [
        { kind: 'match', text: 'Founding scope matches your direction' },
        { kind: 'gap', text: 'Palo Alto is a longer commute' },
        { kind: 'gap', text: 'Office expectation conflicts with the listing' },
      ],
      why: 'Strong role, longer commute.',
      conflict: 'The listing says hybrid, but the screening asks about full-time attendance. Worth clarifying first.',
      essentials: 'Define the product and brand from zero with a small founding team.',
      clarify: 'Confirm whether the role is hybrid or full-time in the office.',
      description:
        'Catalyst is a seed-stage fintech infrastructure company. The founding designer will define the product, brand and design practice from scratch.',
      questions: defaultQuestions('Catalyst', 'Palo Alto'),
      sharedFields: 'your name, resume, these two answers and your portfolio link',
    },
    {
      id: 'c3ai-product-designer',
      company: 'C3 AI',
      initials: 'C3',
      tone: 'sage',
      title: 'Product Designer',
      pay: '$150k–$190k',
      workStyle: 'Hybrid',
      workStyleDetail: 'Hybrid, 3 days',
      location: 'Redwood City',
      stage: 'Public',
      postedAt: daysAgo(14, now),
      fit: 81,
      fitReasons: [{ kind: 'match', text: 'Role matches your target' }],
      why: 'Enterprise AI product design role close to home.',
      conflict: null,
      essentials: 'Design enterprise AI applications used by operations teams.',
      clarify: null,
      description: 'C3 AI builds enterprise AI applications.',
      questions: defaultQuestions('C3 AI', 'Redwood City'),
      sharedFields: 'your name, resume, these two answers and your portfolio link',
    },
    {
      id: 'vellum-product-designer',
      company: 'Vellum',
      initials: 'VL',
      tone: 'muted',
      title: 'Product Designer',
      pay: '$160k–$200k',
      workStyle: 'Remote',
      workStyleDetail: 'Remote',
      location: 'New York',
      stage: 'Series A',
      postedAt: daysAgo(10, now),
      fit: 77,
      fitReasons: [{ kind: 'match', text: 'Remote role in your target' }],
      why: 'Remote product design role on developer tooling.',
      conflict: null,
      essentials: 'Design tools that help teams build with LLMs.',
      clarify: null,
      description: 'Vellum builds LLM development tooling.',
      questions: defaultQuestions('Vellum', 'New York'),
      sharedFields: 'your name, resume, these two answers and your portfolio link',
    },
    {
      id: 'toast-senior-product-designer',
      company: 'Toast',
      initials: 'TO',
      tone: 'clay',
      title: 'Senior Product Designer',
      pay: '$170k–$210k',
      workStyle: 'Remote',
      workStyleDetail: 'Remote',
      location: 'Remote',
      stage: 'Public',
      postedAt: daysAgo(12, now),
      fit: 74,
      fitReasons: [{ kind: 'match', text: 'Remote, senior scope' }],
      why: 'Senior remote role on restaurant software.',
      conflict: null,
      essentials: 'Design point-of-sale and back-office experiences for restaurants.',
      clarify: null,
      description: 'Toast builds restaurant software.',
      questions: defaultQuestions('Toast', 'Boston'),
      sharedFields: 'your name, resume, these two answers and your portfolio link',
    },
    {
      id: 'writer-design-engineer',
      company: 'Writer',
      initials: 'WR',
      tone: 'muted',
      title: 'Design Engineer',
      pay: '$165k–$205k',
      workStyle: 'Hybrid',
      workStyleDetail: 'Hybrid',
      location: 'New York',
      stage: 'Series C',
      postedAt: daysAgo(20, now),
      fit: 69,
      fitReasons: [{ kind: 'match', text: 'Design engineering overlap' }],
      why: 'Design engineering role.',
      conflict: null,
      essentials: 'Prototype and ship UI for an enterprise AI platform.',
      clarify: null,
      description: 'Writer builds an enterprise generative AI platform.',
      questions: defaultQuestions('Writer', 'New York'),
      sharedFields: 'your name, resume, these two answers and your portfolio link',
    },
    {
      id: 'northwind-ux-designer',
      company: 'Northwind',
      initials: 'NW',
      tone: 'muted',
      title: 'UX Designer',
      pay: '$110k–$130k',
      workStyle: 'On-site',
      workStyleDetail: 'On-site, 5 days',
      location: 'Austin',
      stage: 'Series B',
      postedAt: daysAgo(9, now),
      fit: 41,
      fitReasons: [{ kind: 'gap', text: 'On-site in Austin' }],
      why: 'On-site role outside your preferred location.',
      conflict: null,
      essentials: 'Design logistics dashboards.',
      clarify: null,
      description: 'Northwind builds logistics software.',
      questions: defaultQuestions('Northwind', 'Austin'),
      sharedFields: 'your name, resume, these two answers and your portfolio link',
    },
    {
      id: 'halcyon-visual-designer',
      company: 'Halcyon',
      initials: 'HA',
      tone: 'muted',
      title: 'Visual Designer',
      pay: '$95k–$120k',
      workStyle: 'Remote',
      workStyleDetail: 'Remote',
      location: 'Remote',
      stage: 'Seed',
      postedAt: daysAgo(8, now),
      fit: 38,
      fitReasons: [{ kind: 'gap', text: 'Visual design focus, below your seniority' }],
      why: 'Visual design focus.',
      conflict: null,
      essentials: 'Brand and marketing design.',
      clarify: null,
      description: 'Halcyon is a climate startup.',
      questions: defaultQuestions('Halcyon', 'Remote'),
      sharedFields: 'your name, resume, these two answers and your portfolio link',
    },
  ]
  return Object.fromEntries(roles.map((r) => [r.id, r]))
}

/** The three roles Clera "finds" after onboarding. */
export const FIRST_MATCH_IDS = [
  'colare-founding-product-designer',
  'tavus-senior-product-designer',
  'catalyst-founding-designer',
]

export const EMPTY_ESSENTIALS: Essentials = {
  targetRole: '',
  location: '',
  minBasePay: null,
  workStyles: [],
  visa: null,
}

/** What the mock resume parser "extracts". */
export const PARSED_ESSENTIALS: Essentials = {
  targetRole: 'Product Designer',
  location: 'San Francisco, CA',
  minBasePay: null,
  workStyles: ['remote', 'hybrid'],
  visa: 'no',
}

export function newProfile(): Profile {
  return {
    firstName: 'Hribhav',
    email: 'hribhav.work@gmail.com',
    source: null,
    resume: null,
    essentials: { ...EMPTY_ESSENTIALS },
    prefilled: {},
    onboarded: false,
    savedAt: null,
  }
}

export function offeredSlots(now = Date.now()): string[] {
  const { y, m, d } = nextWeekday(3, PACIFIC, 2, now)
  return [
    zonedTimeToIso(y, m, d, 10, 0, PACIFIC),
    zonedTimeToIso(y, m, d, 10, 30, PACIFIC),
    zonedTimeToIso(y, m, d, 14, 0, PACIFIC),
  ]
}

function baseApplication(roleId: string, sentAt: string): Application {
  return {
    roleId,
    stage: 'waiting',
    sentAt,
    answers: {},
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
}

/** The "returning candidate" account shown in frame 01 · Home · matches ready. */
export function sampleAccount(now = Date.now()) {
  const profile: Profile = {
    ...newProfile(),
    source: 'resume',
    resume: { fileName: 'Hribhav-Panchal-Resume.pdf', size: 248_000, uploadedAt: daysAgo(9, now) },
    essentials: { ...PARSED_ESSENTIALS },
    prefilled: { targetRole: true, location: true },
    onboarded: true,
    savedAt: daysAgo(9, now),
  }
  const matches: Match[] = [
    ...FIRST_MATCH_IDS.map((roleId) => ({ roleId, status: 'new' as const, receivedAt: hoursAgo(3, now), unseen: true })),
    { roleId: 'northwind-ux-designer', status: 'dismissed', receivedAt: daysAgo(6, now), unseen: false },
    { roleId: 'halcyon-visual-designer', status: 'dismissed', receivedAt: daysAgo(6, now), unseen: false },
    { roleId: 'c3ai-product-designer', status: 'requested', receivedAt: daysAgo(8, now), unseen: false },
    { roleId: 'vellum-product-designer', status: 'requested', receivedAt: daysAgo(6, now), unseen: false },
    { roleId: 'toast-senior-product-designer', status: 'requested', receivedAt: daysAgo(6, now), unseen: false },
    { roleId: 'writer-design-engineer', status: 'requested', receivedAt: daysAgo(12, now), unseen: false },
  ]
  const applications: Application[] = [
    {
      ...baseApplication('c3ai-product-designer', daysAgo(5, now)),
      stage: 'invited',
      repliedAt: hoursAgo(2, now),
      offeredSlots: offeredSlots(now),
    },
    { ...baseApplication('vellum-product-designer', daysAgo(2, now)) },
    { ...baseApplication('toast-senior-product-designer', daysAgo(3, now)) },
    {
      ...baseApplication('writer-design-engineer', daysAgo(10, now)),
      stage: 'closed',
      closedAt: daysAgo(4, now),
      closedReason: 'The role was filled before your introduction was read',
    },
  ]
  return { profile, matches, applications }
}
