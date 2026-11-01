import type { ReactNode } from 'react'
import { InlineError } from './InlineError'
import styles from './Field.module.css'

export const inputClassName = styles.input

interface Props {
  id: string
  label: string
  error?: string
  /** Shown at the end of the label row, e.g. a character counter. */
  aside?: ReactNode
  /** Shown under the error, e.g. help text. */
  footer?: ReactNode
  children: ReactNode
}

/** Label + control + error message + optional help text. */
export function Field({ id, label, error, aside, footer, children }: Props) {
  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {aside}
      </div>
      {children}
      <InlineError id={errorId(id)} message={error} />
      {footer}
    </div>
  )
}

export function errorId(id: string) {
  return `${id}-error`
}

/**
 * Accessibility props for a control: links its error (and any help text)
 * with aria-describedby and marks it invalid.
 */
export function fieldProps(id: string, error?: string, helpId?: string) {
  const describedBy = [error ? errorId(id) : null, helpId].filter(Boolean)
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy.length ? describedBy.join(' ') : undefined,
  }
}
