import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { SpotIcon } from './SpotIcon'
import styles from './EmptyState.module.css'

interface Props {
  message: string
  icon?: LucideIcon
  action?: ReactNode
}

export function EmptyState({ message, icon, action }: Props) {
  return (
    <div className={styles.empty}>
      {icon && <SpotIcon icon={icon} />}
      <p>{message}</p>
      {action}
    </div>
  )
}
