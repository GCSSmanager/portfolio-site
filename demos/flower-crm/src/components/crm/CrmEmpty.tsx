import { CrmButton } from '../ui/CrmButton'

type Props = {
  /** Если не передан — нет кнопки «Новый приход» (флорист). */
  onOpen?: () => void
  onPlanDelivery?: () => void
}

export function CrmEmpty({ onOpen, onPlanDelivery }: Props) {
  const canReceive = Boolean(onOpen)
  return (
    <div className="crm-empty crm-empty--minimal">
      <p className="crm-empty__title">Нет партий</p>
      <p className="crm-empty__text">
        {canReceive ? (
          <>
            Добавьте приход через «Новый приход»: укажите виды, количество и цену за штуку по строкам.
            {onPlanDelivery
              ? ' Запланируйте привоз от поставщика — в день привоза появится задача «принять поставку».'
              : ''}
          </>
        ) : (
          <>Остатки и партии появятся после прихода, который оформляет владелец магазина.</>
        )}
      </p>
      {canReceive ? (
        <div className="crm-empty__actions">
          <CrmButton variant="empty" onClick={onOpen}>
            Новый приход
          </CrmButton>
          {onPlanDelivery ? (
            <CrmButton variant="emptySecondary" onClick={onPlanDelivery}>
              Сделать поставку
            </CrmButton>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
