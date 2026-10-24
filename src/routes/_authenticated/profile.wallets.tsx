import { createFileRoute } from '@tanstack/react-router'
import { WalletsPage } from '@/features/profile/wallets-page'

export const Route = createFileRoute('/_authenticated/profile/wallets')({
  component: WalletsRoute,
})

function WalletsRoute() {
  const { session } = Route.useRouteContext()
  return <WalletsPage userId={session.user.id} />
}
