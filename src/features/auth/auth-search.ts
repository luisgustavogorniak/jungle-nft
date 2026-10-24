import { z } from 'zod'

/** Search params of /login and /register: where to go back after authenticating. */
export const authSearchSchema = z.object({
  redirect: z.string().optional(),
  reason: z.enum(['expired']).optional(),
})
