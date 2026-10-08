/** Lets any button hand a question to the "Ask Clera" panel. */
export const ASK_EVENT = 'clera:ask'

export function askAssistant(text: string) {
  window.dispatchEvent(new CustomEvent<string>(ASK_EVENT, { detail: text }))
}
