import type { CSSProperties } from 'react'
import styles from './Skeleton.module.css'

interface Props {
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  round?: boolean
  className?: string
}

/** A grey placeholder block. Hidden from screen readers. */
export function Skeleton({ width = '100%', height = '1em', round, className }: Props) {
  return (
    <span
      aria-hidden
      className={[styles.skeleton, round && styles.round, className]
        .filter(Boolean)
        .join(' ')}
      style={{ width, height }}
    />
  )
}
