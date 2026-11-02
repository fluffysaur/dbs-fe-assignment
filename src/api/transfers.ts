import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { withDemoParams } from '../lib/demoParams'
import { ApiError, apiFetch } from './client'
import { accountsQuery, customerQuery, recentTransactionsQuery } from './queries'
import type { CreateTransferRequest, TransferResponse } from './types'

export function createTransfer(body: CreateTransferRequest) {
  return apiFetch<TransferResponse>(withDemoParams('/api/transfers', 'POST'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Balances and the daily limit (the customer holds `transferredToday`). */
function refreshBalances(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: customerQuery.queryKey })
  void queryClient.invalidateQueries({ queryKey: accountsQuery.queryKey })
}

/**
 * Sends a transfer. On success the server has changed the balance, the
 * transactions and the daily limit, so we mark those queries stale and
 * TanStack Query refetches them (the server stays the source of truth).
 */
export function useCreateTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTransfer,
    onSuccess: () => {
      refreshBalances(queryClient)
      void queryClient.invalidateQueries({ queryKey: recentTransactionsQuery.queryKey })
    },
    onError: (error) => {
      // 422 = balance or limit changed since we loaded them; refresh so the
      // form's own rules use the new numbers.
      if (error instanceof ApiError && error.status === 422) refreshBalances(queryClient)
    },
  })
}
