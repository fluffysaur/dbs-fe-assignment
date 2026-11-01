import { CloudOff } from 'lucide-react'
import { Button } from '../../components/Button'
import { SpotIcon } from '../../components/SpotIcon'
import dashboard from './Dashboard.module.css'
import styles from './DashboardError.module.css'

interface Props {
  onRetry: () => void
  isRetrying: boolean
}

export function DashboardError({ onRetry, isRetrying }: Props) {
  return (
    <div className={`${dashboard.section} ${styles.error}`}>
      <SpotIcon icon={CloudOff} tone="negative" size={56} />
      <p role="alert" className={styles.message}>
        We couldn&apos;t load your dashboard.
      </p>
      <Button onClick={onRetry} disabled={isRetrying} aria-busy={isRetrying}>
        Retry
      </Button>
    </div>
  )
}
