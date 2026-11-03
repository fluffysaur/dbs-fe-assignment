import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

/** Fills the amount step: from Savings, SGD 75, note "Dinner". */
async function fillAmountStep(user: UserEvent, dialog: HTMLElement) {
  await user.selectOptions(
    within(dialog).getByRole('combobox', { name: 'From account' }),
    'acc_savings',
  )
  await user.type(within(dialog).getByRole('textbox', { name: 'Amount' }), '75')
  await user.type(within(dialog).getByRole('textbox', { name: /Note/ }), 'Dinner')
}

async function goBackToRecipient(user: UserEvent, dialog: HTMLElement) {
  await user.click(within(dialog).getByRole('button', { name: 'Back' }))
  await within(dialog).findByRole('heading', { name: 'Who are you sending to?' })
}

async function continueToAmount(user: UserEvent, dialog: HTMLElement) {
  await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
  await within(dialog).findByRole('heading', { name: 'How much?' })
}

function expectAmountStep(dialog: HTMLElement, amount: string, note: string) {
  expect(within(dialog).getByRole('textbox', { name: 'Amount' })).toHaveValue(amount)
  expect(within(dialog).getByRole('textbox', { name: /Note/ })).toHaveValue(note)
  // The from-account always keeps the user's choice.
  expect(within(dialog).getByRole('combobox', { name: 'From account' })).toHaveValue(
    'acc_savings',
  )
}

describe('changing the recipient', () => {
  it('keeps the amount step when the recipient stays the same', async () => {
    const { user } = renderApp()
    const dialog = await startTransferToJamie(user)
    await fillAmountStep(user, dialog)

    await goBackToRecipient(user, dialog)
    // Trying another payee, then going back to Jamie, still counts as the same.
    await user.click(within(dialog).getByRole('radio', { name: /Marcus Lee/ }))
    await user.click(within(dialog).getByRole('radio', { name: /Jamie Tan/ }))
    await continueToAmount(user, dialog)

    expectAmountStep(dialog, '75', 'Dinner')
  })

  it('clears the amount and note for a different saved payee', async () => {
    const { user } = renderApp()
    const dialog = await startTransferToJamie(user)
    await fillAmountStep(user, dialog)

    await goBackToRecipient(user, dialog)
    await user.click(within(dialog).getByRole('radio', { name: /Marcus Lee/ }))
    await continueToAmount(user, dialog)

    expectAmountStep(dialog, '', '')
  })

  it('clears the amount and note after going back from review', async () => {
    const { user } = renderApp()
    const dialog = await startTransferToJamie(user)
    await fillAmountStep(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    await within(dialog).findByRole('heading', { name: 'Check the details' })

    await user.click(within(dialog).getByRole('button', { name: 'Back' }))
    await within(dialog).findByRole('heading', { name: 'How much?' })
    await goBackToRecipient(user, dialog)
    await user.click(within(dialog).getByRole('radio', { name: 'Send to someone new' }))
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Recipient name' }),
      'Alex Ong',
    )
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Account number (8 digits)' }),
      '12345678',
    )
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Bank' }),
      'OCBC',
    )
    await continueToAmount(user, dialog)

    expectAmountStep(dialog, '', '')
  })

  it("treats a new recipient's name fix as the same, but a new account number as different", async () => {
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: 'New transfer' }))
    const dialog = screen.getByRole('dialog', { name: 'New transfer' })
    await user.click(
      await within(dialog).findByRole('radio', { name: 'Send to someone new' }),
    )
    const name = within(dialog).getByRole('textbox', { name: 'Recipient name' })
    const accountNumber = within(dialog).getByRole('textbox', {
      name: 'Account number (8 digits)',
    })
    await user.type(name, 'Alx Ong')
    await user.type(accountNumber, '12345678')
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Bank' }),
      'OCBC',
    )
    await continueToAmount(user, dialog)
    await fillAmountStep(user, dialog)

    await goBackToRecipient(user, dialog)
    await user.clear(within(dialog).getByRole('textbox', { name: 'Recipient name' }))
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Recipient name' }),
      'Alex Ong',
    )
    await continueToAmount(user, dialog)
    expectAmountStep(dialog, '75', 'Dinner')

    await goBackToRecipient(user, dialog)
    const accountAgain = within(dialog).getByRole('textbox', {
      name: 'Account number (8 digits)',
    })
    await user.clear(accountAgain)
    await user.type(accountAgain, '87654321')
    await continueToAmount(user, dialog)
    expectAmountStep(dialog, '', '')
  })
})

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

    // Focus moves to the result so screen readers announce it.
    expect(
      await within(dialog).findByRole('heading', { name: 'Transfer sent' }),
    ).toHaveFocus()
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

describe('make another transfer', () => {
  /** Sends `amount` from checking to Jamie Tan and waits for success. */
  async function sendToJamie(user: UserEvent, amount: string) {
    const dialog = await startTransferToJamie(user)
    await user.type(within(dialog).getByRole('textbox', { name: 'Amount' }), amount)
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    await user.click(
      await within(dialog).findByRole('button', { name: 'Confirm transfer' }),
    )
    await within(dialog).findByRole('heading', { name: 'Transfer sent' })
    return dialog
  }

  /** Lets the first accounts request through, then holds the refresh until released. */
  function holdAccountsRefresh() {
    let release = () => {}
    const released = new Promise<void>((resolve) => (release = resolve))
    let calls = 0
    server.use(
      http.get('*/api/accounts', async () => {
        calls += 1
        if (calls > 1) await released
        // Returning nothing falls through to the real mock handler.
      }),
    )
    return release
  }

  async function startAnother(user: UserEvent, dialog: HTMLElement) {
    await user.click(
      within(dialog).getByRole('button', { name: 'Make another transfer' }),
    )
    expect(
      await within(dialog).findByRole('heading', { name: 'Who are you sending to?' }),
    ).toHaveFocus()
  }

  it('starts blank and waits for fresh balances before Continue', async () => {
    const release = holdAccountsRefresh()
    const { user } = renderApp()
    const dialog = await sendToJamie(user, '120')

    await startAnother(user, dialog)
    expect(within(dialog).getByRole('radio', { name: /Jamie Tan/ })).not.toBeChecked()
    await user.click(within(dialog).getByRole('radio', { name: /Marcus Lee/ }))
    await continueToAmount(user, dialog)

    expect(within(dialog).getByRole('textbox', { name: 'Amount' })).toHaveValue('')
    expect(within(dialog).getByRole('button', { name: 'Continue' })).toBeDisabled()
    expect(within(dialog).queryByText(money(4280.55))).not.toBeInTheDocument()

    release()
    // 4,280.55 - 120 on checking; the limit was already 5,000 - 120.
    expect(await within(dialog).findByText(money(4160.55))).toBeInTheDocument()
    expect(within(dialog).getByText(money(4880))).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Continue' })).toBeEnabled()

    await user.type(within(dialog).getByRole('textbox', { name: 'Amount' }), '50')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    await user.click(
      await within(dialog).findByRole('button', { name: 'Confirm transfer' }),
    )
    expect(
      await within(dialog).findByRole('heading', { name: 'Transfer sent' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(money(50))).toBeInTheDocument()
  })

  it('re-checks an amount typed before the fresh balance arrived', async () => {
    const release = holdAccountsRefresh()
    const { user } = renderApp()
    const dialog = await sendToJamie(user, '4000')

    await startAnother(user, dialog)
    await user.click(within(dialog).getByRole('radio', { name: /Jamie Tan/ }))
    await continueToAmount(user, dialog)
    // Fine against the old 4,280.55, too much for the new 280.55.
    await user.type(within(dialog).getByRole('textbox', { name: 'Amount' }), '1000')
    await user.tab()
    expect(within(dialog).queryByText(/available balance/)).not.toBeInTheDocument()

    release()
    expect(
      await within(dialog).findByText(
        `Amount can't be more than your available balance (${money(280.55)}).`,
      ),
    ).toBeInTheDocument()
  })

  it('shows Retry when the balances fail to refresh', async () => {
    let calls = 0
    server.use(
      http.get('*/api/accounts', () => {
        calls += 1
        if (calls === 2) {
          return HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Down' } },
            { status: 500 },
          )
        }
      }),
    )
    const { user } = renderApp()
    const dialog = await sendToJamie(user, '120')

    await startAnother(user, dialog)
    await user.click(within(dialog).getByRole('radio', { name: /Jamie Tan/ }))
    await continueToAmount(user, dialog)

    expect(
      await within(dialog).findByText("We couldn't load your latest balance."),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Continue' })).toBeDisabled()

    await user.click(within(dialog).getByRole('button', { name: 'Retry' }))
    expect(await within(dialog).findByText(money(4160.55))).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Continue' })).toBeEnabled()
  })
})

describe('send to someone new', () => {
  afterEach(() => vi.restoreAllMocks())

  it('scrolls the new-recipient fields into view only when the user picks it', async () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: 'New transfer' }))
    const dialog = screen.getByRole('dialog', { name: 'New transfer' })

    await user.click(
      await within(dialog).findByRole('radio', { name: 'Send to someone new' }),
    )
    const name = within(dialog).getByRole('textbox', { name: 'Recipient name' })
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(scroll.mock.contexts[0]).toContainElement(name)
    // Focus stays in the radio group.
    expect(
      within(dialog).getByRole('radio', { name: 'Send to someone new' }),
    ).toHaveFocus()

    // Coming back to the step with it already selected doesn't scroll again.
    await user.type(name, 'Lee Wei')
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Account number (8 digits)' }),
      '12345678',
    )
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Bank' }),
      'DBS',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    await within(dialog).findByRole('heading', { name: 'How much?' })
    await user.click(within(dialog).getByRole('button', { name: 'Back' }))
    expect(within(dialog).getByRole('textbox', { name: 'Recipient name' })).toBeVisible()
    expect(scroll).toHaveBeenCalledTimes(1)
  })

  it("doesn't scroll when it's preselected because there are no saved payees", async () => {
    server.use(http.get('*/api/payees', () => HttpResponse.json({ payees: [] })))
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: 'New transfer' }))
    const dialog = screen.getByRole('dialog', { name: 'New transfer' })

    expect(await within(dialog).findByText('No saved payees yet.')).toBeInTheDocument()
    expect(
      within(dialog).getByRole('radio', { name: 'Send to someone new' }),
    ).toBeChecked()
    expect(within(dialog).getByRole('textbox', { name: 'Recipient name' })).toBeVisible()
    expect(scroll).not.toHaveBeenCalled()
  })
})
