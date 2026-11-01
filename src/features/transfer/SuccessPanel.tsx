import { Check } from 'lucide-react'
import type { Ref } from 'react'
import type { Transfer } from '../../api/types'
import { Button } from '../../components/Button'
import { formatMoney } from '../../lib/format'
import styles from './TransferDialog.module.css'

interface Props {
  transfer: Transfer
  headingRef: Ref<HTMLHeadingElement>
  onDone: () => void
}

/** Everything shown here comes from the API response, not the form. */
export function SuccessPanel({ transfer, headingRef, onDone }: Props) {
  const { recipient } = transfer
  return (
    <div className={styles.success}>
      <span className={styles.successIcon} aria-hidden>
        <Check size={32} />
      </span>
      <h3 ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
        Transfer sent
      </h3>
      <p className={`amount ${styles.successAmount}`}>
        {formatMoney(transfer.amount)}
      </p>
      <p>
        to {recipient.name} · {recipient.bank} ·{' '}
        <span className="amount">{recipient.accountNumberMasked}</span>
      </p>
      <dl className={styles.reference}>
        <dt>Reference</dt>
        <dd className="amount">{transfer.reference}</dd>
      </dl>
      <p className={styles.hint}>The money should arrive within minutes.</p>
      <Button onClick={onDone}>Back to dashboard</Button>
    </div>
  )
}
