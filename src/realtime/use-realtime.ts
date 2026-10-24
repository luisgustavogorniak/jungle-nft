import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { orderKeys } from '@/features/orders/queries'
import { applyOrderUpdated } from './events'
import { socket } from './socket'

/**
 * Keeps one authenticated socket per session. It connects when a user is
 * logged in and is released (listeners + connection) when the user changes.
 */
export function useRealtime(userId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    // On every (re)connection, events may have been missed: reconcile the
    // active resources with the REST API.
    const onConnect = () => void queryClient.invalidateQueries({ queryKey: orderKeys.all })
    const onOrderUpdated = (payload: unknown) => applyOrderUpdated(queryClient, payload)

    socket.on('connect', onConnect)
    socket.on('order.updated', onOrderUpdated)
    socket.connect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('order.updated', onOrderUpdated)
      socket.disconnect()
    }
  }, [userId, queryClient])
}
