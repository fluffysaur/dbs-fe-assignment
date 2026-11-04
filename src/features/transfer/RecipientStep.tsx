import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { payeesQuery } from '../../api/queries'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { errorId, Field } from '../../components/Field'
import { InlineError } from '../../components/InlineError'
import { SearchInput } from '../../components/SearchInput'
import { Skeleton } from '../../components/Skeleton'
import { SpotIcon } from '../../components/SpotIcon'
import { BANKS, NEW_RECIPIENT, type TransferFormValues } from './schema'
import shared from './TransferDialog.module.css'
import styles from './RecipientStep.module.css'

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
    const payeeField = register('payeeId')

    // When the user picks "Send to someone new", scroll its fields into view:
    // with several payees they open below the fold. Only on the user's own
    // pick, not the automatic preselect or coming back to this step.
    const fieldsRef = useRef<HTMLDivElement>(null)
    const revealFields = useRef(false)
    useEffect(() => {
        if (payeeId !== NEW_RECIPIENT || !revealFields.current) return
        revealFields.current = false
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        fieldsRef.current?.scrollIntoView({
            block: 'nearest',
            behavior: reduceMotion ? 'auto' : 'smooth',
        })
    }, [payeeId])

    // No saved payees: preselect "Send to someone new" (as the default, so the
    // form doesn't count as changed).
    useEffect(() => {
        if (payees.data?.length === 0 && !getValues('payeeId')) {
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
                <SearchInput
                    id="payee-search"
                    label="Search payees"
                    value={search}
                    onChange={setSearch}
                />
            )}

            <InlineError id={errorId('payeeId')} message={payeeError} />

            <fieldset
                className={styles.payees}
                aria-describedby={payeeError ? errorId('payeeId') : undefined}
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

                {query &&
                    payees.data &&
                    payees.data.length > 0 &&
                    visiblePayees.length === 0 && (
                        <p className={styles.notice}>No payees match your search.</p>
                    )}

                {visiblePayees.map((payee) => (
                    <label key={payee.id} className={styles.payee}>
                        <input type="radio" value={payee.id} {...payeeField} />
                        <Avatar initials={payee.initials} />
                        <span className={styles.payeeText}>
                            <span className={styles.payeeName}>{payee.name}</span>
                            <span className={`amount ${styles.payeeMeta}`}>
                                {payee.bank} · {payee.accountNumberMasked}
                            </span>
                        </span>
                    </label>
                ))}

                <label className={styles.payee}>
                    <input
                        type="radio"
                        value={NEW_RECIPIENT}
                        {...payeeField}
                        onChange={(event) => {
                            revealFields.current = true
                            return payeeField.onChange(event)
                        }}
                    />
                    <SpotIcon icon={Plus} size={40} />
                    <span className={styles.payeeName}>Send to someone new</span>
                </label>
            </fieldset>

            {payeeId === NEW_RECIPIENT && (
                <div ref={fieldsRef} className={shared.fields}>
                    <Field
                        id="recipient-name"
                        label="Recipient name"
                        error={recipientErrors?.name?.message}
                    >
                        {(control) => (
                            <input
                                {...control}
                                autoComplete="off"
                                {...register('recipient.name')}
                            />
                        )}
                    </Field>
                    <Field
                        id="recipient-account"
                        label="Account number (8 digits)"
                        error={recipientErrors?.accountNumber?.message}
                    >
                        {(control) => (
                            <input
                                {...control}
                                className={`amount ${control.className}`}
                                inputMode="numeric"
                                autoComplete="off"
                                {...register('recipient.accountNumber')}
                            />
                        )}
                    </Field>
                    <Field
                        id="recipient-bank"
                        label="Bank"
                        error={recipientErrors?.bank?.message}
                    >
                        {(control) => (
                            <select {...control} {...register('recipient.bank')}>
                                <option value="">Choose a bank</option>
                                {BANKS.map((bank) => (
                                    <option key={bank} value={bank}>
                                        {bank}
                                    </option>
                                ))}
                            </select>
                        )}
                    </Field>
                </div>
            )}
        </>
    )
}
