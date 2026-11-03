import type { Account, Customer } from '../api/types'

/**
 * Money rules: cents, totals and limits. Each rule lives here once,
 * so the dashboard and the transfer dialog can't disagree.
 */

/**
 * Money is compared in whole cents so `4280.55 <= 4280.55` can't be broken
 * by floating-point rounding.
 */
export function toCents(value: number | string): number {
    return Math.round(Number(value) * 100)
}

/** Accounts that hold the customer's money. The credit card is money owed (D3, T3). */
export function depositAccounts(accounts: Account[]): Account[] {
    return accounts.filter((account) => account.type !== 'credit')
}

/** Sum of the deposit accounts' balances (D3). */
export function totalAvailable(accounts: Account[]): number {
    const cents = depositAccounts(accounts).reduce(
        (sum, account) => sum + toCents(account.balance),
        0,
    )
    return cents / 100
}

/** How much more the customer can transfer today (T3). */
export function remainingLimit(customer: Customer): number {
    return (
        (toCents(customer.dailyTransferLimit) - toCents(customer.transferredToday)) / 100
    )
}
