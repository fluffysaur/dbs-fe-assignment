import type { ReactNode } from 'react'
import { InlineError } from './InlineError'
import styles from './Field.module.css'

/** Props Field gives its control, so label, error and help text stay linked. */
export interface ControlProps {
    id: string
    className: string
    'aria-invalid': true | undefined
    'aria-describedby': string | undefined
}

interface Props {
    id: string
    label: string
    error?: string
    /** Id of help text the control should also be described by. */
    describedBy?: string
    /** Shown at the end of the label row, e.g. a character counter. */
    aside?: ReactNode
    /** Shown under the error, e.g. help text. */
    footer?: ReactNode
    /**
     * A function, not plain children, so Field can give the control its props
     * while the call site still places it (e.g. inside the SGD prefix).
     */
    children: (controlProps: ControlProps) => ReactNode
}

export function Field({ id, label, error, describedBy, aside, footer, children }: Props) {
    const describedByIds = [error ? errorId(id) : null, describedBy].filter(Boolean)
    const controlProps: ControlProps = {
        id,
        className: styles.input,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedByIds.length ? describedByIds.join(' ') : undefined,
    }

    return (
        <div className={styles.field}>
            <div className={styles.labelRow}>
                <label htmlFor={id} className={styles.label}>
                    {label}
                </label>
                {aside}
            </div>
            {children(controlProps)}
            <InlineError id={errorId(id)} message={error} />
            {footer}
        </div>
    )
}

export function errorId(id: string) {
    return `${id}-error`
}
