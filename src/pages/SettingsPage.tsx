import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNetworkMode, setNetworkMode, type NetworkMode } from '../api/client'
import { useAssistantContext } from '../assistant/context'
import { AIMark } from '../components/AIMark'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ChoiceGroup } from '../components/ChoiceGroup'
import { useToast } from '../components/Toast'
import { offeredSlots } from '../data/seed'
import { useReveal } from '../lib/useReveal'
import { useAppState, useDispatch } from '../state/store'
import { PROVIDERS } from './connect/ConnectAI'
import styles from './SimplePage.module.css'

export function SettingsPage() {
  const state = useAppState()
  const page = useRef<HTMLDivElement>(null)
  useReveal(page)
  useAssistantContext('settings', 'Change where updates go, or connect an AI assistant.', [
    'Change where updates are sent',
    'Connect Claude or ChatGPT',
  ])
  const p = state.ai ? PROVIDERS.find((x) => x.id === state.ai!.provider) : null

  return (
    <div ref={page} className={styles.page}>
      <header className={styles.header} data-reveal>
        <h1 className={styles.h1}>Settings</h1>
      </header>

      <Card padding="md" data-reveal>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <p className={styles.title}>Email updates</p>
            <p className={styles.meta}>Match and interview news goes to {state.profile.email}.</p>
          </div>
        </div>
      </Card>

      <Card padding="md" data-reveal>
        <div className={styles.row}>
          {p ? <AIMark provider={p.id} size="sm" /> : null}
          <div className={styles.rowText}>
            <p className={styles.title}>AI assistants</p>
            <p className={styles.meta}>{p ? `${p.name} is connected.` : 'Talk through your search in Claude, ChatGPT, Gemini or Grok.'}</p>
          </div>
          <Button variant="secondary" to="/settings/ai">
            {p ? 'Manage' : 'Connect'}
          </Button>
        </div>
      </Card>

      <PrototypeControls />
    </div>
  )
}

/** Drive the flow through states that normally depend on companies replying. */
function PrototypeControls() {
  const state = useAppState()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const [mode, setMode] = useState<NetworkMode>(getNetworkMode())
  const open = state.applications.filter((a) => a.stage !== 'closed' && !a.withdrawn)

  return (
    <section className={styles.section} aria-labelledby="proto" data-reveal>
      <div className={styles.divider} />
      <h2 id="proto" className={styles.h2}>
        Prototype controls
      </h2>
      <p className={styles.meta}>
        Simulate what companies and the network do. Your progress is stored in this browser (<span className={styles.code}>localStorage</span>).
      </p>
      <Card padding="md" className={styles.form}>
        <div className={styles.buttons}>
          <Button
            variant="secondary"
            onClick={() => {
              dispatch({ type: 'state/reset' })
              navigate('/onboarding/resume')
            }}
          >
            Start as a new candidate
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              dispatch({ type: 'state/loadSample' })
              navigate('/')
              toast({ message: 'Sample account loaded.' })
            }}
          >
            Load sample account
          </Button>
          {state.profile.onboarded && state.matches.length === 0 ? (
            <Button
              variant="secondary"
              onClick={() => {
                dispatch({
                  type: 'matches/delivered',
                  matches: ['colare-founding-product-designer', 'tavus-senior-product-designer', 'catalyst-founding-designer'].map(
                    (roleId) => ({ roleId, status: 'new', receivedAt: new Date().toISOString(), unseen: true }),
                  ),
                })
                toast({ message: 'Matches delivered.' })
              }}
            >
              Deliver first matches now
            </Button>
          ) : null}
        </div>

        {open.length ? (
          <div className={styles.section}>
            {open.map((a) => {
              const role = state.roles[a.roleId]
              return (
                <div key={a.roleId} className={styles.row}>
                  <div className={styles.rowText}>
                    <p className={styles.title}>{role.company}</p>
                    <p className={styles.meta}>Stage: {a.stage}</p>
                  </div>
                  {a.stage === 'waiting' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        dispatch({ type: 'application/replied', roleId: a.roleId, slots: offeredSlots(), at: new Date().toISOString() })
                        toast({
                          message: `${role.company} replied with three times.`,
                          action: { label: 'Open', onClick: () => navigate(`/roles/${a.roleId}`) },
                        })
                      }}
                    >
                      Company replies
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      dispatch({ type: 'application/closed', roleId: a.roleId, at: new Date().toISOString(), reason: 'The role was filled' })
                      toast({
                        message: `${role.company} closed the role.`,
                        action: { label: 'Open', onClick: () => navigate(`/roles/${a.roleId}`) },
                      })
                    }}
                  >
                    Company closes role
                  </Button>
                </div>
              )
            })}
          </div>
        ) : null}

        <ChoiceGroup
          label="Network"
          hint="Slow adds latency; flaky fails half of all requests so you can see error states."
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'slow', label: 'Slow' },
            { value: 'flaky', label: 'Flaky' },
          ]}
          value={[mode]}
          showCheck={false}
          onChange={([v]) => {
            setNetworkMode(v)
            setMode(v)
          }}
        />
      </Card>
    </section>
  )
}
