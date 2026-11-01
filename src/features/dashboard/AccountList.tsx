import type { Account } from '../../api/types'
import { EmptyState } from '../../components/EmptyState'
import { formatMoney } from '../../lib/format'
import styles from './AccountList.module.css'
import dashboard from './Dashboard.module.css'

interface Props {
  accounts: Account[]
}

export function AccountList({ accounts }: Props) {
  return (
    <section aria-labelledby="accounts-title">
      <h2 id="accounts-title" className={dashboard.sectionTitle}>
        Accounts
      </h2>
      {accounts.length === 0 ? (
        <div className={dashboard.section}>
          <EmptyState message="No accounts to show." />
        </div>
      ) : (
        <ul className={styles.list}>
          {accounts.map((account) => (
            <li key={account.id} className={`${dashboard.section} ${styles.card}`}>
              <p className={styles.name}>{account.name}</p>
              <p className={`amount ${styles.number}`}>{account.maskedNumber}</p>
              <p className={`amount ${styles.balance}`}>
                {formatMoney(account.balance)}
              </p>
              {account.type === 'credit' && (
                <p className={styles.due}>Amount due</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
