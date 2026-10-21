import {
  type CSSProperties,
  type FormEventHandler,
  type FormHTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
} from 'react'
import { createPortal } from 'react-dom'
import '../../pages/warehouse/stock/modal-shell-taxons.css'
import { refreshBodyScrollLock } from '../../utils/bodyScrollLock'
import { CrmButton } from './CrmButton'
import { CrmModalClose } from './CrmModalClose'

/** 3% отступ с каждой стороны viewport (итого 94vw). */
export const CRM_MODAL_VIEWPORT_WIDTH = '94vw'

function modalWidth(maxRem: string): string {
  return `min(${maxRem}, ${CRM_MODAL_VIEWPORT_WIDTH})`
}

export const CRM_MODAL_WIDTH = {
  sm: modalWidth('24rem'),
  md: modalWidth('32rem'),
  lg: modalWidth('40rem'),
  xl: modalWidth('44rem'),
  sale: modalWidth('38rem'),
  '2xl': modalWidth('56rem'),
  '3xl': modalWidth('68rem'),
  '4xl': modalWidth('80rem'),
  '5xl': modalWidth('96rem'),
} as const

export type CrmModalWidth = keyof typeof CRM_MODAL_WIDTH

function resolveWidth(width: CrmModalWidth | string | undefined): string {
  if (width == null) return CRM_MODAL_WIDTH.md
  if (width in CRM_MODAL_WIDTH) return CRM_MODAL_WIDTH[width as CrmModalWidth]
  return width
}

type CrmModalProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Ширина: пресет (`sm`…`5xl`) или CSS-строка `min(…)`. */
  width?: CrmModalWidth | string
  titleId?: string
  busy?: boolean
  /** Доп. классы на `<dialog>` (например `crm-modal--waste`). */
  className?: string
  /** Доп. классы на оболочку контента (`crm-modal__box--scroll`). */
  boxClassName?: string
  /** Рендер в `document.body` (для вложенных overflow). */
  portal?: boolean
  /** Если задан — контент оборачивается в `<form class="crm-form crm-form--tight">`. */
  onSubmit?: FormEventHandler<HTMLFormElement>
  /** Доп. класс формы (например `login-form`). */
  formClassName?: string
  /** Атрибуты `<form>` (action, method, autoComplete и т.д.). */
  formProps?: FormHTMLAttributes<HTMLFormElement>
  /** Класс обёртки, когда формы нет (только вёрстка полей). */
  bodyClassName?: string
  /** Кнопки справа в шапке, перед крестиком закрытия. */
  headActions?: ReactNode
  children: ReactNode
}

type CrmModalActionsProps = {
  submitLabel?: string
  submitDisabled?: boolean
  submitBusy?: boolean
  children?: ReactNode
}

function CrmModalActions({
  submitLabel,
  submitDisabled = false,
  submitBusy = false,
  children,
}: CrmModalActionsProps) {
  if (children != null) {
    return <div className="crm-modal__actions">{children}</div>
  }
  return (
    <div className="crm-modal__actions">
      {submitLabel != null ? (
        <CrmButton variant="primary" type="submit" disabled={submitDisabled || submitBusy}>
          {submitBusy ? '…' : submitLabel}
        </CrmButton>
      ) : null}
    </div>
  )
}

function CrmModalRoot({
  open,
  onClose,
  title,
  width = 'md',
  titleId: titleIdProp,
  busy = false,
  className,
  boxClassName,
  portal = false,
  onSubmit,
  formClassName,
  formProps,
  bodyClassName,
  headActions,
  children,
}: CrmModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  /** Не закрывать по клику на backdrop сразу после showModal() — тот же клик, что открыл окно. */
  const suppressBackdropCloseUntil = useRef(0)
  const autoTitleId = useId()
  const titleId = titleIdProp ?? autoTitleId.replace(/:/g, '')

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open) {
      if (!el.open) {
        el.showModal()
        suppressBackdropCloseUntil.current = Date.now() + 400
      }
    } else if (el.open) {
      el.close()
    }
    refreshBodyScrollLock()
    return () => {
      if (el.open) {
        el.close()
      }
      refreshBodyScrollLock()
    }
  }, [open])

  const requestClose = useCallback(() => {
    if (busy) return
    dialogRef.current?.close()
  }, [busy])

  const handleDialogClose = useCallback(() => {
    onClose()
  }, [onClose])

  const dialogStyle: CSSProperties = {
    boxSizing: 'border-box',
    width: resolveWidth(width),
  }

  const boxClass = ['crm-modal__box', 'crm-modal__box--scroll', boxClassName].filter(Boolean).join(' ')
  const dialogClass = ['crm-modal', className].filter(Boolean).join(' ')
  const formClass = ['crm-form', 'crm-form--tight', formClassName].filter(Boolean).join(' ')

  const scrollContent =
    onSubmit != null ? (
      <form className={formClass} onSubmit={onSubmit} {...formProps}>
        {children}
      </form>
    ) : bodyClassName != null ? (
      <div className={bodyClassName}>{children}</div>
    ) : (
      children
    )

  const widthPreset =
    width != null && typeof width === 'string' && width in CRM_MODAL_WIDTH
      ? width
      : undefined

  const dialogEl = (
    <dialog
      ref={dialogRef}
      className={dialogClass}
      data-modal-width={widthPreset}
      aria-labelledby={titleId}
      style={dialogStyle}
      onClose={handleDialogClose}
      onClick={(ev) => {
        if (Date.now() < suppressBackdropCloseUntil.current) return
        if (ev.target === dialogRef.current) requestClose()
      }}
    >
      <div className={boxClass}>
        <div className="crm-modal__head">
          <h2 id={titleId} className="crm-modal__title">
            {title}
          </h2>
          <div className="crm-modal__head-end">
            {headActions}
            <CrmModalClose onClick={requestClose} />
          </div>
        </div>
        <div className="crm-modal__body-scroll">{scrollContent}</div>
      </div>
    </dialog>
  )

  if (portal) {
    return createPortal(dialogEl, document.body)
  }
  return dialogEl
}

export const CrmModal = Object.assign(CrmModalRoot, {
  Actions: CrmModalActions,
  WIDTH: CRM_MODAL_WIDTH,
})

export type { CrmModalProps, CrmModalActionsProps }
