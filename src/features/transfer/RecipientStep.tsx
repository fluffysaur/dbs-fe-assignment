import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { payeesQuery } from '../../api/queries'
import { Button } from '../../components/Button'
import { Field, fieldProps, inputClassName } from '../../components/Field'
import { InlineError } from '../../components/InlineError'
import { Skeleton } from '../../components/Skeleton'
import { BANKS, NEW_RECIPIENT, type TransferFormValues } from './schema'
import styles from './TransferDialog.module.css'

export function RecipientStep() {
  const {
    register,
    control,
    getValues,
    resetField,
    formState: { errors },
  } = useFormContext<TransferFormValues>()
  const payeeId = useWatch({ control, name: 'payeeId' })
  const payees = useQuery(payeesQuery)
  const [search, setSearch] = useState('')

  // No saved payees: preselect "Send to someone new" (as the default, so the
  // form doesn't count as changed).
  useEffect(() => {
    if (payees.data?.length === 0 && getValues('payeeId') === '') {
      resetField('payeeId', { defaultValue: NEW_RECIPIENT })
    }
  }, [payees.data, getValues, resetField])

  const query = search.trim().toLowerCase()
  const visiblePayees = (payees.data ?? []).filter(
    (payee) =>
      payee.name.toLowerCase().includes(query) ||
      payee.bank.toLowerCase().includes(query),
  )

  const recipientErrors = errors.recipient
  const payeeError = errors.payeeId?.message

  return (
    <>
      {payees.data && payees.data.length > 0 && (
        <div>
          <label htmlFor="payee-search" className="sr-only">
            Search payees
          </label>
          <input
            id="payee-search"
            type="search"
            className={inputClassName}
            placeholder="Search payees"
            autoComplete="off"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      )}

      <fieldset
        className={styles.payees}
        aria-describedby={payeeError ? 'payeeId-error' : undefined}
      >
        <legend className="sr-only">Recipient</legend>

        {payees.isPending &&
          [1, 2, 3, 4].map((key) => (
            <div key={key} className={styles.payee} aria-hidden>
              <Skeleton width={40} height={40} round />
              <Skeleton width="50%" height="1rem" />
            </div>
          ))}

        {payees.isError && (
          <div className={styles.notice}>
            <p>We couldn&apos;t load your saved payees.</p>
            <Button variant="ghost" onClick={() => void payees.refetch()}>
              Retry
            </Button>
          </div>
        )}

        {payees.data?.length === 0 && (
          <p className={styles.notice}>No saved payees yet.</p>
        )}

        {query && payees.data && payees.data.length > 0 && visiblePayees.length === 0 && (
          <p className={styles.notice}>No payees match your search.</p>
        )}

        {visiblePayees.map((payee) => (
          <label key={payee.id} className={styles.payee}>
            <input type="radio" value={payee.id} {...register('payeeId')} />
            <span className={styles.initials} aria-hidden>
              {payee.initials}
            </span>
            <span className={styles.payeeText}>
              <span className={styles.payeeName}>{payee.name}</span>
              <span className={`amount ${styles.payeeMeta}`}>
                {payee.bank} · {payee.accountNumberMasked}
              </span>
            </span>
          </label>
        ))}

        <label className={styles.payee}>
          <input type="radio" value={NEW_RECIPIENT} {...register('payeeId')} />
          <span className={styles.initials} aria-hidden>
            <Plus size={18} />
          </span>
          <span className={styles.payeeName}>Send to someone new</span>
        </label>
      </fieldset>
      <InlineError id="payeeId-error" message={payeeError} />

      {payeeId === NEW_RECIPIENT && (
        <div className={styles.fields}>
          <Field
            id="recipient-name"
            label="Recipient name"
            error={recipientErrors?.name?.message}
          >
            <input
              className={inputClassName}
              autoComplete="off"
              {...fieldProps('recipient-name', recipientErrors?.name?.message)}
              {...register('recipient.name')}
            />
          </Field>
          <Field
            id="recipient-account"
            label="Account number (8 digits)"
            error={recipientErrors?.accountNumber?.message}
          >
            <input
              className={`amount ${inputClassName}`}
              inputMode="numeric"
              autoComplete="off"
              {...fieldProps(
                'recipient-account',
                recipientErrors?.accountNumber?.message,
              )}
              {...register('recipient.accountNumber')}
            />
          </Field>
          <Field
            id="recipient-bank"
            label="Bank"
            error={recipientErrors?.bank?.message}
          >
            <select
              className={inputClassName}
              {...fieldProps('recipient-bank', recipientErrors?.bank?.message)}
              {...register('recipient.bank')}
            >
              <option value="">Choose a bank</option>
              {BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </>
  )
}
