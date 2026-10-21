import { type ReactNode } from 'react'
import { CrmButton } from './CrmButton'
import './crm-row-actions.css'

const EDIT_ICON = '✎'
const DELETE_ICON = '×'

export type CrmRowActionsProps = {
  onEdit: () => void
  onDelete?: () => void
  editTitle?: string
  deleteTitle?: string
  /** Кнопки слева от ✎ / × (напр. «Оплатить» в таблице расходов). */
  leading?: ReactNode
  as?: 'span' | 'td'
  className?: string
}

function joinClasses(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ')
}

export function CrmRowActions({
  onEdit,
  onDelete,
  editTitle = 'Изменить',
  deleteTitle = 'Удалить',
  leading,
  as = 'span',
  className,
}: CrmRowActionsProps) {
  const buttons = (
    <>
      {leading}
      <CrmButton variant="rowEdit" title={editTitle} aria-label={editTitle} onClick={onEdit}>
        {EDIT_ICON}
      </CrmButton>
      {onDelete ? (
        <CrmButton variant="rowDel" title={deleteTitle} aria-label={deleteTitle} onClick={onDelete}>
          {DELETE_ICON}
        </CrmButton>
      ) : null}
    </>
  )

  if (as === 'td') {
    return (
      <td className={joinClasses('crm-row-actions__cell', className)}>
        <div className="crm-row-actions">{buttons}</div>
      </td>
    )
  }

  return <span className={joinClasses('crm-row-actions', className)}>{buttons}</span>
}
