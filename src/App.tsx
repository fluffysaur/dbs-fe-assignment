import { Header } from './components/Header'
import { Dashboard } from './features/dashboard/Dashboard'
import { usePreferences } from './features/theme/usePreferences'

export default function App() {
  const preferences = usePreferences()

  return (
    <>
      <Header preferences={preferences} />
      <main>
        <Dashboard preferences={preferences} />
      </main>
    </>
  )
}
