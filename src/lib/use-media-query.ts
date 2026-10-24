import { useSyncExternalStore } from 'react'

/** Subscribes to a CSS media query. Used when two layouts must not coexist in the DOM (duplicate ids, headings). */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', notify)
      return () => list.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Tailwind `md` breakpoint: where the desktop layout starts. */
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)')
