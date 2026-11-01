import styles from './TransferDialog.module.css'

export type FormStep = 'recipient' | 'amount' | 'review'

const STEPS: { id: FormStep; label: string }[] = [
  { id: 'recipient', label: 'Recipient' },
  { id: 'amount', label: 'Amount' },
  { id: 'review', label: 'Review' },
]

export function Stepper({ current }: { current: FormStep }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current)
  return (
    <ol className={styles.stepper} aria-label="Transfer steps">
      {STEPS.map((step, index) => (
        <li
          key={step.id}
          aria-current={index === currentIndex ? 'step' : undefined}
          data-done={index < currentIndex || undefined}
        >
          <span className={styles.stepNumber} aria-hidden>
            {index + 1}
          </span>
          {step.label}
        </li>
      ))}
    </ol>
  )
}
