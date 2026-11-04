import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import { payeesQuery } from '../../api/queries'
import type { Account } from '../../api/types'
import { formatMoney, maskAccountNumber } from '../../lib/format'
import { toCents } from '../../lib/money'
import { NEW_RECIPIENT, TRANSFER_FEE, type TransferFormValues } from './schema'
import shared from './TransferDialog.module.css'
import styles from './ReviewStep.module.css'

interface Props {
    depositAccounts: Account[]
}

export function ReviewStep({ depositAccounts }: Props) {
    const { getValues } = useFormContext<TransferFormValues>()
    const { data: payees } = useQuery(payeesQuery)
    // Values can't change on this step, so a one-off read is enough.
    const values = getValues()

    const fromAccount = depositAccounts.find(
        (account) => account.id === values.fromAccountId,
    )
    const savedPayee = payees?.find((payee) => payee.id === values.payeeId)
    const recipient =
        values.payeeId === NEW_RECIPIENT
            ? {
                  name: values.recipient.name.trim(),
                  bank: values.recipient.bank,
                  masked: maskAccountNumber(values.recipient.accountNumber.trim()),
              }
            : {
                  name: savedPayee?.name,
                  bank: savedPayee?.bank,
                  masked: savedPayee?.accountNumberMasked,
              }

    const amountCents = toCents(values.amount.trim())
    const totalCents = amountCents + toCents(TRANSFER_FEE)

    return (
        <>
            <dl className={`${shared.detailRows} ${styles.summary}`}>
                <div>
                    <dt>From</dt>
                    <dd>
                        {fromAccount?.name} ·{' '}
                        <span className="amount">{fromAccount?.maskedNumber}</span>
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
            <p className={`${shared.hint} ${styles.arrival}`}>
                <Info aria-hidden size={16} />
                Usually arrives in minutes.
            </p>
        </>
    )
}
