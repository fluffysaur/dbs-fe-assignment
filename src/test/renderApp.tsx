import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { formatMoney } from '../lib/format'

/** Renders the whole app against the real mock API, with a fresh cache. */
export function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const user = userEvent.setup()
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
  return { user, ...utils }
}

/**
 * `formatMoney` for text queries. Testing Library turns the non-breaking
 * space after `SGD` into a normal space in page text, but not in the string
 * we search for, so we do the same here.
 */
export function money(amount: number) {
  return formatMoney(amount).replace(/\u00a0/g, ' ')
}
