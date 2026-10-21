import './crm-page-status.css'

export type CrmPageStatusVariant = 'panel' | 'banner' | 'text'

export type CrmPageStatusProps = {
  error?: string | null
  /** Несколько сообщений об ошибке (напр. загрузка и форма на TasksPage). */
  errors?: Array<string | null | undefined>
  loading?: boolean
  loadingText?: string
  variant?: CrmPageStatusVariant
  className?: string
}

function joinClasses(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ')
}

function collectErrors(error: string | null | undefined, errors?: Array<string | null | undefined>) {
  const list: string[] = []
  if (errors) {
    for (const e of errors) {
      if (e) list.push(e)
    }
  }
  if (error) list.push(error)
  return list
}

function statusClasses(variant: CrmPageStatusVariant, kind: 'error' | 'loading', className?: string) {
  const variantClass =
    variant === 'panel'
      ? 'crm-page-status--panel'
      : variant === 'banner'
        ? 'crm-page-status--banner'
        : 'crm-page-status--text'
  return joinClasses(
    'crm-page-status',
    variantClass,
    kind === 'error' ? 'crm-page-status--error' : undefined,
    className,
  )
}

export function CrmPageStatus({
  error,
  errors,
  loading,
  loadingText = 'Загрузка…',
  variant = 'panel',
  className,
}: CrmPageStatusProps) {
  const errList = collectErrors(error, errors)
  const hasError = errList.length > 0

  return (
    <>
      {errList.map((msg, i) => (
        <p key={i} className={statusClasses(variant, 'error', className)} role="alert">
          {msg}
        </p>
      ))}
      {loading && !hasError ? (
        <p
          className={statusClasses(variant, 'loading', className)}
          aria-busy={variant !== 'panel' ? true : undefined}
          aria-live={variant === 'panel' ? undefined : 'polite'}
        >
          {loadingText}
        </p>
      ) : null}
    </>
  )
}

/** Классы панели для подсказок на странице (пустой каталог, «ничего не найдено»). */
export function crmPageStatusPanelClass(extra?: string) {
  return joinClasses('crm-page-status', 'crm-page-status--panel', extra)
}
