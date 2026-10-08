import { FileText } from 'lucide-react'
import { useRef } from 'react'
import { useAssistantContext } from '../assistant/context'
import { askAssistant } from '../assistant/ask'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { bytes, dayLabel } from '../lib/format'
import { useReveal } from '../lib/useReveal'
import { useAppState } from '../state/store'
import styles from './SimplePage.module.css'

/** Documents — not in the Figma flow; a minimal home for the resume. */
export function DocumentsPage() {
  const { profile } = useAppState()
  const page = useRef<HTMLDivElement>(null)
  useReveal(page)
  useAssistantContext('documents', 'I can tailor your CV for a specific role, or tighten it overall.', [
    'Improve my CV for Colare',
    'What is weak in my resume?',
  ])
  const r = profile.resume

  return (
    <div ref={page} className={styles.page}>
      <header className={styles.header} data-reveal>
        <h1 className={styles.h1}>Documents</h1>
        <p className={styles.sub}>What companies receive when you send an introduction.</p>
      </header>
      <Card padding="md" data-reveal>
        {r ? (
          <div className={styles.row}>
            <span className={styles.fileIcon} aria-hidden>
              <FileText size={18} />
            </span>
            <div className={styles.rowText}>
              <p className={styles.title}>{r.fileName}</p>
              <p className={styles.meta}>
                Resume · {bytes(r.size)} · added {dayLabel(r.uploadedAt)}
              </p>
            </div>
            <Button variant="secondary" onClick={() => askAssistant('Improve my CV for Colare')}>
              Improve with Clera
            </Button>
          </div>
        ) : (
          <div className={styles.row}>
            <div className={styles.rowText}>
              <p className={styles.title}>No resume yet</p>
              <p className={styles.meta}>You set up your profile without one. Companies will see your profile details instead.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
