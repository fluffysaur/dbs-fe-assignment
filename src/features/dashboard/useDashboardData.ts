import { useQuery } from '@tanstack/react-query'
import {
  accountsQuery,
  customerQuery,
  recentTransactionsQuery,
} from '../../api/queries'

/**
 * The dashboard's three requests, fired in parallel (D1), combined into one
 * state so the page has a single skeleton and a single error (D7).
 *
 * A query that fails but still has data (e.g. a background refetch after a
 * transfer) keeps showing that data instead of swapping to the error screen.
 */
export function useDashboardData() {
  const customer = useQuery(customerQuery)
  const accounts = useQuery(accountsQuery)
  const transactions = useQuery(recentTransactionsQuery)
  const queries = [customer, accounts, transactions]

  if (customer.data && accounts.data && transactions.data) {
    return {
      status: 'success',
      customer: customer.data,
      accounts: accounts.data,
      transactions: transactions.data,
    } as const
  }

  if (queries.some((query) => query.isError && query.data === undefined)) {
    return {
      status: 'error',
      isRetrying: queries.some((query) => query.isError && query.isFetching),
      retry: () => {
        for (const query of queries) {
          if (query.isError) void query.refetch()
        }
      },
    } as const
  }

  return { status: 'pending' } as const
}
