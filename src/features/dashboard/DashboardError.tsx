import { Button } from '../../components/Button'
import dashboard from './Dashboard.module.css'
import styles from './DashboardError.module.css'

interface Props {
  onRetry: () => void
  isRetrying: boolean
}

export function DashboardError({ onRetry, isRetrying }: Props) {
  return (
    <div className={`${dashboard.section} ${styles.error}`}>
      <p role="alert" className={styles.message}>
        We couldn&apos;t load your dashboard.
      </p>
      <Button onClick={onRetry} disabled={isRetrying} aria-busy={isRetrying}>
        Retry
      </Button>
    </div>
  )
}
