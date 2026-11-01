import { usePrefetchQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { payeesQuery } from '../../api/queries'
import type { Account, Customer, Transaction } from '../../api/types'
import { TransferDialog } from '../transfer/TransferDialog'
import { AccountList } from './AccountList'
import { BalanceHero } from './BalanceHero'
import { DailyLimitCard } from './DailyLimitCard'
import { TransactionList } from './TransactionList'
import styles from './Dashboard.module.css'

interface Props {
  customer: Customer
  accounts: Account[]
  transactions: Transaction[]
}

export function DashboardContent({ customer, accounts, transactions }: Props) {
  // Load payees in the background so the transfer dialog opens ready.
  usePrefetchQuery(payeesQuery)

  const [isTransferOpen, setTransferOpen] = useState(false)
  const newTransferButton = useRef<HTMLButtonElement>(null)

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        <BalanceHero
          accounts={accounts}
          onNewTransfer={() => setTransferOpen(true)}
          buttonRef={newTransferButton}
        />
        <AccountList accounts={accounts} />
        <TransactionList transactions={transactions} />
      </div>
      <aside aria-label="Daily limit">
        <DailyLimitCard customer={customer} />
      </aside>
      {isTransferOpen && (
        <TransferDialog
          accounts={accounts}
          customer={customer}
          onClose={() => {
            setTransferOpen(false)
            // Focus goes back to the button that opened the dialog (T1).
            newTransferButton.current?.focus()
          }}
        />
      )}
    </div>
  )
}
