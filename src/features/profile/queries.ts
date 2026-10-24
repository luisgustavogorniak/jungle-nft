import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '@/api/auth'
import { walletsApi } from '@/api/commerce'
import type { Session, WalletInput, WalletSlot } from '@/api/contracts'
import { sessionQueryKey } from '@/features/auth/session'

export function useProfile(userId: string) {
  return useQuery({ queryKey: ['profile', userId], queryFn: ({ signal }) => profileApi.get(signal) })
}

/** The header and the tab bar read the name from the session, so it is updated too. */
export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: profileApi.update,
    onSuccess: (user) => {
      queryClient.setQueryData(['profile', userId], user)
      queryClient.setQueryData<Session | null>(sessionQueryKey, (session) => session && { ...session, user })
    },
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: profileApi.changePassword })
}

// Same key as the checkout, so it shows the saved wallets right away.
export function useWallets(userId: string) {
  return useQuery({ queryKey: ['wallets', userId], queryFn: ({ signal }) => walletsApi.list(signal) })
}

export function useSaveWallet(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slot, input }: { slot: WalletSlot; input: WalletInput }) => walletsApi.save(slot, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallets', userId] }),
  })
}
