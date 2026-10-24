import {
  sessionSchema,
  userSchema,
  type LoginRequest,
  type RegisterRequest,
  type Session,
  type User,
} from './contracts'
import { http } from './http'

export const authApi = {
  async login(body: LoginRequest): Promise<Session> {
    const { data } = await http.post('/auth/login', body)
    return sessionSchema.parse(data)
  },

  async register(body: RegisterRequest): Promise<Session> {
    const { data } = await http.post('/auth/register', body)
    return sessionSchema.parse(data)
  },

  async session(): Promise<Session> {
    const { data } = await http.get('/auth/session')
    return sessionSchema.parse(data)
  },

  /** Takes the token explicitly: the local session is already gone when this runs. */
  async logout(token: string | null): Promise<void> {
    await http.post('/auth/logout', null, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
}

export const profileApi = {
  async get(signal?: AbortSignal): Promise<User> {
    const { data } = await http.get('/profile', { signal })
    return userSchema.parse(data)
  },
}
