// Client-side identity sent with every request: the session token (when logged in)
// and a guest id that owns the visitor cart until it is merged on login.
const TOKEN_KEY = 'kurio.token'
const GUEST_KEY = 'kurio.guest-id'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage unavailable (private mode): the session lives only in memory.
  }
}

let memoryToken: string | null = read(TOKEN_KEY)

export function getToken(): string | null {
  return memoryToken
}

export function setToken(token: string | null) {
  memoryToken = token
  write(TOKEN_KEY, token)
}

export function getGuestId(): string {
  let id = read(GUEST_KEY)
  if (!id) {
    id = crypto.randomUUID()
    write(GUEST_KEY, id)
  }
  return id
}
