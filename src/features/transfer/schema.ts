import { z } from 'zod'
import type { Account } from '../../api/types'
import { formatMoney } from '../../lib/format'
import { AMOUNT_RE, toCents } from '../../lib/money'

/** Value of the "Send to someone new" radio in the payee list. */
export const NEW_RECIPIENT = 'new'
export const NOTE_MAX_LENGTH = 50
export const TRANSFER_FEE = 0
export const BANKS = [
  'DBS',
  'POSB',
  'OCBC',
  'UOB',
  'Maybank',
  'Standard Chartered',
  'HSBC',
  'Citibank',
  'CIMB',
  'Bank of China',
]

const NUMBER_RE = /^\d+(\.\d+)?$/
const ACCOUNT_NUMBER_RE = /^\d{8}$/

interface SchemaContext {
  /** Accounts the user can send from (deposit accounts). */
  accounts: Account[]
  remainingLimit: number
}

/**
 * Every transfer validation rule lives here, once (brief §3.3). The form
 * uses it for inline errors (on blur) and for Continue / Confirm.
 *
 * It's built from live data so the balance and daily-limit rules use the
 * real numbers. Field names match the API's, so server field errors map
 * straight onto the form. Messages follow the API's wording.
 */
export function makeTransferSchema({ accounts, remainingLimit }: SchemaContext) {
  return z
    .object({
      /** A saved payee's id, or NEW_RECIPIENT. */
      payeeId: z.string(),
      recipient: z.object({
        name: z.string(),
        accountNumber: z.string(),
        bank: z.string(),
      }),
      fromAccountId: z.string().min(1, 'Choose an account to transfer from.'),
      amount: z
        .string()
        .trim()
        .min(1, 'Enter an amount.')
        .regex(NUMBER_RE, 'Enter a valid amount, like 120 or 120.50.')
        .refine(
          (value) => !NUMBER_RE.test(value) || AMOUNT_RE.test(value),
          'Use at most 2 decimal places.',
        )
        .refine(
          (value) => !AMOUNT_RE.test(value) || toCents(value) >= 100,
          'Enter an amount of at least SGD 1.00.',
        ),
      note: z
        .string()
        .max(NOTE_MAX_LENGTH, 'Keep the note to 50 characters or fewer.'),
    })
    // Rules that depend on more than one field. Zod 4 still runs these when
    // another field has failed (our fields are always strings), so e.g. a
    // recipient error shows even while the amount is still empty.
    .superRefine((values, ctx) => {
      if (values.payeeId === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['payeeId'],
          message: 'Choose who to send to.',
        })
      }

      if (values.payeeId === NEW_RECIPIENT) {
        const name = values.recipient.name.trim()
        if (name.length < 2 || name.length > 50) {
          ctx.addIssue({
            code: 'custom',
            path: ['recipient', 'name'],
            message: 'Enter a recipient name (2–50 characters).',
          })
        }
        if (!ACCOUNT_NUMBER_RE.test(values.recipient.accountNumber.trim())) {
          ctx.addIssue({
            code: 'custom',
            path: ['recipient', 'accountNumber'],
            message: 'Enter a valid 8-digit account number.',
          })
        }
        if (!values.recipient.bank) {
          ctx.addIssue({
            code: 'custom',
            path: ['recipient', 'bank'],
            message: 'Choose a bank.',
          })
        }
      }

      // Same order as the server: balance first, then the daily limit.
      const account = accounts.find((item) => item.id === values.fromAccountId)
      if (account && AMOUNT_RE.test(values.amount)) {
        const cents = toCents(values.amount)
        if (cents > toCents(account.balance)) {
          ctx.addIssue({
            code: 'custom',
            path: ['amount'],
            message: `Amount can't be more than your available balance (${formatMoney(account.balance)}).`,
          })
        } else if (cents > toCents(remainingLimit)) {
          ctx.addIssue({
            code: 'custom',
            path: ['amount'],
            message: `This transfer exceeds your remaining daily limit (${formatMoney(remainingLimit)}).`,
          })
        }
      }
    })
}

export type TransferFormValues = z.input<ReturnType<typeof makeTransferSchema>>
