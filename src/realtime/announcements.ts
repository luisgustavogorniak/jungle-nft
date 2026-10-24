import { useSyncExternalStore } from 'react'

// Last realtime change worth telling the user about. The live region that
// reads it is always mounted, so screen readers announce every new message.
let current: { id: number; message: string } | null = null
const listeners = new Set<() => void>()

export function announce(message: string) {
  current = { id: (current?.id ?? 0) + 1, message }
  listeners.forEach((listener) => listener())
}

export function useAnnouncement() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
    () => null,
  )
}
