import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface AssistantContextValue {
  /** Stable id for this conversation context (usually route + state). */
  key: string
  intro: string
  suggestions: string[]
}

const DEFAULT: AssistantContextValue = {
  key: 'default',
  intro: 'Ask me about your matches, your profile or your CV.',
  suggestions: ['What can you help with?', 'Show my matches', 'Update my preferences'],
}

const Ctx = createContext<{
  value: AssistantContextValue
  set: (v: AssistantContextValue) => void
} | null>(null)

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<AssistantContextValue>(DEFAULT)
  return <Ctx.Provider value={{ value, set }}>{children}</Ctx.Provider>
}

export function useAssistantValue(): AssistantContextValue {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAssistantValue must be used inside <AssistantProvider>')
  return c.value
}

/** Pages call this to give the assistant its opening line and suggestions. */
export function useAssistantContext(key: string, intro: string, suggestions: string[]) {
  const c = useContext(Ctx)
  const set = c?.set
  const joined = suggestions.join('\u0000')
  useEffect(() => {
    set?.({ key, intro, suggestions: joined.split('\u0000').filter(Boolean) })
  }, [set, key, intro, joined])
}
