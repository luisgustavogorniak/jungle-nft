import { useSyncExternalStore } from 'react'

// The applied coupon is a small client choice shared by cart and checkout. It lives in
// sessionStorage: it survives a refresh, ends with the tab, and the server still
// validates it in every quote.
const STORAGE_KEY = 'kurio.coupon'

let memory: string | null = null
const listeners = new Set<() => void>()

function read(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? memory
  } catch {
    return memory
  }
}

export function setCoupon(code: string | null) {
  memory = code
  try {
    if (code) sessionStorage.setItem(STORAGE_KEY, code)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: the in-memory value still works for this page load.
  }
  listeners.forEach((listener) => listener())
}

export function useCoupon(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
    () => null,
  )
}
