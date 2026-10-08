import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchFirstMatches } from '../api/client'
import { useToast } from '../components/Toast'
import { useAppState, useDispatch } from './store'

/** Prototype stand-in for the "your first matches are ready" push/email. */
export const FIRST_MATCH_DELAY_MS = 12_000

export function useMatchScheduler() {
  const { profile, matches, matchingStartedAt } = useAppState()
  const dispatch = useDispatch()
  const toast = useToast()
  const navigate = useNavigate()
  const waiting = profile.onboarded && matches.length === 0 && matchingStartedAt !== null

  useEffect(() => {
    if (!waiting || !matchingStartedAt) return
    let cancelled = false
    let timer: number
    const run = async () => {
      try {
        const delivered = await fetchFirstMatches()
        if (cancelled) return
        dispatch({ type: 'matches/delivered', matches: delivered })
        toast({
          message: `${delivered.length} matches are ready for you.`,
          tone: 'success',
          action: { label: 'Review', onClick: () => navigate('/matches') },
        })
      } catch {
        if (!cancelled) timer = window.setTimeout(run, 5000)
      }
    }
    const due = new Date(matchingStartedAt).getTime() + FIRST_MATCH_DELAY_MS - Date.now()
    timer = window.setTimeout(run, Math.max(0, due))
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [waiting, matchingStartedAt, dispatch, toast, navigate])
}
