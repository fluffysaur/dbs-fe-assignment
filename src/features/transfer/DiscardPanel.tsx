import { TriangleAlert } from 'lucide-react'
import { Button } from '../../components/Button'
import { SpotIcon } from '../../components/SpotIcon'
import styles from './TransferDialog.module.css'

interface Props {
  onKeepEditing: () => void
  onDiscard: () => void
}

export function DiscardPanel({ onKeepEditing, onDiscard }: Props) {
  return (
    <div className={styles.discard}>
      <SpotIcon icon={TriangleAlert} tone="negative" size={64} />
      <h3 className={styles.stepTitle}>Discard this transfer?</h3>
      <p className={styles.hint}>The details you entered won&apos;t be saved.</p>
      <div className={styles.discardActions}>
        {/* Safe choice gets focus. */}
        <Button variant="secondary" autoFocus onClick={onKeepEditing}>
          Keep editing
        </Button>
        <Button variant="danger" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  )
}
