import { CrmButton } from './CrmButton'

type Props = {
  onClick: () => void
  label?: string
}

export function CrmModalClose({ onClick, label = 'Закрыть' }: Props) {
  return (
    <CrmButton
      variant="custom"
      className="crm-modal__close"
      onClick={onClick}
      aria-label={label}
      tabIndex={-1}
    >
      ×
    </CrmButton>
  )
}
