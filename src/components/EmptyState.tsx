import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface Props {
  message: string
  action?: ReactNode
}

export function EmptyState({ message, action }: Props) {
  return (
    <div className={styles.empty}>
      <p>{message}</p>
      {action}
    </div>
  )
}
