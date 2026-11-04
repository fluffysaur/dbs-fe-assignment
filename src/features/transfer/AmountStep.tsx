import { useFormContext, useWatch } from 'react-hook-form'
import type { Account } from '../../api/types'
import { Field } from '../../components/Field'
import { formatMoney } from '../../lib/format'
import { NOTE_MAX_LENGTH, type TransferFormValues } from './schema'
import shared from './TransferDialog.module.css'
import styles from './AmountStep.module.css'

const QUICK_AMOUNTS = [50, 100, 250, 500]

interface Props {
    depositAccounts: Account[]
    remainingLimit: number
}

export function AmountStep({ depositAccounts, remainingLimit }: Props) {
    const {
        register,
        control,
        setValue,
        trigger,
        getFieldState,
        formState: { errors },
    } = useFormContext<TransferFormValues>()
    const fromAccountId = useWatch({ control, name: 'fromAccountId' })
    const note = useWatch({ control, name: 'note' })
    const fromAccount = depositAccounts.find((account) => account.id === fromAccountId)

    const amountError = errors.amount?.message
    const noteError = errors.note?.message

    return (
        <div className={shared.fields}>
            <Field
                id="fromAccountId"
                label="From account"
                error={errors.fromAccountId?.message}
                describedBy="from-hint"
                footer={
                    <p id="from-hint" className={shared.hint}>
                        Deposit accounts only
                    </p>
                }
            >
                {(controlProps) => (
                    <select
                        {...controlProps}
                        {...register('fromAccountId', {
                            // The balance rule depends on the account, so re-check the amount.
                            onChange: () => {
                                if (getFieldState('amount').isTouched)
                                    void trigger('amount')
                            },
                        })}
                    >
                        {depositAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                                {account.name} · {account.maskedNumber}
                            </option>
                        ))}
                    </select>
                )}
            </Field>

            <Field
                id="amount"
                label="Amount"
                error={amountError}
                describedBy="amount-help"
                footer={
                    <>
                        <div
                            className={styles.chips}
                            role="group"
                            aria-label="Quick amounts"
                        >
                            {QUICK_AMOUNTS.map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={styles.chip}
                                    onClick={() =>
                                        setValue('amount', String(value), {
                                            shouldValidate: true,
                                            shouldDirty: true,
                                            shouldTouch: true,
                                        })
                                    }
                                >
                                    {value}
                                </button>
                            ))}
                        </div>
                        <dl
                            id="amount-help"
                            className={`${shared.detailRows} ${styles.limits}`}
                        >
                            <div>
                                <dt>Available</dt>
                                <dd className="amount">
                                    {fromAccount ? formatMoney(fromAccount.balance) : '—'}
                                </dd>
                            </div>
                            <div>
                                <dt>Remaining daily limit</dt>
                                <dd className="amount">{formatMoney(remainingLimit)}</dd>
                            </div>
                        </dl>
                    </>
                }
            >
                {(controlProps) => (
                    <div className={styles.amountInput}>
                        <span aria-hidden>SGD</span>
                        <input
                            {...controlProps}
                            className={`amount ${controlProps.className}`}
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="0.00"
                            {...register('amount')}
                        />
                    </div>
                )}
            </Field>

            <Field
                id="note"
                label="Note (optional)"
                error={noteError}
                describedBy="note-count"
                aside={
                    <span
                        id="note-count"
                        className={`amount ${shared.hint}`}
                        data-over={note.length > NOTE_MAX_LENGTH || undefined}
                    >
                        {note.length}/{NOTE_MAX_LENGTH}
                    </span>
                }
            >
                {(controlProps) => (
                    <input {...controlProps} autoComplete="off" {...register('note')} />
                )}
            </Field>
        </div>
    )
}
