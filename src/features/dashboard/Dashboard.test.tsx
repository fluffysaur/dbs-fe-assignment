import { screen } from '@testing-library/react'
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
})
