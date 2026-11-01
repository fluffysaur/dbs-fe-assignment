import { describe, expect, it } from 'vitest'
import type { Account } from '../../api/types'
import { formatMoney } from '../../lib/format'
import { makeTransferSchema, NEW_RECIPIENT, type TransferFormValues } from './schema'

const accounts: Account[] = [
  {
    id: 'acc_checking',
    name: 'Everyday Checking',
    type: 'checking',
    maskedNumber: '•••• 4821',
    balance: 4280.55,
    currency: 'SGD',
  },
  {
    id: 'acc_savings',
    name: 'Savings Plus',
    type: 'savings',
    maskedNumber: '•••• 9930',
    balance: 12840,
    currency: 'SGD',
  },
]
const schema = makeTransferSchema({ accounts, remainingLimit: 5000 })

const valid: TransferFormValues = {
  payeeId: 'pay_001',
  recipient: { name: '', accountNumber: '', bank: '' },
  fromAccountId: 'acc_checking',
  amount: '120',
  note: '',
}

/** The first error message for a field, or undefined if it's valid. */
function errorFor(values: Partial<TransferFormValues>, field: string) {
  const result = schema.safeParse({ ...valid, ...values })
  return result.error?.issues.find((issue) => issue.path.join('.') === field)?.message
}

describe('transfer schema', () => {
  it('accepts a valid transfer', () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ['', 'Enter an amount.'],
    ['abc', 'Enter a valid amount, like 120 or 120.50.'],
    ['0.99', 'Enter an amount of at least SGD 1.00.'],
    ['10.005', 'Use at most 2 decimal places.'],
  ])('rejects amount %j', (amount, message) => {
    expect(errorFor({ amount }, 'amount')).toBe(message)
  })

  it('allows exactly the balance, compared in cents', () => {
    expect(errorFor({ amount: '4280.55' }, 'amount')).toBeUndefined()
    expect(errorFor({ amount: '4280.56' }, 'amount')).toBe(
      `Amount can't be more than your available balance (${formatMoney(4280.55)}).`,
    )
  })

  it('checks the remaining daily limit', () => {
    expect(errorFor({ fromAccountId: 'acc_savings', amount: '5000.01' }, 'amount')).toBe(
      `This transfer exceeds your remaining daily limit (${formatMoney(5000)}).`,
    )
  })

  it('limits the note to 50 characters', () => {
    expect(errorFor({ note: 'a'.repeat(50) }, 'note')).toBeUndefined()
    expect(errorFor({ note: 'a'.repeat(51) }, 'note')).toBe(
      'Keep the note to 50 characters or fewer.',
    )
  })

  it('requires a payee or a valid new recipient', () => {
    expect(errorFor({ payeeId: '' }, 'payeeId')).toBe('Choose who to send to.')
    // What React Hook Form reads from a radio group with nothing checked.
    expect(errorFor({ payeeId: null }, 'payeeId')).toBe('Choose who to send to.')

    const recipient = { name: 'Alex Lim', accountNumber: '1234567', bank: '' }
    expect(
      errorFor({ payeeId: NEW_RECIPIENT, recipient }, 'recipient.accountNumber'),
    ).toBe('Enter a valid 8-digit account number.')
    expect(errorFor({ payeeId: NEW_RECIPIENT, recipient }, 'recipient.bank')).toBe(
      'Choose a bank.',
    )
  })

  it('still checks the recipient while other fields are invalid', () => {
    // Step 1 is validated while the amount is still empty.
    expect(
      errorFor(
        {
          payeeId: NEW_RECIPIENT,
          amount: '',
          recipient: { name: 'A', accountNumber: '', bank: '' },
        },
        'recipient.name',
      ),
    ).toBe('Enter a recipient name (2–50 characters).')
  })
})
