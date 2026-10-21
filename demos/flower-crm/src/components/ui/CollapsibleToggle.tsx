import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ToggleProps = {
  id?: string
  title: ReactNode
  count?: number
  expanded: boolean
  onClick: () => void
  className?: string
  controls?: string
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'>

/** Кнопка сворачивания: шеврон + заголовок + счётчик. */
export function CollapsibleToggle({
  id,
  title,
  count,
  expanded,
  onClick,
  className,
  controls,
  'aria-label': ariaLabel,
}: ToggleProps) {
  return (
    <button
      type="button"
      id={id}
      className={['ff-collapse__toggle', className].filter(Boolean).join(' ')}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <span className="ff-collapse__chev" aria-hidden>
        {expanded ? '▼' : '▶'}
      </span>
      <span className="ff-collapse__title">{title}</span>
      {count != null ? <span className="ff-collapse__count">{count}</span> : null}
    </button>
  )
}
