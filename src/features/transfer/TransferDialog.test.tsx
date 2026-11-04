import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import type { CreateTransferRequest } from '../../api/types'
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

/** Types an amount on the amount step and moves on to the review step. */
async function enterAmountAndReview(
    user: UserEvent,
    dialog: HTMLElement,
    amount: string,
) {
    await user.type(within(dialog).getByRole('textbox', { name: 'Amount' }), amount)
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    await within(dialog).findByRole('heading', { name: 'Check the details' })
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
        expect(
            within(dialog).getByRole('heading', { name: 'How much?' }),
        ).toBeInTheDocument()
        expect(requests).not.toContain('POST /api/transfers')
    })

    it('sends a transfer, shows success, and the dashboard updates', async () => {
        // Before: no row for this transfer yet, so the one we find later is new.
        const { user } = renderApp()
        await screen.findByText(money(17120.55))
        expect(screen.queryByText('Transfer to Jamie Tan')).not.toBeInTheDocument()

        // Send
        const dialog = await startTransferToJamie(user)
        await enterAmountAndReview(user, dialog, '120')
        await user.click(within(dialog).getByRole('button', { name: 'Confirm transfer' }))
        expect(within(dialog).getByRole('button', { name: 'Sending…' })).toBeDisabled()

        // Success screen. Focus moves to the result so screen readers announce it.
        expect(
            await within(dialog).findByRole('heading', { name: 'Transfer sent' }),
        ).toHaveFocus()
        expect(within(dialog).getByText(/^TRF-/)).toBeInTheDocument()
        expect(within(dialog).getByText(money(120))).toBeInTheDocument()

        await user.click(
            within(dialog).getByRole('button', { name: 'Back to dashboard' }),
        )
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'New transfer' })).toHaveFocus()

        // Dashboard refreshes (T6): 4,280.55 - 120 on checking; total and daily limit follow.
        expect(await screen.findByText(money(17000.55))).toBeInTheDocument()
        expect(screen.getByText(money(4160.55))).toBeInTheDocument()
        expect(screen.getByText(money(4880))).toBeInTheDocument()
        expect(screen.getByText('Transfer to Jamie Tan')).toBeInTheDocument()
    })

    it('keeps the transfer on review when the server rejects it, and sends once the amount is lowered', async () => {
        // The balance dropped to 100 after the form loaded, so the form allows
        // 120 but the server rejects it. The mock data can't produce this, so
        // the server is overridden. Amounts up to 100 go on to the mock API.
        const fieldMessage = `Amount can't be more than your available balance (${money(100)}).`
        server.use(
            http.post('*/api/transfers', async ({ request }) => {
                const { amount } = (await request.clone().json()) as CreateTransferRequest
                if (amount <= 100) return
                return HttpResponse.json(
                    {
                        error: {
                            code: 'INSUFFICIENT_FUNDS',
                            message: 'Amount exceeds available balance.',
                            fields: { amount: fieldMessage },
                            meta: { available: 100 },
                        },
                    },
                    { status: 422 },
                )
            }),
        )
        const { user } = renderApp()

        // Send 120: rejected
        const dialog = await startTransferToJamie(user)
        await enterAmountAndReview(user, dialog, '120')
        await user.click(within(dialog).getByRole('button', { name: 'Confirm transfer' }))

        const alert = await within(dialog).findByRole('alert')
        expect(alert).toHaveTextContent('Amount exceeds available balance.')
        expect(alert).toHaveTextContent(fieldMessage)
        expect(
            within(dialog).getByRole('heading', { name: 'Check the details' }),
        ).toBeInTheDocument()
        // Amount and total still read 120.
        expect(within(dialog).getAllByText(money(120))).toHaveLength(2)
        expect(within(dialog).queryByText('Transfer sent')).not.toBeInTheDocument()
        expect(
            within(dialog).getByRole('button', { name: 'Confirm transfer' }),
        ).toBeEnabled()

        // Back: the server's message is shown under Amount
        await user.click(within(dialog).getByRole('button', { name: 'Back' }))
        const amount = await within(dialog).findByRole('textbox', { name: 'Amount' })
        expect(within(dialog).getByText(fieldMessage)).toBeInTheDocument()
        expect(amount).toHaveAttribute('aria-invalid', 'true')

        // Lower the amount to 100: the error clears and the transfer goes through
        await user.clear(amount)
        await user.type(amount, '100')
        expect(within(dialog).queryByText(fieldMessage)).not.toBeInTheDocument()
        await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
        await within(dialog).findByRole('heading', { name: 'Check the details' })
        await user.click(within(dialog).getByRole('button', { name: 'Confirm transfer' }))

        expect(
            await within(dialog).findByRole('heading', { name: 'Transfer sent' }),
        ).toBeInTheDocument()
        expect(within(dialog).getByText(money(100))).toBeInTheDocument()
    })
})
