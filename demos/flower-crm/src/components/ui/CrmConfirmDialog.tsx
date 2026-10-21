import type { ReactNode } from 'react'
import { CrmButton } from './CrmButton'
import { CrmModal } from './CrmModal'
import './crm-confirm-dialog.css'

export type CrmConfirmDialogProps = {
  open: boolean
  title: string
  message?: ReactNode
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  portal?: boolean
  onClose: () => void
  onConfirm: () => void
}

/** Компактное подтверждение (ширина sm, вписывается в viewport). */
export function CrmConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Подтвердить',
  danger = false,
  busy = false,
  portal = true,
  onClose,
  onConfirm,
}: CrmConfirmDialogProps) {
  return (
    <CrmModal
      open={open}
      onClose={onClose}
      title={title}
      width="sm"
      busy={busy}
      portal={portal}
      className="crm-confirm-dialog"
    >
      {message != null ? <p className="crm-confirm-dialog__message">{message}</p> : null}
      <div className="crm-modal__actions">
        <CrmButton variant={danger ? 'danger' : 'primary'} disabled={busy} onClick={onConfirm}>
          {busy ? '…' : confirmLabel}
        </CrmButton>
      </div>
    </CrmModal>
  )
}
