import { type ReactNode } from 'react'
import './crm-page-toolbar.css'

export type CrmPageToolbarLayout = 'toolbar' | 'stacked' | 'block'
export type CrmPageToolbarDensity = 'page' | 'section'

export type CrmPageToolbarProps = {
  title?: string
  titleId?: string
  lead?: ReactNode
  actions?: ReactNode
  /** toolbar — title/lead слева, кнопки справа; stacked — кнопки в строке с h1; block — классическая шапка. */
  layout?: CrmPageToolbarLayout
  /** section — компактный lead во вкладках склада. */
  density?: CrmPageToolbarDensity
  /** Меньший lead (как на странице «Цены»). */
  leadCompact?: boolean
  className?: string
}

function joinClasses(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ')
}

function leadClassName(leadCompact?: boolean) {
  return joinClasses(
    'flowers-page__lead',
    'crm-page-toolbar__lead',
    leadCompact && 'crm-page-toolbar__lead--compact',
  )
}

function resolveLayout(
  layout: CrmPageToolbarLayout | undefined,
  hasActions: boolean,
): CrmPageToolbarLayout {
  if (layout) return layout
  return hasActions ? 'toolbar' : 'block'
}

export function CrmPageToolbar({
  title,
  titleId,
  lead,
  actions,
  layout: layoutProp,
  density = 'page',
  leadCompact,
  className,
}: CrmPageToolbarProps) {
  const hasActions = actions != null
  const layout = resolveLayout(layoutProp, hasActions)
  const section = density === 'section'

  if (layout === 'block') {
    return (
      <header className={joinClasses('crm-page-toolbar', 'crm-page-toolbar--block', 'flowers-page__header', className)}>
        {title ? (
          <h1 id={titleId} className="flowers-page__title">
            {title}
          </h1>
        ) : null}
        {lead ? <div className={leadClassName(leadCompact)}>{lead}</div> : null}
      </header>
    )
  }

  if (layout === 'stacked') {
    return (
      <header
        className={joinClasses('crm-page-toolbar', 'crm-page-toolbar--stacked', 'tasks-page__head', className)}
      >
        <div className="crm-page-toolbar__row">
          {title ? (
            <h1 id={titleId} className="flowers-page__title">
              {title}
            </h1>
          ) : null}
          {hasActions ? <div className="crm-page-toolbar__actions">{actions}</div> : null}
        </div>
        {lead ? <div className={leadClassName(leadCompact)}>{lead}</div> : null}
      </header>
    )
  }

  return (
    <div
      className={joinClasses(
        'crm-page-toolbar',
        'crm-page-toolbar--toolbar',
        section && 'crm-page-toolbar--section',
        className,
      )}
    >
      <header
        className={joinClasses('crm-page-toolbar__main', title || !section ? 'flowers-page__header' : undefined)}
      >
        {title ? (
          <h1 id={titleId} className="flowers-page__title">
            {title}
          </h1>
        ) : null}
        {lead ? <div className={leadClassName(leadCompact || section)}>{lead}</div> : null}
      </header>
      {hasActions ? <div className="crm-page-toolbar__actions">{actions}</div> : null}
    </div>
  )
}
