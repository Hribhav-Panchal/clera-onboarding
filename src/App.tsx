import { useRef } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AssistantProvider } from './assistant/context'
import { AppShell } from './components/AppShell'
import { Button } from './components/Button'
import { OnboardingShell } from './components/OnboardingShell'
import { ToastProvider } from './components/Toast'
import { useReveal } from './lib/useReveal'
import { ConnectAI } from './pages/connect/ConnectAI'
import { DocumentsPage } from './pages/DocumentsPage'
import { HomePage } from './pages/HomePage'
import { MatchesPage } from './pages/MatchesPage'
import { EssentialsPage } from './pages/onboarding/EssentialsPage'
import { ResumePage } from './pages/onboarding/ResumePage'
import { onboardingSteps } from './pages/onboarding/steps'
import { ProfilePage } from './pages/profile/ProfilePage'
import { RolePage } from './pages/role/RolePage'
import { SettingsPage } from './pages/SettingsPage'
import { useMatchScheduler } from './state/useMatchScheduler'
import { useAppState } from './state/store'
import styles from './pages/SimplePage.module.css'

/** Signed-in area: only after onboarding is complete. */
function RequireOnboarded() {
  const { profile } = useAppState()
  const location = useLocation()
  useMatchScheduler()
  if (!profile.onboarded) {
    const to = profile.source ? '/onboarding/essentials' : '/onboarding/resume'
    return <Navigate to={to} replace state={{ from: location.pathname }} />
  }
  return <AppShell />
}

/** Onboarding pages bounce to Home once setup is finished. */
function OnboardingOnly() {
  const { profile } = useAppState()
  if (profile.onboarded) return <Navigate to="/" replace />
  return <Outlet />
}

function OnboardingConnect() {
  const { profile } = useAppState()
  return (
    <OnboardingShell steps={onboardingSteps(profile, 'profile')} onSaveExit={() => undefined}>
      <div style={{ width: '100%', maxWidth: 792, padding: '48px 0 64px' }}>
        <ConnectAI mode="onboarding" />
      </div>
    </OnboardingShell>
  )
}

function NotFound() {
  const page = useRef<HTMLDivElement>(null)
  useReveal(page)
  return (
    <div ref={page} className={styles.page}>
      <header className={styles.header} data-reveal>
        <h1 className={styles.h1}>We could not find that page</h1>
        <p className={styles.sub}>The link may be out of date. Your profile and matches are safe.</p>
      </header>
      <div data-reveal>
        <Button variant="secondary" to="/">
          Go to Home
        </Button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AssistantProvider>
        <Routes>
          <Route element={<OnboardingOnly />}>
            <Route path="/onboarding/resume" element={<ResumePage />} />
            <Route path="/onboarding/essentials" element={<EssentialsPage />} />
            <Route path="/onboarding/connect" element={<OnboardingConnect />} />
          </Route>
          <Route path="/onboarding" element={<Navigate to="/onboarding/resume" replace />} />
          <Route element={<RequireOnboarded />}>
            <Route index element={<HomePage />} />
            <Route path="matches" element={<MatchesPage />} />
            <Route path="roles/:roleId" element={<RolePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/ai" element={<ConnectAI />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AssistantProvider>
    </ToastProvider>
  )
}
