import type { ReactNode } from 'react'
import { CrmButton } from '../ui/CrmButton'
import type { CollapsibleCardsVariant, HomeTaskSectionKey } from './stock/types'

type BlockProps = {
  sectionKey: string
  variant: CollapsibleCardsVariant
  title: string
  taskCount: number
  expanded: boolean
  onToggle: () => void
  content: ReactNode
}

export function CollapsibleCardsBlock({
  sectionKey,
  variant,
  title,
  taskCount,
  expanded,
  onToggle,
  content,
}: BlockProps) {
  const idTitle = `crm-cards-block-${sectionKey}`
  const idPanel = `${idTitle}-panel`
  return (
    <section
      className={`crm-tasks-block crm-tasks-block--${variant} crm-tasks-block--cards${
        expanded ? '' : ' crm-tasks-block--collapsed'
      }`.trim()}
      aria-labelledby={idTitle}
    >
      <CrmButton
        variant="collapsibleTitle"
        id={idTitle}
        aria-expanded={expanded}
        aria-controls={idPanel}
        onClick={onToggle}
      >
        <span className="crm-btn__chev" aria-hidden>
          {expanded ? '▼' : '▶'}
        </span>
        <span className="crm-btn__label">{title}</span>
        {taskCount > 0 ? (
          <span className="crm-btn__count">{taskCount}</span>
        ) : null}
      </CrmButton>
      <div id={idPanel} className="crm-tasks-block__panel" hidden={!expanded}>
        {content}
      </div>
    </section>
  )
}

type HomeTaskBlockProps = {
  sectionKey: HomeTaskSectionKey
  variant?: Exclude<CollapsibleCardsVariant, 'batches' | 'retail'>
  title: string
  taskCount: number
  expanded: boolean
  onToggle: () => void
  content: ReactNode
}

export function HomeTaskBlock({ variant = 'more', ...props }: HomeTaskBlockProps) {
  return <CollapsibleCardsBlock {...props} variant={variant} sectionKey={`home-${props.sectionKey}`} />
}
