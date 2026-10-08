import type { Step } from '../../components/OnboardingShell'
import type { Profile } from '../../data/types'

export function onboardingSteps(profile: Profile, current: 'profile' | 'essentials'): Step[] {
  const hasStart = profile.source !== null
  return [
    {
      label: 'Profile',
      to: '/onboarding/resume',
      state: current === 'profile' ? 'current' : 'done',
      reachable: true,
    },
    {
      label: 'Essentials',
      to: '/onboarding/essentials',
      state: current === 'essentials' ? 'current' : 'todo',
      reachable: hasStart,
    },
  ]
}
