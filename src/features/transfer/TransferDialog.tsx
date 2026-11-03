import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, LoaderCircle, X } from 'lucide-react'
import { type SubmitEvent, useEffect, useRef, useState } from 'react'
import { type FieldPath, FormProvider, useForm } from 'react-hook-form'
import { ApiError } from '../../api/client'
import { isBalanceChangedError, useCreateTransfer } from '../../api/transfers'
import type { Account, Customer } from '../../api/types'
import { Button } from '../../components/Button'
import { formatMoney } from '../../lib/format'
import { depositAccounts, remainingLimit } from '../../lib/money'
import { AmountStep } from './AmountStep'
import { DiscardPanel } from './DiscardPanel'
import { RecipientStep } from './RecipientStep'
import { ReviewStep } from './ReviewStep'
import { makeTransferSchema, type TransferFormValues } from './schema'
import { type Step, Stepper } from './Stepper'
import { SuccessPanel } from './SuccessPanel'
import { toTransferRequest } from './toTransferRequest'
import styles from './TransferDialog.module.css'
import { useFreshBalances } from './useFreshBalances'

const STEP_TITLES: Record<Step, string> = {
    recipient: 'Who are you sending to?',
    amount: 'How much?',
    review: 'Check the details',
}

// Fields checked when pressing Continue on each step.
const STEP_FIELDS: Record<'recipient' | 'amount', FieldPath<TransferFormValues>[]> = {
    recipient: ['payeeId', 'recipient.name', 'recipient.accountNumber', 'recipient.bank'],
    amount: ['fromAccountId', 'amount', 'note'],
}

const FORM_FIELDS: string[] = [...STEP_FIELDS.recipient, ...STEP_FIELDS.amount]
const isFormField = (key: string): key is FieldPath<TransferFormValues> =>
    FORM_FIELDS.includes(key)

const SEND_ERROR = "Something went wrong. Your money hasn't left your account. Try again."

/** API validation errors carry a useful message; anything else gets the brief's copy. */
function sendErrorMessage(error: Error) {
    if (error instanceof ApiError && error.status < 500 && error.fields) {
        return [error.message, ...Object.values(error.fields)].join(' ')
    }
    return SEND_ERROR
}

interface Props {
    accounts: Account[]
    customer: Customer
    onClose: () => void
}

export function TransferDialog({ accounts, customer, onClose }: Props) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const headingRef = useRef<HTMLHeadingElement>(null)
    const [step, setStep] = useState<Step>('recipient')
    const [confirmingDiscard, setConfirmingDiscard] = useState(false)
    const transferMutation = useCreateTransfer()
    const [balancesChangedAt, setBalancesChangedAt] = useState<number | null>(null)
    const balances = useFreshBalances(balancesChangedAt)
    const waitingForBalances = step === 'amount' && balances.state !== 'ready'

    const deposits = depositAccounts(accounts)
    const limit = remainingLimit(customer)

    const form = useForm<TransferFormValues>({
        resolver: zodResolver(
            makeTransferSchema({ accounts: deposits, remainingLimit: limit }),
        ),
        // Check a field when the user leaves it, then again as they fix it.
        mode: 'onTouched',
        defaultValues: {
            payeeId: '',
            recipient: { name: '', accountNumber: '', bank: '' },
            fromAccountId: deposits[0]?.id ?? '',
            amount: '',
            note: '',
        },
    })
    const { isDirty } = form.formState
    const isSending = transferMutation.isPending
    // Set once the API confirms the transfer: the dialog then shows success.
    const transfer = transferMutation.data?.transfer

    // Open as a modal: the browser traps focus and handles Esc. No close() in
    // a cleanup: StrictMode would run it and close the dialog straight away.
    useEffect(() => {
        const dialog = dialogRef.current
        if (dialog && !dialog.open) dialog.showModal()
    }, [])

    // Move focus to the step's (or success) heading so screen readers announce it.
    useEffect(() => {
        if (!confirmingDiscard) headingRef.current?.focus()
    }, [step, transfer, confirmingDiscard])

    /** ✕, Cancel and Esc all come here. The native `close` event calls onClose. */
    function requestClose() {
        if (isSending) return
        if (transfer || !isDirty) {
            dialogRef.current?.close()
        } else {
            setConfirmingDiscard(true)
        }
    }

    async function goNext(current: 'recipient' | 'amount') {
        if (current === 'amount' && waitingForBalances) return
        const valid = await form.trigger(STEP_FIELDS[current], { shouldFocus: true })
        if (!valid) return
        setStep(current === 'recipient' ? 'amount' : 'review')
    }

    function goBack() {
        transferMutation.reset()
        setStep(step === 'review' ? 'amount' : 'recipient')
    }

    /** Back to a blank step 1, as if the dialog had just opened. */
    function startAnotherTransfer() {
        transferMutation.reset()
        form.reset()
        setStep('recipient')
    }

    function send(values: TransferFormValues) {
        transferMutation.mutate(toTransferRequest(values), {
            onSuccess: () => setBalancesChangedAt(Date.now()),
            onError: (error) => {
                if (isBalanceChangedError(error)) setBalancesChangedAt(Date.now())
                // Put server field errors under their fields (seen after Back).
                if (error instanceof ApiError && error.fields) {
                    for (const [key, message] of Object.entries(error.fields)) {
                        if (isFormField(key))
                            form.setError(key, { type: 'server', message })
                    }
                }
            },
        })
    }

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (step === 'review') {
            // Final check with the same schema before sending.
            void form.handleSubmit(send)()
        } else {
            void goNext(step)
        }
    }

    return (
        <dialog
            ref={dialogRef}
            className={styles.dialog}
            aria-labelledby="transfer-title"
            onCancel={(event) => {
                event.preventDefault()
                requestClose()
            }}
            onClose={onClose}
        >
            <div className={styles.header}>
                <h2 id="transfer-title" className={styles.title}>
                    New transfer
                </h2>
                <button
                    type="button"
                    className={styles.close}
                    aria-label="Close"
                    onClick={requestClose}
                    disabled={isSending}
                >
                    <X aria-hidden size={20} />
                </button>
            </div>

            {/* Announces the result; kept in the DOM so the change is heard. */}
            <p className="sr-only" aria-live="polite">
                {transfer
                    ? `Transfer sent. ${formatMoney(transfer.amount)} to ${transfer.recipient.name}.`
                    : ''}
            </p>

            {confirmingDiscard ? (
                <DiscardPanel
                    onKeepEditing={() => setConfirmingDiscard(false)}
                    onDiscard={() => dialogRef.current?.close()}
                />
            ) : transfer ? (
                <SuccessPanel
                    transfer={transfer}
                    headingRef={headingRef}
                    onDone={() => dialogRef.current?.close()}
                    onAnother={startAnotherTransfer}
                />
            ) : (
                <FormProvider {...form}>
                    <form className={styles.form} noValidate onSubmit={handleSubmit}>
                        {/* Keyed by step so each step plays the entry animation. */}
                        <div key={step} className={styles.body}>
                            <Stepper current={step} />
                            <h3
                                ref={headingRef}
                                tabIndex={-1}
                                className={styles.stepTitle}
                            >
                                {STEP_TITLES[step]}
                            </h3>

                            {step === 'recipient' && <RecipientStep />}
                            {step === 'amount' && (
                                <AmountStep
                                    depositAccounts={deposits}
                                    remainingLimit={limit}
                                    balances={balances.state}
                                    onRetryBalances={balances.retry}
                                />
                            )}
                            {step === 'review' && (
                                <ReviewStep depositAccounts={deposits} />
                            )}

                            {step === 'review' && transferMutation.isError && (
                                <p role="alert" className={styles.alert}>
                                    {sendErrorMessage(transferMutation.error)}
                                </p>
                            )}
                        </div>

                        <div className={styles.footer}>
                            {step === 'recipient' ? (
                                <Button variant="secondary" onClick={requestClose}>
                                    Cancel
                                </Button>
                            ) : (
                                <Button
                                    variant="secondary"
                                    onClick={goBack}
                                    disabled={isSending}
                                >
                                    <ArrowLeft aria-hidden size={18} />
                                    Back
                                </Button>
                            )}
                            <Button
                                type="submit"
                                disabled={isSending || waitingForBalances}
                            >
                                {step !== 'review' ? (
                                    'Continue'
                                ) : isSending ? (
                                    <>
                                        <LoaderCircle
                                            aria-hidden
                                            size={18}
                                            className={styles.spinner}
                                        />
                                        Sending…
                                    </>
                                ) : (
                                    'Confirm transfer'
                                )}
                            </Button>
                        </div>
                    </form>
                </FormProvider>
            )}
        </dialog>
    )
}
