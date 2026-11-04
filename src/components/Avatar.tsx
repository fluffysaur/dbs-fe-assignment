import styles from './Avatar.module.css'

interface Props {
    initials: string
    /** The person's name for screen readers. Leave out when it's printed beside it. */
    label?: string
    tone?: 'brand' | 'muted'
}

export function Avatar({ initials, label, tone = 'muted' }: Props) {
    return (
        <span
            className={`${styles.avatar} ${styles[tone]}`}
            {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
        >
            {initials}
        </span>
    )
}
