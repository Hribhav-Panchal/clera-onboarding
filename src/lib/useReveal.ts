import type { RefObject } from 'react'
import { gsap, prefersReducedMotion, SplitText, useGSAP } from './motion'

/**
 * Page-entry choreography. Elements marked `data-reveal` rise in, in DOM
 * order; headings marked `data-split` reveal word-by-word. Re-runs when
 * `key` changes (e.g. when a role page moves to its next state).
 */
export function useReveal(scope: RefObject<HTMLElement | null>, key: unknown = null) {
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const items = gsap.utils.toArray<HTMLElement>('[data-reveal]', scope.current)
      if (items.length) {
        gsap.fromTo(
          items,
          { y: 14, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.055, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
        )
      }
      const headings = gsap.utils.toArray<HTMLElement>('[data-split]', scope.current)
      headings.forEach((h) => {
        const split = SplitText.create(h, { type: 'words', mask: 'words', wordsClass: 'split-word' })
        gsap.from(split.words, {
          yPercent: 110,
          duration: 0.7,
          stagger: 0.045,
          ease: 'power4.out',
          onComplete: () => split.revert(),
        })
      })
    },
    { scope, dependencies: [key], revertOnUpdate: true },
  )
}
