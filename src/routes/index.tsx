import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { http } from '@/api/http'
import { socket } from '@/realtime/socket'

export const Route = createFileRoute('/')({
  component: HomePage,
})

// Temporary bootstrap page: proves MSW (REST + Socket.IO) works end to end.
// Replaced by the catalog in E3.
function HomePage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => (await http.get<{ status: string }>('/health')).data,
  })
  const [realtimeMessage, setRealtimeMessage] = useState<string | null>(null)

  useEffect(() => {
    const onReady = (payload: { message: string }) => setRealtimeMessage(payload.message)
    socket.on('system.ready', onReady)
    socket.connect()
    return () => {
      socket.off('system.ready', onReady)
      socket.disconnect()
    }
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Jungle NFT</h1>
      <p data-testid="api-status">API: {health.data?.status ?? 'loading'}</p>
      <p data-testid="realtime-status">Realtime: {realtimeMessage ?? 'connecting'}</p>
    </main>
  )
}
