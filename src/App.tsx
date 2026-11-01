import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './api/client'
import type { Health } from './api/types'
import { Header } from './components/Header'
import { usePreferences } from './features/theme/usePreferences'

export default function App() {
  const preferences = usePreferences()
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<Health>('/api/health'),
    retry: false,
  })

  return (
    <>
      <Header preferences={preferences} />
      <main>
        <p role="status">
          Mock API: {health.isPending ? 'checking…' : health.isError ? 'not connected' : 'connected'}
        </p>
      </main>
    </>
  )
}
