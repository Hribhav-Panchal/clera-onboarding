import { useState } from 'react'
import { errorMessage, saveEssentials } from '../../api/client'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ChoiceGroup } from '../../components/ChoiceGroup'
import { TextField } from '../../components/Field'
import { useToast } from '../../components/Toast'
import type { Essentials, VisaNeed, WorkStyle } from '../../data/types'
import { LIMITS, parsePay, validateEssentials, type EssentialsErrors } from '../../lib/validation'
import { useAppState, useDispatch } from '../../state/store'
import styles from '../SimplePage.module.css'
import p from './profile.module.css'

const WORK_STYLES: { value: WorkStyle; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]
const VISA: { value: VisaNeed; label: string }[] = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
  { value: 'unsure', label: 'Not sure' },
]

/** Matching preferences — the A2 fields, editable after onboarding. */
export function PreferencesCard() {
  const { profile } = useAppState()
  const dispatch = useDispatch()
  const toast = useToast()
  const [form, setForm] = useState<Essentials>(profile.essentials)
  const [payText, setPayText] = useState(form.minBasePay ? form.minBasePay.toLocaleString('en-US') : '')
  const [errors, setErrors] = useState<EssentialsErrors>({})
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(form) !== JSON.stringify(profile.essentials)
  const set = (patch: Partial<Essentials>) => {
    setForm((f) => ({ ...f, ...patch }))
    setErrors((prev) => {
      const all = validateEssentials({ ...form, ...patch })
      const out: EssentialsErrors = {}
      for (const k of Object.keys(prev) as (keyof Essentials)[]) if (all[k]) out[k] = all[k]
      return out
    })
  }

  const save = async () => {
    const all = validateEssentials(form)
    setErrors(all)
    if (Object.keys(all).length) return
    setSaving(true)
    try {
      const clean = { ...form, targetRole: form.targetRole.trim(), location: form.location.trim() }
      const { savedAt } = await saveEssentials(clean)
      dispatch({ type: 'essentials/changed', patch: clean })
      dispatch({ type: 'essentials/saved', at: savedAt })
      toast({ message: 'Preferences saved. New matches will use them.', tone: 'success' })
    } catch (err) {
      toast({ message: errorMessage(err), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={p.section} aria-labelledby="prefs-title" data-reveal>
      <div className={p.sectionHead}>
        <h2 id="prefs-title" className={p.h2}>
          Matching preferences
        </h2>
        <span className={p.meta}>Used for new matches only</span>
      </div>
      <Card padding="lg" className={styles.form}>
        <TextField
          label="Target role"
          value={form.targetRole}
          maxLength={LIMITS.role}
          onChange={(e) => set({ targetRole: e.target.value })}
          error={errors.targetRole}
        />
        <TextField
          label="Preferred location"
          value={form.location}
          maxLength={LIMITS.location}
          onChange={(e) => set({ location: e.target.value })}
          error={errors.location}
        />
        <TextField
          label="Minimum base pay · optional"
          value={payText}
          inputMode="decimal"
          placeholder="Add an amount"
          prefix={payText ? '$' : undefined}
          onChange={(e) => {
            setPayText(e.target.value)
            set({ minBasePay: parsePay(e.target.value) })
          }}
          error={errors.minBasePay}
          hint={errors.minBasePay ? undefined : 'Leave this open if you are flexible.'}
        />
        <ChoiceGroup
          multiple
          label="Work styles"
          options={WORK_STYLES}
          value={form.workStyles}
          onChange={(v) => set({ workStyles: v })}
          error={errors.workStyles}
        />
        <ChoiceGroup
          label="Visa sponsorship for a US role"
          options={VISA}
          value={form.visa ? [form.visa] : []}
          onChange={([v]) => set({ visa: v })}
          error={errors.visa}
        />
        <div className={styles.actions}>
          <Button
            variant="ghost"
            disabled={!dirty || saving}
            onClick={() => {
              setForm(profile.essentials)
              setPayText(profile.essentials.minBasePay ? profile.essentials.minBasePay.toLocaleString('en-US') : '')
              setErrors({})
            }}
          >
            Discard changes
          </Button>
          <Button onClick={() => void save()} disabled={!dirty} loading={saving} loadingLabel="Saving">
            Save preferences
          </Button>
        </div>
      </Card>
    </section>
  )
}
