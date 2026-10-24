import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/api/http'

const genericMessages: Partial<Record<string, string>> = {
  NETWORK_ERROR: 'Sem conexão. Verifique sua internet e tente novamente.',
  TIMEOUT: 'O servidor demorou para responder. Tente novamente.',
  INTERNAL_ERROR: 'Algo deu errado do nosso lado. Tente novamente.',
  SERVICE_UNAVAILABLE: 'Serviço temporariamente indisponível. Tente novamente.',
}

export function errorMessage(error: unknown): string {
  if (!isApiError(error)) return 'Algo deu errado. Tente novamente.'
  return genericMessages[error.code] ?? error.message
}

/**
 * Maps API field errors onto the form fields. Errors for unknown fields, and
 * errors without field details, go to `root.server`.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: ReadonlyArray<Path<T>>,
) {
  const fieldErrors = isApiError(error) ? error.fieldErrors : {}
  let mapped = false
  for (const [field, message] of Object.entries(fieldErrors)) {
    if ((fields as ReadonlyArray<string>).includes(field)) {
      setError(field as Path<T>, { type: 'server', message }, { shouldFocus: !mapped })
      mapped = true
    }
  }
  if (!mapped) setError('root.server' as Path<T>, { type: 'server', message: errorMessage(error) })
}
