import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { profileApi } from '@/api/auth'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/features/auth/session'
import { errorMessage } from '@/lib/form-errors'

// Minimal private page proving the route guard; the full profile comes in E8.
export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { session } = Route.useRouteContext()
  const logout = useLogout()
  const navigate = useNavigate()
  const profile = useQuery({
    queryKey: ['profile', session.user.id],
    queryFn: ({ signal }) => profileApi.get(signal),
  })

  return (
    <main>
      <Container className="grid justify-items-start gap-4 py-8">
        <h1 className="text-[28px] font-bold">Perfil do colecionador</h1>
        {profile.isPending && <p role="status">Carregando…</p>}
        {profile.isError && <p role="alert">{errorMessage(profile.error)}</p>}
        {profile.data && (
          <dl data-testid="profile" className="grid gap-1">
            <dt className="text-copy">Nome de exibição</dt>
            <dd>{profile.data.displayName}</dd>
            <dt className="text-copy">E-mail</dt>
            <dd>{profile.data.email}</dd>
          </dl>
        )}
        {/* On mobile there is no header: logout lives here. */}
        <Button
          variant="outline"
          className="md:hidden"
          onClick={() => {
            logout.mutate()
            void navigate({ to: '/' })
          }}
        >
          Sair
        </Button>
      </Container>
    </main>
  )
}
