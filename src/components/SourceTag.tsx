import { FileText, MessageCircle, PenLine } from 'lucide-react'
import type { DetailSource } from '../data/types'
import { dayLabel } from '../lib/format'
import styles from './SourceTag.module.css'

const COPY: Record<DetailSource, { label: string; Icon: typeof FileText }> = {
  resume: { label: 'From your resume', Icon: FileText },
  chat: { label: 'From your chats', Icon: MessageCircle },
  you: { label: 'Added by you', Icon: PenLine },
}

/** Says where a piece of profile information came from. */
export function SourceTag({ source, at, compact = false }: { source: DetailSource; at?: string; compact?: boolean }) {
  const { label, Icon } = COPY[source]
  return (
    <span className={`${styles.tag} ${styles[source]}`} title={at ? `${label} · ${dayLabel(at)}` : label}>
      <Icon size={12} strokeWidth={2} aria-hidden />
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </span>
  )
}

export function sourceLabel(source: DetailSource) {
  return COPY[source].label
}
