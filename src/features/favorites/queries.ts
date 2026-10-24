import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { favoritesApi } from '@/api/commerce'
import type { Favorites } from '@/api/contracts'
import { useSession } from '@/features/auth/session'
import { errorMessage } from '@/lib/form-errors'

export const favoriteKeys = {
  all: ['favorites'] as const,
}

export const favoritesQueryOptions = queryOptions({
  queryKey: favoriteKeys.all,
  queryFn: ({ signal }) => favoritesApi.list(signal),
})

/** Favorites belong to the user: visitors have none and the request is not even made. */
export function useFavorites() {
  const { isAuthenticated } = useSession()
  return useQuery({ ...favoritesQueryOptions, enabled: isAuthenticated })
}

export function useIsFavorite(nftId: string): boolean {
  const { data } = useFavorites()
  return data?.nftIds.includes(nftId) ?? false
}

const MUTATION_KEY = ['favorites', 'toggle'] as const

/**
 * Optimistic toggle: the heart changes at once, the previous list is restored if
 * the API fails, and the server list is re-read at the end.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean }) =>
      favorite ? favoritesApi.add(nftId) : favoritesApi.remove(nftId),
    onMutate: async ({ nftId, favorite }) => {
      // A refetch in flight would overwrite the optimistic value when it lands.
      await queryClient.cancelQueries({ queryKey: favoriteKeys.all })
      const previous = queryClient.getQueryData<Favorites>(favoriteKeys.all)
      queryClient.setQueryData<Favorites>(favoriteKeys.all, (current) => {
        const ids = (current?.nftIds ?? []).filter((id) => id !== nftId)
        return { nftIds: favorite ? [...ids, nftId] : ids }
      })
      return { previous }
    },
    onError: (error, { favorite }, context) => {
      // Restores only this change; a newer click is reconciled by the final refetch.
      if (context?.previous) queryClient.setQueryData(favoriteKeys.all, context.previous)
      toast.error(`${favorite ? 'Não foi possível favoritar' : 'Não foi possível remover dos favoritos'}. ${errorMessage(error)}`)
    },
    onSettled: () => {
      // With several toggles in flight, only the last one re-reads the list.
      if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) === 1) {
        void queryClient.invalidateQueries({ queryKey: favoriteKeys.all })
      }
    },
  })
}
