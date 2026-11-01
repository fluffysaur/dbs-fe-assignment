import styles from './InlineError.module.css'

interface Props {
  id: string
  message?: string
}

/**
 * A field's error message. Give the input `aria-describedby={id}` so screen
 * readers read it with the field. Renders nothing when there's no error.
 */
export function InlineError({ id, message }: Props) {
  if (!message) return null
  return (
    <p id={id} className={styles.error}>
      {message}
    </p>
  )
}
