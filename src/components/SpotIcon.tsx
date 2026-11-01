import type { LucideIcon } from 'lucide-react'
import styles from './SpotIcon.module.css'

interface Props {
  icon: LucideIcon
  tone?: 'muted' | 'negative' | 'positive'
  /** Circle size in px; the icon is half of it. */
  size?: number
  className?: string
}

/** A decorative icon in a tinted circle, for empty, error and success screens. */
export function SpotIcon({ icon: Icon, tone = 'muted', size = 48, className }: Props) {
  return (
    <span
      className={[styles.spot, styles[tone], className].filter(Boolean).join(' ')}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon size={size / 2} />
    </span>
  )
}
