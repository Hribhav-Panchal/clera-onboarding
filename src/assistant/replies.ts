import { listJoin } from '../lib/format'
import type { AppState } from '../state/reducer'
import { matchesBy, trackRows } from '../state/selectors'

/*
 * Placeholder reply engine for the "Ask Clera" panel. It answers from the
 * candidate's real (mock) state so the conversation feels grounded. The
 * production assistant replaces `askClera` in src/api/client.ts.
 */
export function replyFor(message: string, state: AppState): string {
  const q = message.toLowerCase()
  const fresh = matchesBy(state, 'new')
  const rows = trackRows(state)

  if (/compare|three|which match|first/.test(q)) {
    if (fresh.length === 0) return 'You have no open matches to compare right now. I will tell you when new ones land.'
    const ranked = fresh.map(({ role }) => `${role.company} (${role.fit}% fit)`)
    const best = fresh[0].role
    return `Ranked by fit: ${listJoin(ranked)}. ${best.company} is the closest — ${best.why.charAt(0).toLowerCase()}${best.why.slice(1)}`
  }
  if (/dismiss|conflict/.test(q)) {
    const conflicted = fresh.filter(({ role }) => role.conflict)
    if (conflicted.length === 0) return 'None of your open matches have conflicts with your preferences.'
    return `${listJoin(conflicted.map(({ role }) => role.company))} ${conflicted.length === 1 ? 'has' : 'have'} a conflict worth checking. Use “Not for me” on the card if it is a dealbreaker — you can undo it.`
  }
  if (/how long|reply|replies/.test(q)) {
    return 'Most companies reply within a week. Seed-stage teams are often faster. I email you the moment they do, so there is no need to check back.'
  }
  if (/what did i send|sent to/.test(q)) {
    return 'They received your name, resume, portfolio link and the two answers you approved. Nothing else from your profile was shared.'
  }
  if (/time|pick/.test(q) && /which|should/.test(q)) {
    return 'I would pick the morning slot — it leaves you time to prepare and the team is usually fresher. Any slot is fine, though.'
  }
  if (/prepare|mock|practice/.test(q)) {
    return 'Start with one project story that shows research through delivery. Then note two questions for them, including how often the team is in the office.'
  }
  if (/shorter/.test(q)) {
    return 'Shorter version: “I want to shape a product from research to delivery, and my work simplifying complex workflows maps directly to what you are building.”'
  }
  if (/86|percent|why/.test(q)) {
    return 'The role and seniority match your target, and San Francisco hybrid sits within your preferences. The gap: early-stage scope is broader than your recent roles.'
  }
  if (/disconnect/.test(q)) {
    return 'Yes. You can disconnect any assistant from Settings at any time. Clera stops sharing immediately.'
  }
  if (/see|access/.test(q) && /claude|chatgpt|gemini|grok|assistant/.test(q)) {
    return 'It can see your profile, resume, matches and request status. It can never send a request or change a preference without you confirming in Clera.'
  }
  if (/roles|what kind/.test(q)) {
    const e = state.profile.essentials
    return `Roles like ${e.targetRole || 'your target role'} in ${e.location || 'your preferred location'}, filtered by your work style and visa answers. You will see the trade-offs on every match.`
  }
  if (/email|updates/.test(q)) {
    return `Updates go to ${state.profile.email}. You can change it in Settings.`
  }
  if (/status|track|where/.test(q) && rows.length) {
    const needs = rows.filter((r) => r.pill === 'needs-you').map((r) => r.role.company)
    return needs.length
      ? `${listJoin(needs)} ${needs.length === 1 ? 'is' : 'are'} waiting on you. Everything else is with the companies.`
      : 'Nothing needs you right now. Everything is with the companies.'
  }
  return 'Got it. I am a preview of the Clera assistant, so I can answer questions about your matches, requests and preferences — try one of the suggestions.'
}
