import { Search } from 'lucide-react'
import type { Ref } from 'react'
import styles from './SearchInput.module.css'

interface Props {
    id: string
    /** Read by screen readers and shown as the placeholder. */
    label: string
    value: string
    onChange: (value: string) => void
    ref?: Ref<HTMLInputElement>
    /** For layout only, e.g. width. */
    className?: string
}

export function SearchInput({ id, label, value, onChange, ref, className }: Props) {
    return (
        <div className={[styles.search, className].filter(Boolean).join(' ')}>
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <Search aria-hidden size={18} className={styles.icon} />
            <input
                ref={ref}
                id={id}
                type="search"
                className={styles.input}
                placeholder={label}
                autoComplete="off"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    )
}
