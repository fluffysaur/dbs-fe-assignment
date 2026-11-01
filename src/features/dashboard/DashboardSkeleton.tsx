import { Skeleton } from '../../components/Skeleton'
import accountStyles from './AccountList.module.css'
import heroStyles from './BalanceHero.module.css'
import limitStyles from './DailyLimitCard.module.css'
import dashboard from './Dashboard.module.css'
import txnStyles from './TransactionList.module.css'

/**
 * Same layout and sizes as the loaded dashboard (it reuses the real CSS
 * classes), so nothing jumps when the data arrives (D1).
 */
// Placeholder heights match each text style's line height (font size × 1.5).
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
          <Skeleton width={90} height={21} className={dashboard.sectionTitle} />
          <div className={accountStyles.list}>
            {[1, 2, 3].map((key) => (
              <div key={key} className={`${dashboard.section} ${accountStyles.card}`}>
                {/* Wrapped so they stack in the card's two-column phone grid. */}
                <div className={accountStyles.skeletonLines}>
                  <Skeleton width="60%" height={27} />
                  <Skeleton width="40%" height={21} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={dashboard.section}>
          <div className={txnStyles.header}>
            <Skeleton width={180} height={21} />
            <Skeleton width={320} height={44} round className={txnStyles.search} />
          </div>
          <div className={txnStyles.results} />
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className={txnStyles.row}>
              <div className={txnStyles.details}>
                <Skeleton width={160} height={24} />
                <Skeleton width={100} height={21} />
              </div>
              <Skeleton width={80} height="1rem" />
            </div>
          ))}
        </div>
      </div>
      <div className={dashboard.section}>
        <Skeleton width={100} height={21} className={dashboard.sectionTitle} />
        <Skeleton width={160} height={33} />
        <Skeleton width={120} height={24} />
        <div className={limitStyles.track} />
        <Skeleton width="80%" height={21} />
      </div>
    </div>
  )
}
