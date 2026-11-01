import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { money, renderApp } from '../../test/renderApp'
import { server } from '../../test/setup'

/** Opens the dialog, picks Jamie Tan and moves on to the amount step. */
async function startTransferToJamie(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: 'New transfer' }))
  const dialog = screen.getByRole('dialog', { name: 'New transfer' })
  await user.click(await within(dialog).findByRole('radio', { name: /Jamie Tan/ }))
  await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
  await within(dialog).findByRole('heading', { name: 'How much?' })
  return dialog
}

describe('transfer', () => {
  afterEach(() => server.events.removeAllListeners())

  it('shows an error for an amount over the balance and sends no request', async () => {
    const requests: string[] = []
    server.events.on('request:start', ({ request }) => {
      requests.push(`${request.method} ${new URL(request.url).pathname}`)
    })
    const { user } = renderApp()
    const dialog = await startTransferToJamie(user)

    const amount = within(dialog).getByRole('textbox', { name: 'Amount' })
    await user.type(amount, '5000') // checking has 4,280.55
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))

    expect(
      await within(dialog).findByText(
        `Amount can't be more than your available balance (${money(4280.55)}).`,
      ),
    ).toBeInTheDocument()
    expect(amount).toHaveFocus()
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByRole('heading', { name: 'How much?' })).toBeInTheDocument()
    expect(requests).not.toContain('POST /api/transfers')
  })

  it('sends a transfer, shows success, and the dashboard updates', async () => {
    const { user } = renderApp()
    await screen.findByText(money(17120.55))
    expect(screen.queryByText('Transfer to Jamie Tan')).not.toBeInTheDocument()

    const dialog = await startTransferToJamie(user)
    await user.type(within(dialog).getByRole('textbox', { name: 'Amount' }), '120')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    await within(dialog).findByRole('heading', { name: 'Check the details' })

    await user.click(within(dialog).getByRole('button', { name: 'Confirm transfer' }))
    expect(within(dialog).getByRole('button', { name: 'Sending…' })).toBeDisabled()

    expect(
      await within(dialog).findByRole('heading', { name: 'Transfer sent' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/^TRF-/)).toBeInTheDocument()
    expect(within(dialog).getByText(money(120))).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Back to dashboard' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New transfer' })).toHaveFocus()

    // 4,280.55 - 120 on checking; total and daily limit follow.
    expect(await screen.findByText(money(17000.55))).toBeInTheDocument()
    expect(screen.getByText(money(4160.55))).toBeInTheDocument()
    expect(screen.getByText(money(4880))).toBeInTheDocument()
    expect(screen.getByText('Transfer to Jamie Tan')).toBeInTheDocument()
  })

  it('stays on review with the data kept when sending fails', async () => {
    const { user } = renderApp()
    const dialog = await startTransferToJamie(user)
    await user.type(within(dialog).getByRole('textbox', { name: 'Amount' }), '50')
    // Test hook: a note containing #fail makes the API return 500.
    await user.type(within(dialog).getByRole('textbox', { name: /Note/ }), 'Lunch #fail')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    await user.click(
      await within(dialog).findByRole('button', { name: 'Confirm transfer' }),
    )

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      "Something went wrong. Your money hasn't left your account. Try again.",
    )
    expect(
      within(dialog).getByRole('heading', { name: 'Check the details' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('Lunch #fail')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Confirm transfer' })).toBeEnabled()
    expect(within(dialog).queryByText('Transfer sent')).not.toBeInTheDocument()
  })
})
