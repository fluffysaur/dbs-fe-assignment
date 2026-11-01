import { Search } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Transaction } from '../../api/types'
import { Button } from '../../components/Button'
import { EmptyState } from '../../components/EmptyState'
import { formatMoney, formatShortDate } from '../../lib/format'
import dashboard from './Dashboard.module.css'
import styles from './TransactionList.module.css'

interface Props {
  transactions: Transaction[]
}

/**
 * The 8 most recent transactions. Search filters these rows in the browser
 * (D6): instant, no extra requests. Older transactions aren't searched.
 */
export function TransactionList({ transactions }: Props) {
  const [search, setSearch] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)

  const query = search.trim().toLowerCase()
  const visible = query
    ? transactions.filter(
        (txn) =>
          txn.description.toLowerCase().includes(query) ||
          txn.category.toLowerCase().includes(query),
      )
    : transactions

  function clearSearch() {
    setSearch('')
    searchInput.current?.focus()
  }

  return (
    <section className={dashboard.section} aria-labelledby="transactions-title">
      <div className={styles.header}>
        <h2 id="transactions-title" className={styles.title}>
          Recent transactions
        </h2>
        {transactions.length > 0 && (
          <div className={styles.search}>
            <label htmlFor="transaction-search" className="sr-only">
              Search transactions
            </label>
            <Search aria-hidden size={18} className={styles.searchIcon} />
            <input
              ref={searchInput}
              id="transaction-search"
              type="search"
              placeholder="Search transactions"
              autoComplete="off"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        )}
      </div>

      {/* Always rendered so screen readers hear the count change. */}
      <div aria-live="polite" className={styles.results}>
        {query && visible.length > 0 && (
          <>
            <span>
              {visible.length} {visible.length === 1 ? 'result' : 'results'}
            </span>
            <Button variant="ghost" onClick={clearSearch}>
              Clear search
            </Button>
          </>
        )}
      </div>

      {transactions.length === 0 ? (
        <EmptyState message="No transactions yet." />
      ) : visible.length === 0 ? (
        <EmptyState
          message="No transactions match your search."
          action={
            <Button variant="secondary" onClick={clearSearch}>
              Clear search
            </Button>
          }
        />
      ) : (
        <ul className={styles.list}>
          {visible.map((txn) => (
            <li key={txn.id} className={styles.row}>
              <div className={styles.details}>
                <p className={styles.description}>{txn.description}</p>
                <p className={styles.meta}>
                  <span className={styles.category}>{txn.category}</span>
                  {' · '}
                  {formatShortDate(txn.date)}
                </p>
              </div>
              <div className={styles.side}>
                <p
                  className={`amount ${styles.value} ${
                    txn.direction === 'in' ? styles.in : ''
                  }`}
                >
                  {txn.direction === 'in'
                    ? `+${formatMoney(txn.amount)}`
                    : formatMoney(-txn.amount)}
                </p>
                {txn.status === 'pending' && (
                  <span className={styles.pending}>Pending</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
