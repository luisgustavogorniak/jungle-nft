import { createFileRoute } from '@tanstack/react-router'
import { AccountLayout } from '@/features/profile/account-layout'

// Layout of "Dados do perfil" (index) and "Carteiras" (wallets).
export const Route = createFileRoute('/_authenticated/profile')({
  component: AccountLayout,
})
