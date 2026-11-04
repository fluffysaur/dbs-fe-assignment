import { Button } from '../../components/Button'
import shared from './TransferDialog.module.css'
import styles from './Panels.module.css'

interface Props {
    onKeepEditing: () => void
    onDiscard: () => void
}

export function DiscardPanel({ onKeepEditing, onDiscard }: Props) {
    return (
        <div className={styles.panel}>
            <h3 className={shared.stepTitle}>Discard this transfer?</h3>
            <p className={shared.hint}>The details you entered won&apos;t be saved.</p>
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
