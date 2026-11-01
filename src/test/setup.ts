import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { handlers, resetMockDb } from '../mocks/handlers'

export const server = setupServer(...handlers)

// Every mock response takes ~500 ms, so give findBy* queries more time.
configure({ asyncUtilTimeout: 3000 })

// jsdom doesn't implement <dialog> showModal/close yet.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetMockDb()
  localStorage.clear()
  delete document.documentElement.dataset.theme
  delete document.documentElement.dataset.segment
})
afterEach(() => {
  // Vitest globals are off, so Testing Library can't clean up by itself.
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
