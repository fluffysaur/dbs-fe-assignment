import { useQuery } from '@tanstack/react-query'
import { accountsQuery, customerQuery } from '../../api/queries'

export type BalancesState = 'ready' | 'refreshing' | 'failed'

/**
 * Whether the balances and daily limit have reloaded since `changedAt` (ms),
 * the moment a transfer or a 422 made the loaded numbers out of date.
 * Background refetches (e.g. on window focus) don't count as out of date.
 */
export function useFreshBalances(changedAt: number | null) {
    // Read the dashboard's cached queries without fetching on their own.
    const customer = useQuery({ ...customerQuery, enabled: false })
    const accounts = useQuery({ ...accountsQuery, enabled: false })
    const outdated = [customer, accounts].filter(
        (query) => changedAt !== null && query.dataUpdatedAt < changedAt,
    )
    const failed = outdated.filter((query) => query.isError && !query.isFetching)

    const state: BalancesState =
        outdated.length === 0 ? 'ready' : failed.length > 0 ? 'failed' : 'refreshing'

    return {
        state,
        retry: () => {
            for (const query of failed) void query.refetch()
        },
    }
}
