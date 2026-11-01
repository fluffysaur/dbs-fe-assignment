import { Button } from '../../components/Button'
import styles from './TransferDialog.module.css'

interface Props {
  onKeepEditing: () => void
  onDiscard: () => void
}

export function DiscardPanel({ onKeepEditing, onDiscard }: Props) {
  return (
    <div className={styles.discard}>
      <h3 className={styles.stepTitle}>Discard this transfer?</h3>
      <p className={styles.hint}>The details you entered won&apos;t be saved.</p>
      <div className={styles.discardActions}>
        {/* Safe choice gets focus. */}
        <Button variant="secondary" autoFocus onClick={onKeepEditing}>
          Keep editing
        </Button>
        <Button onClick={onDiscard}>Discard</Button>
      </div>
    </div>
  )
}
