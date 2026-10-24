import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { LoginForm } from '@/features/auth/auth-forms'
import { authSearchSchema } from '@/features/auth/auth-search'
import { safeRedirect, sessionQueryOptions } from '@/features/auth/session'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (session) throw redirect({ to: safeRedirect(search.redirect) })
  },
  component: LoginPage,
})

function LoginPage() {
  const search = Route.useSearch()
  const router = useRouter()

  return (
    <main className="mx-auto grid max-w-sm gap-4 p-8">
      <h1 className="text-xl font-bold">Entrar</h1>
      {search.reason === 'expired' && (
        <p role="status" className="text-sm">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}
      <LoginForm onSuccess={() => router.history.push(safeRedirect(search.redirect))} />
      <p className="text-sm">
        Novo na Kurio?{' '}
        <Link to="/register" search={{ redirect: search.redirect }} className="underline">
          Crie uma conta
        </Link>
      </p>
    </main>
  )
}
