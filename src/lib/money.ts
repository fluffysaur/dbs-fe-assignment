/** A positive amount with at most 2 decimal places, e.g. `120`, `120.5`, `0.99`. */
export const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

/**
 * Money is compared in whole cents so `4280.55 <= 4280.55` can't be broken
 * by floating-point rounding.
 */
export function toCents(value: number | string): number {
  return Math.round(Number(value) * 100)
}

/** `12345678` → `•••• 5678` (same format the API uses for saved payees). */
export function maskAccountNumber(accountNumber: string): string {
  return `•••• ${accountNumber.slice(-4)}`
}
