import { useFormContext, useWatch } from 'react-hook-form'
import type { Account } from '../../api/types'
import { Field, fieldProps, inputClassName } from '../../components/Field'
import { formatMoney } from '../../lib/format'
import { NOTE_MAX_LENGTH, type TransferFormValues } from './schema'
import styles from './TransferDialog.module.css'

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
  const account = depositAccounts.find((item) => item.id === fromAccountId)

  const amountError = errors.amount?.message
  const noteError = errors.note?.message

  return (
    <div className={styles.fields}>
      <Field
        id="fromAccountId"
        label="From account"
        error={errors.fromAccountId?.message}
        footer={
          <p id="from-hint" className={styles.hint}>
            Deposit accounts only
          </p>
        }
      >
        <select
          className={inputClassName}
          {...fieldProps('fromAccountId', errors.fromAccountId?.message, 'from-hint')}
          {...register('fromAccountId', {
            // The balance rule depends on the account, so re-check the amount.
            onChange: () => {
              if (getFieldState('amount').isTouched) void trigger('amount')
            },
          })}
        >
          {depositAccounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.maskedNumber}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id="amount"
        label="Amount"
        error={amountError}
        footer={
          <>
            <div className={styles.chips} role="group" aria-label="Quick amounts">
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
            <dl id="amount-help" className={styles.limits}>
              <div>
                <dt>Available</dt>
                <dd className="amount">
                  {account ? formatMoney(account.balance) : '—'}
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
        <div className={styles.amountInput}>
          <span aria-hidden>SGD</span>
          <input
            className={`amount ${inputClassName}`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            {...fieldProps('amount', amountError, 'amount-help')}
            {...register('amount')}
          />
        </div>
      </Field>

      <Field
        id="note"
        label="Note (optional)"
        error={noteError}
        aside={
          <span
            id="note-count"
            className={`amount ${styles.hint}`}
            data-over={note.length > NOTE_MAX_LENGTH || undefined}
          >
            {note.length}/{NOTE_MAX_LENGTH}
          </span>
        }
      >
        <input
          className={inputClassName}
          autoComplete="off"
          {...fieldProps('note', noteError, 'note-count')}
          {...register('note')}
        />
      </Field>
    </div>
  )
}
