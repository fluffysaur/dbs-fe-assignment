import type { Customer } from '../../api/types'
import { formatMoney } from '../../lib/format'
import { toCents } from '../../lib/money'
import styles from './DailyLimitCard.module.css'
import dashboard from './Dashboard.module.css'

interface Props {
  customer: Customer
}

export function DailyLimitCard({ customer }: Props) {
  const limit = customer.dailyTransferLimit
  const used = customer.transferredToday
  const remaining = (toCents(limit) - toCents(used)) / 100
  const usedPercent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0

  return (
    <section className={dashboard.section} aria-labelledby="daily-limit-title">
      <h2 id="daily-limit-title" className={dashboard.sectionTitle}>
        Daily limit
      </h2>
      <p>
        <span className={`amount ${styles.remaining}`}>
          {formatMoney(remaining)}
        </span>{' '}
        remaining today
      </p>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Daily limit used"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-valuetext={`${formatMoney(used)} of ${formatMoney(limit)} used`}
      >
        <div className={styles.fill} style={{ width: `${usedPercent}%` }} />
      </div>
      <p className={styles.note}>Resets daily. Applies to all transfers.</p>
    </section>
  )
}
