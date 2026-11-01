import type { Segment } from '../../api/types'
import styles from './SegmentSwitch.module.css'

const OPTIONS: { value: Segment; label: string }[] = [
  { value: 'retail', label: 'Retail' },
  { value: 'premium', label: 'Premium' },
]

interface Props {
  segment: Segment
  onChange: (segment: Segment) => void
}

export function SegmentSwitch({ segment, onChange }: Props) {
  return (
    <div role="group" aria-label="Customer segment" className={styles.switch}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          aria-pressed={segment === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
