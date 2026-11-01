import { useMutation, useQueryClient } from '@tanstack/react-query'
import { withDemoParams } from '../lib/demoParams'
import { ApiError, apiFetch } from './client'
import type { CreateTransferRequest, TransferResponse } from './types'

export function createTransfer(body: CreateTransferRequest) {
  return apiFetch<TransferResponse>(withDemoParams('/api/transfers', 'POST'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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
      void queryClient.invalidateQueries({ queryKey: ['customer'] })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (error) => {
      // 422 = balance or limit changed since we loaded them; refresh so the
      // form's own rules use the new numbers.
      if (error instanceof ApiError && error.status === 422) {
        void queryClient.invalidateQueries({ queryKey: ['customer'] })
        void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      }
    },
  })
}
