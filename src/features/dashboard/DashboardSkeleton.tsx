import { Skeleton } from '../../components/Skeleton'
import accountStyles from './AccountList.module.css'
import heroStyles from './BalanceHero.module.css'
import dashboard from './Dashboard.module.css'
import txnStyles from './TransactionList.module.css'

/**
 * Same layout and sizes as the loaded dashboard (it reuses the real CSS
 * classes), so nothing jumps when the data arrives (D1).
 */
export function DashboardSkeleton() {
  return (
    <div className={dashboard.layout} aria-busy="true">
      <p role="status" className="sr-only">
        Loading your dashboard…
      </p>
      <div className={dashboard.main}>
        <div className={heroStyles.hero}>
          <div>
            <Skeleton width={120} height="1rem" />
            <Skeleton width={240} height="2.5rem" className={heroStyles.total} />
            <Skeleton width={160} height="1rem" />
          </div>
        </div>

        <div>
          <Skeleton width={90} height="1rem" className={dashboard.sectionTitle} />
          <div className={accountStyles.list}>
            {[1, 2, 3].map((key) => (
              <div key={key} className={`${dashboard.section} ${accountStyles.card}`}>
                <Skeleton width="60%" height="1.25rem" />
                <Skeleton width="40%" height="1rem" />
              </div>
            ))}
          </div>
        </div>

        <div className={dashboard.section}>
          <Skeleton width={180} height="1rem" />
          <div className={txnStyles.results} />
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className={txnStyles.row}>
              <div className={txnStyles.details}>
                <Skeleton width={160} height="1rem" />
                <Skeleton width={100} height="0.875rem" />
              </div>
              <Skeleton width={80} height="1rem" />
            </div>
          ))}
        </div>
      </div>
      <div className={dashboard.section}>
        <Skeleton width={100} height="1rem" className={dashboard.sectionTitle} />
        <Skeleton width={160} height="1.75rem" />
        <Skeleton height={8} round />
      </div>
    </div>
  )
}
