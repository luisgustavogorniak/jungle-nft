import { http, HttpResponse } from 'msw'
import { changePasswordRequestSchema, updateProfileRequestSchema } from '@/api/contracts'
import { db, hashPassword, saveDb } from '../db'
import { errorResponse, parseBody, requireUser, toPublicUser, withScenario } from '../utils'

export const profileHandlers = [
  http.get(
    '/api/profile',
    withScenario('profile', ({ request }) => HttpResponse.json(toPublicUser(requireUser(request)))),
  ),

  http.patch(
    '/api/profile',
    withScenario('profile', async ({ request }) => {
      const user = requireUser(request)
      const body = await parseBody(request, updateProfileRequestSchema)

      const others = db().users.filter((candidate) => candidate.id !== user.id)
      const fieldErrors: Record<string, string> = {}
      if (body.email && others.some((other) => other.email.toLowerCase() === body.email!.toLowerCase())) {
        fieldErrors.email = 'Este e-mail já está cadastrado'
      }
      if (body.username && others.some((other) => other.username.toLowerCase() === body.username!.toLowerCase())) {
        fieldErrors.username = 'Este nome de usuário já está em uso'
      }
      if (Object.keys(fieldErrors).length > 0) {
        return errorResponse('CONFLICT', 'Já existe uma conta com esses dados', { fieldErrors })
      }

      Object.assign(user, body)
      saveDb()
      return HttpResponse.json(toPublicUser(user))
    }),
  ),

  http.post(
    '/api/profile/password',
    withScenario('profile', async ({ request }) => {
      const user = requireUser(request)
      const body = await parseBody(request, changePasswordRequestSchema)

      if ((await hashPassword(body.currentPassword, user.salt)) !== user.passwordHash) {
        return errorResponse('VALIDATION_ERROR', 'Verifique os campos destacados', {
          fieldErrors: { currentPassword: 'A senha atual está incorreta' },
        })
      }
      if (body.newPassword === body.currentPassword) {
        return errorResponse('VALIDATION_ERROR', 'Verifique os campos destacados', {
          fieldErrors: { newPassword: 'A nova senha precisa ser diferente da atual' },
        })
      }

      user.salt = crypto.randomUUID().slice(0, 8)
      user.passwordHash = await hashPassword(body.newPassword, user.salt)
      saveDb()
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
