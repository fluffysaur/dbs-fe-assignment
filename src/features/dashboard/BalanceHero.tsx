import { Plus } from 'lucide-react'
import type { Ref } from 'react'
import type { Account } from '../../api/types'
import { Button } from '../../components/Button'
import { formatMoney } from '../../lib/format'
import { depositAccounts, totalAvailable } from '../../lib/money'
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
    const depositCount = depositAccounts(accounts).length

    return (
        <section className={styles.hero} aria-labelledby="total-available">
            <div>
                <h2 id="total-available" className={styles.label}>
                    Total available
                </h2>
                <p className={`amount ${styles.total}`}>
                    {formatMoney(totalAvailable(accounts))}
                </p>
                <p className={styles.caption}>{depositCaption(depositCount)}</p>
            </div>
            <Button
                ref={buttonRef}
                className={styles.cta}
                onClick={onNewTransfer}
                disabled={depositCount === 0}
            >
                <Plus aria-hidden size={20} />
                New transfer
            </Button>
        </section>
    )
}
