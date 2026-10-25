import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { RegisterForm } from '@/features/auth/auth-forms'
import { authSearchSchema } from '@/features/auth/auth-search'
import { safeRedirect, sessionQueryOptions } from '@/features/auth/session'

export const Route = createFileRoute('/register')({
  validateSearch: authSearchSchema,
  beforeLoad: async ({ context, search }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (session) throw redirect({ to: safeRedirect(search.redirect) })
  },
  component: RegisterPage,
})

function RegisterPage() {
  const search = Route.useSearch()
  const router = useRouter()

  return (
    <main className="mx-auto grid max-w-sm gap-4 p-8">
      <p className="text-center text-[32px] font-bold tracking-[0.1em] md:hidden">KURIO</p>
      <h1 className="text-xl font-bold">Criar perfil de colecionador</h1>
      <p className="hidden text-sm text-copy md:block">Crie seu perfil de colecionador e conecte uma carteira quando quiser.</p>
      <RegisterForm onSuccess={() => router.history.push(safeRedirect(search.redirect))} />
      <p className="text-sm">
        Já tem uma conta?{' '}
        <Link to="/login" search={{ redirect: search.redirect }} className="underline">
          Entre
        </Link>
      </p>
    </main>
  )
}
