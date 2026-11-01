import { useQuery } from '@tanstack/react-query'
import { useFormContext } from 'react-hook-form'
import { payeesQuery } from '../../api/queries'
import type { Account } from '../../api/types'
import { formatMoney } from '../../lib/format'
import { maskAccountNumber, toCents } from '../../lib/money'
import { NEW_RECIPIENT, TRANSFER_FEE, type TransferFormValues } from './schema'
import styles from './TransferDialog.module.css'

interface Props {
  depositAccounts: Account[]
}

export function ReviewStep({ depositAccounts }: Props) {
  const { getValues } = useFormContext<TransferFormValues>()
  const { data: payees } = useQuery(payeesQuery)
  // Values can't change on this step, so a one-off read is enough.
  const values = getValues()

  const account = depositAccounts.find((item) => item.id === values.fromAccountId)
  const payee = payees?.find((item) => item.id === values.payeeId)
  const recipient =
    values.payeeId === NEW_RECIPIENT
      ? {
          name: values.recipient.name.trim(),
          bank: values.recipient.bank,
          masked: maskAccountNumber(values.recipient.accountNumber.trim()),
        }
      : { name: payee?.name, bank: payee?.bank, masked: payee?.accountNumberMasked }

  const amountCents = toCents(values.amount.trim())
  const totalCents = amountCents + toCents(TRANSFER_FEE)

  return (
    <dl className={styles.summary}>
      <div>
        <dt>From</dt>
        <dd>
          {account?.name} · <span className="amount">{account?.maskedNumber}</span>
        </dd>
      </div>
      <div>
        <dt>To</dt>
        <dd>
          {recipient.name} · {recipient.bank} ·{' '}
          <span className="amount">{recipient.masked}</span>
        </dd>
      </div>
      <div>
        <dt>Amount</dt>
        <dd className="amount">{formatMoney(amountCents / 100)}</dd>
      </div>
      <div>
        <dt>Fee</dt>
        <dd className="amount">{formatMoney(TRANSFER_FEE)}</dd>
      </div>
      <div>
        <dt>Note</dt>
        <dd>{values.note.trim() || '—'}</dd>
      </div>
      <div className={styles.total}>
        <dt>Total</dt>
        <dd className="amount">{formatMoney(totalCents / 100)}</dd>
      </div>
    </dl>
  )
}
