import type { ReactNode } from 'react'
import { CollapsibleToggle } from './CollapsibleToggle'

type Props = {
  sectionId: string
  title: ReactNode
  count?: number
  expanded: boolean
  onToggle: () => void
  emptyHint: string
  allowEmptyBody?: boolean
  children: ReactNode
  className?: string
}

export function CollapsiblePanel({
  sectionId,
  title,
  count,
  expanded,
  onToggle,
  emptyHint,
  allowEmptyBody = false,
  children,
  className,
}: Props) {
  return (
    <section
      className={`ff-collapse-panel${expanded ? '' : ' ff-collapse-panel--collapsed'}${className ? ` ${className}` : ''}`}
      aria-labelledby={sectionId}
    >
      <div className="ff-collapse-panel__card">
        <CollapsibleToggle
          id={sectionId}
          title={title}
          count={count}
          expanded={expanded}
          onClick={onToggle}
          className="ff-collapse-panel__toggle"
        />
        {expanded ? (
          <div className="ff-collapse-panel__body">
            {(count ?? 0) === 0 && !allowEmptyBody ? (
              <p className="ff-collapse-panel__empty">{emptyHint}</p>
            ) : (
              <>
                {(count ?? 0) === 0 && allowEmptyBody && emptyHint ? (
                  <p className="ff-collapse-panel__empty">{emptyHint}</p>
                ) : null}
                {children}
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
