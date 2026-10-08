import type { AIProvider } from '../data/types'
import styles from './AIMark.module.css'

/** Simplified monochrome marks for the assistants Clera connects to. */
export function AIGlyph({ provider, size = 18 }: { provider: AIProvider; size?: number }) {
  switch (provider) {
    case 'claude':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <g stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * Math.PI) / 6
              const r1 = 2.2
              const r2 = i % 2 ? 9.4 : 10.6
              return (
                <line
                  key={i}
                  x1={12 + r1 * Math.cos(a)}
                  y1={12 + r1 * Math.sin(a)}
                  x2={12 + r2 * Math.cos(a)}
                  y2={12 + r2 * Math.sin(a)}
                />
              )
            })}
          </g>
        </svg>
      )
    case 'gemini':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M12 2c.6 5.2 4.8 9.4 10 10-5.2.6-9.4 4.8-10 10-.6-5.2-4.8-9.4-10-10 5.2-.6 9.4-4.8 10-10Z"
          />
        </svg>
      )
    case 'grok':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
            d="M3.5 3h5.2l11.8 18h-5.2L3.5 3Z"
          />
          <path stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M20 3l-6.9 7.9M10.6 13.6 4 21" />
        </svg>
      )
    case 'chatgpt':
    default:
      return (
        <span className={styles.text} style={{ fontSize: Math.round(size * 0.78) }} aria-hidden>
          GPT
        </span>
      )
  }
}

export function AIMark({ provider, size = 'md' }: { provider: AIProvider; size?: 'sm' | 'md' | 'lg' }) {
  const glyph = size === 'sm' ? 15 : size === 'md' ? 20 : 22
  return (
    <span className={`${styles.mark} ${styles[size]}`}>
      <AIGlyph provider={provider} size={glyph} />
    </span>
  )
}
