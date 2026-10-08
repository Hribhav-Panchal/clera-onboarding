import { forwardRef, useImperativeHandle, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { usePress } from '../lib/usePress'
import { Spinner } from './Spinner'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type Common = {
  variant?: ButtonVariant
  loading?: boolean
  /** Accessible label announced while loading. */
  loadingLabel?: string
  leading?: ReactNode
  trailing?: ReactNode
  block?: boolean
  size?: 'md' | 'sm'
  className?: string
  children: ReactNode
}

type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined; external?: undefined }
type AsLink = Common & { to: string; external?: boolean; onClick?: () => void; disabled?: boolean; 'aria-label'?: string }

export type ButtonProps = AsButton | AsLink

function classes(p: Common & { disabled?: boolean }) {
  return [
    styles.button,
    styles[p.variant ?? 'primary'],
    p.size === 'sm' ? styles.sm : '',
    p.block ? styles.block : '',
    p.loading ? styles.loading : '',
    p.className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(props, forwarded) {
  const ref = useRef<HTMLElement>(null)
  useImperativeHandle(forwarded, () => ref.current as HTMLElement)
  const disabled = 'disabled' in props ? props.disabled : false
  usePress(ref, { disabled: disabled || props.loading })

  const content = (
    <>
      {props.loading ? (
        <span className={styles.spinner} aria-hidden>
          <Spinner size={14} />
        </span>
      ) : null}
      <span className={styles.content}>
        {props.leading ? <span className={styles.icon}>{props.leading}</span> : null}
        <span className={styles.label}>{props.children}</span>
        {props.trailing ? <span className={styles.icon}>{props.trailing}</span> : null}
      </span>
      {props.loading && props.loadingLabel ? <span className="sr-only">{props.loadingLabel}</span> : null}
    </>
  )

  if (props.to !== undefined) {
    const { to, external, onClick, disabled: linkDisabled } = props
    if (external) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={classes(props)}
          href={to}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          aria-disabled={linkDisabled || undefined}
          aria-label={props['aria-label']}
        >
          {content}
        </a>
      )
    }
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={classes(props)}
        to={to}
        onClick={onClick}
        aria-label={props['aria-label']}
      >
        {content}
      </Link>
    )
  }

  const {
    variant: _v,
    loading,
    loadingLabel: _ll,
    leading: _l,
    trailing: _t,
    block: _b,
    size: _s,
    className: _c,
    children: _ch,
    type = 'button',
    onClick,
    ...rest
  } = props
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      className={classes(props)}
      aria-busy={loading || undefined}
      onClick={(e) => {
        // Guard against double submits while a request is in flight.
        if (loading) {
          e.preventDefault()
          return
        }
        onClick?.(e)
      }}
      {...rest}
    >
      {content}
    </button>
  )
})
