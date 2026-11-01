/**
 * Demo hooks for reviewers. Not part of normal app logic.
 *
 * Add these to the page URL and they are forwarded to the mock API:
 * - `?scenario=error` → the first request to each GET endpoint fails, so the
 *   error state shows and `Retry` then recovers.
 * - `?scenario=empty` → list endpoints return empty lists (every request).
 * - `?delay=3000`     → every response is slower (max 5000 ms).
 */
const pageParams = new URLSearchParams(window.location.search)
const scenario = pageParams.get('scenario')
const delay = pageParams.get('delay')

// Endpoints that have already received their one-off `scenario=error`.
const errorSent = new Set<string>()

export function hasDemoScenario(): boolean {
  return scenario !== null
}

export function withDemoParams(path: string, method = 'GET'): string {
  if (!scenario && !delay) return path

  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)

  if (scenario && method === 'GET') {
    if (scenario !== 'error') {
      params.set('scenario', scenario)
    } else if (!errorSent.has(pathname)) {
      errorSent.add(pathname)
      params.set('scenario', 'error')
    }
  }
  if (delay) params.set('delay', delay)

  const search = params.toString()
  return search ? `${pathname}?${search}` : pathname
}
