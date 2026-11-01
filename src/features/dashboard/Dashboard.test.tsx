import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { money, renderApp } from '../../test/renderApp'
import { server } from '../../test/setup'

describe('dashboard', () => {
  it('shows an error when loading fails, and Retry loads it', async () => {
    // Only the first accounts request fails; the retry gets the real data.
    server.use(
      http.get(
        '*/api/accounts',
        () =>
          HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Down' } },
            { status: 500 },
          ),
        { once: true },
      ),
    )
    const { user } = renderApp()

    expect(
      await screen.findByText("We couldn't load your dashboard."),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText(money(17120.55))).toBeInTheDocument()
    expect(screen.getByText('Across 2 deposit accounts')).toBeInTheDocument()
    expect(screen.queryByText("We couldn't load your dashboard.")).not.toBeInTheDocument()
  })

  it('filters transactions by category, and clears a search with no matches', async () => {
    const { user } = renderApp()
    const list = await screen.findByRole('region', { name: 'Recent transactions' })
    const search = within(list).getByRole('searchbox', { name: 'Search transactions' })

    // Category match, ignoring case.
    await user.type(search, 'DINING')
    expect(within(list).getByText('Kopitiam Corner')).toBeInTheDocument()
    expect(within(list).queryByText('FairPrice Finest')).not.toBeInTheDocument()
    expect(within(list).getByText('1 result')).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'zzz')
    expect(
      within(list).getByText('No transactions match your search.'),
    ).toBeInTheDocument()

    await user.click(within(list).getByRole('button', { name: 'Clear search' }))
    expect(search).toHaveValue('')
    expect(within(list).getByText('FairPrice Finest')).toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')).toHaveLength(8)
  })
})
