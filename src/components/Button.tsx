import type { ComponentProps } from 'react'
import styles from './Button.module.css'

interface Props extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

/** Defaults to type="button" so it never submits a form by accident. */
export function Button({
  variant = 'primary',
  type = 'button',
  className,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}
