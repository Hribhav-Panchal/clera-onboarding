import styles from './Spinner.module.css'

export function Spinner({ size = 16, label }: { size?: number; label?: string }) {
  return (
    <span className={styles.spinner} style={{ width: size, height: size }} role={label ? 'status' : undefined}>
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}
