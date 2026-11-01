import type { CreateTransferRequest } from '../../api/types'
import { toCents } from '../../lib/money'
import { NEW_RECIPIENT, type TransferFormValues } from './schema'

/** Turns validated form values into the POST /api/transfers body. */
export function toTransferRequest(values: TransferFormValues): CreateTransferRequest {
  const note = values.note.trim()
  const base = {
    fromAccountId: values.fromAccountId,
    amount: toCents(values.amount.trim()) / 100,
    ...(note ? { note } : {}),
  }

  // Send either a saved payee or a new recipient, never both.
  if (values.payeeId === NEW_RECIPIENT) {
    return {
      ...base,
      recipient: {
        name: values.recipient.name.trim(),
        accountNumber: values.recipient.accountNumber.trim(),
        bank: values.recipient.bank,
      },
    }
  }
  // The schema has already rejected an empty or null payeeId.
  return { ...base, payeeId: values.payeeId ?? '' }
}
