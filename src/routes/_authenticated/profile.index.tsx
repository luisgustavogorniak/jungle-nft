import { createFileRoute } from '@tanstack/react-router'
import { PasswordForm } from '@/features/profile/password-form'
import { ProfileForm } from '@/features/profile/profile-form'
import { useProfile } from '@/features/profile/queries'
import { errorMessage } from '@/lib/form-errors'

export const Route = createFileRoute('/_authenticated/profile/')({
  component: ProfilePage,
})

function ProfilePage() {
  const { session } = Route.useRouteContext()
  const profile = useProfile(session.user.id)

  return (
    <>
      {profile.isPending && <p role="status">Carregando…</p>}
      {profile.isError && <p role="alert">{errorMessage(profile.error)}</p>}
      {profile.data && (
        <>
          <ProfileForm user={profile.data} />
          <PasswordForm />
        </>
      )}
    </>
  )
}
