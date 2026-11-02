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

describe('closing a half-filled transfer', () => {
  it('asks first, with focus on Keep editing, and Keep editing restores the form', async () => {
    const { user } = renderApp()
    const dialog = await startTransferToJamie(user)
    await fillAmountStep(user, dialog)

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(
      within(dialog).getByRole('heading', { name: 'Discard this transfer?' }),
    ).toBeInTheDocument()
    // The safe choice has focus, so a stray Enter keeps the user's work.
    expect(within(dialog).getByRole('button', { name: 'Keep editing' })).toHaveFocus()

    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    await within(dialog).findByRole('heading', { name: 'How much?' })
    expectAmountStep(dialog, '75', 'Dinner')
  })
})
