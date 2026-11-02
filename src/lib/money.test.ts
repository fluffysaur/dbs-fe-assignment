import { describe, expect, it } from 'vitest'
import type { Account, Customer } from '../api/types'
import { depositAccounts, remainingLimit, totalAvailable } from './money'

function account(type: Account['type'], balance: number): Account {
  return {
    id: `acc_${type}`,
    name: type,
    type,
    maskedNumber: '•••• 0000',
    balance,
    currency: 'SGD',
  }
}

const accounts = [
  account('checking', 4280.55),
  account('savings', 12840),
  account('credit', -420.3),
]

describe('account rules', () => {
  it('leaves the credit card out of deposit accounts', () => {
    expect(depositAccounts(accounts).map((item) => item.type)).toEqual([
      'checking',
      'savings',
    ])
  })

  it('totals the deposit accounts only (D3)', () => {
    expect(totalAvailable(accounts)).toBe(17120.55)
  })

  it('works out the remaining daily limit in cents', () => {
    const customer: Customer = {
      id: 'cus_001',
      firstName: 'Ava',
      lastName: 'Chen',
      email: 'ava.chen@example.com',
      segment: 'retail',
      dailyTransferLimit: 5000,
      transferredToday: 4280.55,
    }
    // Plain subtraction gives 719.4499999999998.
    expect(remainingLimit(customer)).toBe(719.45)
  })
})
