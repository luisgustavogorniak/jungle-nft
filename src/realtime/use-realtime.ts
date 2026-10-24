import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cartKeys } from '@/features/cart/queries'
import { catalogKeys } from '@/features/catalog/queries'
import { orderKeys } from '@/features/orders/queries'
import { applyNftUpdated, applyOrderUpdated } from './events'
import { socket } from './socket'

/**
 * Keeps one socket per session: visitors receive public catalog events, a
 * logged-in user also receives their own orders. When the user changes, the
 * listeners and the connection are released and a new one is opened with the
 * new token, so events of a previous session never reach the next one.
 */
export function useRealtime(userId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    let connectedBefore = false

    // Events sent while disconnected are lost: on every reconnection the
    // active resources are reconciled with the REST API. On the first
    // connection the pages just fetched their data, so only orders are
    // re-read (a payment may settle between the fetch and the connection).
    const onConnect = () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all })
      if (connectedBefore) {
        void queryClient.invalidateQueries({ queryKey: catalogKeys.all })
        void queryClient.invalidateQueries({ queryKey: cartKeys.cart })
        void queryClient.invalidateQueries({ queryKey: cartKeys.quotes })
      }
      connectedBefore = true
    }
    const onNftUpdated = (payload: unknown) => applyNftUpdated(queryClient, payload)
    const onOrderUpdated = (payload: unknown) => applyOrderUpdated(queryClient, payload)

    socket.on('connect', onConnect)
    socket.on('nft.updated', onNftUpdated)
    socket.on('order.updated', onOrderUpdated)
    socket.connect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('nft.updated', onNftUpdated)
      socket.off('order.updated', onOrderUpdated)
      socket.disconnect()
    }
  }, [userId, queryClient])
}
