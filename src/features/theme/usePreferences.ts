import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { customerQuery } from '../../api/queries'
import type { Segment } from '../../api/types'

export type Theme = 'light' | 'dark'

// Same keys as the pre-paint script in index.html.
const THEME_KEY = 'meridian-theme'
const SEGMENT_KEY = 'meridian-segment'

function readSavedSegment(): Segment | null {
  try {
    const value = localStorage.getItem(SEGMENT_KEY)
    return value === 'retail' || value === 'premium' ? value : null
  } catch {
    return null
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked (e.g. private mode): the choice lasts for this visit.
  }
}

/**
 * Theme (light/dark) and segment (retail/premium), applied as data attributes
 * on <html> so the design tokens switch colours.
 *
 * - Theme starts from what the pre-paint script set (saved choice or system).
 * - Segment is the saved choice, else the customer's segment from the API.
 * Choices are saved only when the user toggles.
 */
export function usePreferences() {
  const { data: customer } = useQuery(customerQuery)

  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  )
  const [savedSegment, setSavedSegment] = useState<Segment | null>(
    readSavedSegment,
  )
  const segment: Segment = savedSegment ?? customer?.segment ?? 'retail'

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.segment = segment
  }, [segment])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    save(THEME_KEY, next)
  }

  function changeSegment(next: Segment) {
    setSavedSegment(next)
    save(SEGMENT_KEY, next)
  }

  return { theme, toggleTheme, segment, changeSegment }
}

export type Preferences = ReturnType<typeof usePreferences>
