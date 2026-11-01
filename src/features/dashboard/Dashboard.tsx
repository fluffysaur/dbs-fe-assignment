import { Skeleton } from '../../components/Skeleton'
import { SegmentSwitch } from '../theme/SegmentSwitch'
import type { Preferences } from '../theme/usePreferences'
import { DashboardContent } from './DashboardContent'
import { DashboardError } from './DashboardError'
import { DashboardSkeleton } from './DashboardSkeleton'
import { useDashboardData } from './useDashboardData'
import styles from './Dashboard.module.css'

interface Props {
  preferences: Preferences
}

export function Dashboard({ preferences }: Props) {
  const dashboard = useDashboardData()

  return (
    <div className={styles.page}>
      <div className={styles.greeting}>
        {dashboard.status === 'success' ? (
          <h1>Good evening, {dashboard.customer.firstName}</h1>
        ) : dashboard.status === 'pending' ? (
          <Skeleton width={240} height="2rem" />
        ) : (
          <h1>Good evening</h1>
        )}
        {/* Phones only; the header has its own switch from 640px. */}
        <div className={styles.mobileSegment}>
          <SegmentSwitch
            segment={preferences.segment}
            onChange={preferences.changeSegment}
          />
        </div>
      </div>

      {dashboard.status === 'pending' && <DashboardSkeleton />}
      {dashboard.status === 'error' && (
        <DashboardError onRetry={dashboard.retry} isRetrying={dashboard.isRetrying} />
      )}
      {dashboard.status === 'success' && (
        <DashboardContent
          customer={dashboard.customer}
          accounts={dashboard.accounts}
          transactions={dashboard.transactions}
        />
      )}
    </div>
  )
}
