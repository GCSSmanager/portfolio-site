import { useCallback, useState, type ReactNode } from 'react'
import { CrmConfirmDialog } from '../components/ui/CrmConfirmDialog'

export type CrmConfirmOptions = {
  title: string
  message?: ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
}

/** Запрос подтверждения через CrmConfirmDialog вместо window.confirm. */
export function useCrmConfirm() {
  const [pending, setPending] = useState<CrmConfirmOptions | null>(null)
  const [busy, setBusy] = useState(false)

  const ask = useCallback((options: CrmConfirmOptions) => {
    setPending(options)
  }, [])

  const close = useCallback(() => {
    if (!busy) setPending(null)
  }, [busy])

  const handleConfirm = useCallback(async () => {
    if (!pending) return
    setBusy(true)
    try {
      await pending.onConfirm()
      setPending(null)
    } finally {
      setBusy(false)
    }
  }, [pending])

  const dialog = (
    <CrmConfirmDialog
      open={pending != null}
      title={pending?.title ?? ''}
      message={pending?.message}
      confirmLabel={pending?.confirmLabel ?? 'Подтвердить'}
      danger={pending?.danger ?? true}
      busy={busy}
      onClose={close}
      onConfirm={() => void handleConfirm()}
    />
  )

  return { ask, dialog, busy, close }
}
