import { useQuery } from '@tanstack/react-query'
import { customerQuery } from '../api/queries'
import { SegmentSwitch } from '../features/theme/SegmentSwitch'
import { ThemeToggle } from '../features/theme/ThemeToggle'
import type { Preferences } from '../features/theme/usePreferences'
import { Skeleton } from './Skeleton'
import styles from './Header.module.css'

// Out of scope pages: shown, but disabled (brief §2).
const DISABLED_LINKS = ['Cards', 'Payments', 'Insights']

interface Props {
  preferences: Preferences
}

export function Header({ preferences }: Props) {
  const { data: customer } = useQuery(customerQuery)

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            M
          </span>
          <span className={styles.name}>Meridian</span>
        </div>

        <nav aria-label="Main" className={styles.nav}>
          <a href="/" aria-current="page" className={styles.link}>
            Overview
          </a>
          {DISABLED_LINKS.map((label) => (
            <a key={label} aria-disabled="true" className={styles.link}>
              {label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          <div className={styles.segment}>
            <SegmentSwitch
              segment={preferences.segment}
              onChange={preferences.changeSegment}
            />
          </div>
          <ThemeToggle theme={preferences.theme} onToggle={preferences.toggleTheme} />
          {customer ? (
            <span
              className={styles.avatar}
              role="img"
              aria-label={`${customer.firstName} ${customer.lastName}`}
            >
              {customer.firstName[0]}
              {customer.lastName[0]}
            </span>
          ) : (
            <Skeleton width={40} height={40} round />
          )}
        </div>
      </div>
    </header>
  )
}
