import { queryOptions } from '@tanstack/react-query'
import { withDemoParams } from '../lib/demoParams'
import { apiFetch } from './client'
import type {
  AccountsResponse,
  CustomerResponse,
  PayeesResponse,
  TransactionsResponse,
} from './types'

/** Number of transactions on the dashboard (D5). */
export const RECENT_TRANSACTIONS_LIMIT = 8

// Fetchers unwrap the response envelope so components get plain data.
export const customerQuery = queryOptions({
  queryKey: ['customer'],
  queryFn: async () =>
    (await apiFetch<CustomerResponse>(withDemoParams('/api/customer'))).customer,
})

export const accountsQuery = queryOptions({
  queryKey: ['accounts'],
  queryFn: async () =>
    (await apiFetch<AccountsResponse>(withDemoParams('/api/accounts'))).accounts,
})

export const recentTransactionsQuery = queryOptions({
  queryKey: ['transactions', { limit: RECENT_TRANSACTIONS_LIMIT }],
  queryFn: async () =>
    (
      await apiFetch<TransactionsResponse>(
        withDemoParams(`/api/transactions?limit=${RECENT_TRANSACTIONS_LIMIT}`),
      )
    ).transactions,
})

export const payeesQuery = queryOptions({
  queryKey: ['payees'],
  queryFn: async () =>
    (await apiFetch<PayeesResponse>(withDemoParams('/api/payees'))).payees,
})
