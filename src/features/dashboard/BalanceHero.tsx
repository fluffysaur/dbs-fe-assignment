import { Plus } from 'lucide-react'
import type { Ref } from 'react'
import type { Account } from '../../api/types'
import { Button } from '../../components/Button'
import { formatMoney } from '../../lib/format'
import { toCents } from '../../lib/money'
import styles from './BalanceHero.module.css'

interface Props {
  accounts: Account[]
  onNewTransfer: () => void
  buttonRef: Ref<HTMLButtonElement>
}

function depositCaption(count: number) {
  if (count === 0) return 'No deposit accounts'
  if (count === 1) return 'Across 1 deposit account'
  return `Across ${count} deposit accounts`
}

export function BalanceHero({ accounts, onNewTransfer, buttonRef }: Props) {
  // The credit card is money owed, so it isn't "available" (D3).
  const depositAccounts = accounts.filter((account) => account.type !== 'credit')
  const totalCents = depositAccounts.reduce(
    (sum, account) => sum + toCents(account.balance),
    0,
  )

  return (
    <section className={styles.hero} aria-labelledby="total-available">
      <div>
        <h2 id="total-available" className={styles.label}>
          Total available
        </h2>
        <p className={`amount ${styles.total}`}>{formatMoney(totalCents / 100)}</p>
        <p className={styles.caption}>{depositCaption(depositAccounts.length)}</p>
      </div>
      <Button
        ref={buttonRef}
        className={styles.cta}
        onClick={onNewTransfer}
        disabled={depositAccounts.length === 0}
      >
        <Plus aria-hidden size={20} />
        New transfer
      </Button>
    </section>
  )
}
