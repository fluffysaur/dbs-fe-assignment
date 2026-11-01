import { Moon, Sun } from 'lucide-react'
import type { Theme } from './usePreferences'
import styles from './ThemeToggle.module.css'

interface Props {
  theme: Theme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: Props) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label="Dark mode"
      aria-pressed={isDark}
      onClick={onToggle}
    >
      {isDark ? <Moon aria-hidden size={20} /> : <Sun aria-hidden size={20} />}
    </button>
  )
}
