import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { profileApi } from '@/api/auth'
import { errorMessage } from '@/lib/form-errors'

// Minimal private page proving the route guard; the full profile comes in E8.
export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { session } = Route.useRouteContext()
  const profile = useQuery({
    queryKey: ['profile', session.user.id],
    queryFn: ({ signal }) => profileApi.get(signal),
  })

  return (
    <main className="grid gap-2 p-8">
      <h1 className="text-xl font-bold">Perfil do colecionador</h1>
      {profile.isPending && <p>Carregando…</p>}
      {profile.isError && <p role="alert">{errorMessage(profile.error)}</p>}
      {profile.data && (
        <dl data-testid="profile">
          <dt>Nome de exibição</dt>
          <dd>{profile.data.displayName}</dd>
          <dt>E-mail</dt>
          <dd>{profile.data.email}</dd>
        </dl>
      )}
    </main>
  )
}
