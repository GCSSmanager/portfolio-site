import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../../api/apiFetch'
import { applyPhoneFieldChange, digitsFromPhoneInput, formatRuPhoneMasked } from '../../../auth/phoneInput'
import { CrmButton } from '../../ui/CrmButton'
import { CrmModal } from '../../ui/CrmModal'
import {
  CrmDateTimeField,
  CrmField,
  CrmInlineQtyField,
  CrmListSearch,
  CrmMoneyField,
  CrmPickField,
  CrmQtyField,
  saleStockOptionsToListSearch,
  type CrmPickOption,
  type SaleStockOption,
} from '../../../pages/warehouse'
import {
  formatMoneyInputValue,
  isMoneyInputBad,
  isRequiredMoneyReady,
  parseStoredMoney,
} from '../../../utils/crmInput'
import { formatRubFixed2, formatRubNumber, parseAmount } from '../../../utils/formatMoney'
import { isUpstreamErrorStatus } from '../../../utils/networkError'
import {
  isScheduledAtInputBad,
  isScheduledAtSubmitReady,
  scheduledAtInputBadMessage,
  todayDdMmYyMask,
} from '../../../utils/receivedAtRuInput'
import { PAYMENT_TYPE_OPTIONS } from '../../../utils/paymentType'
import {
  isOrderPickupDelivery,
  ORDER_PICKUP_SERVICE_LABEL,
  ORDER_PICKUP_SERVICE_VALUE,
} from '../../../utils/orderDelivery'
import { newSaleModalLine, type SaleModalLineRow } from './saleModalLines'
import { areAllSaleModalLinesComplete, isSaleModalLineRealizationInvalid } from './saleModalValidation'
import type { StoreFlowerStockBreakdown } from '../../../utils/bouquetAssembleRealization'

type DeliveryServiceOpt = { id: number; name: string; city_delivery_price: string | null }

type Props = {
  open: boolean
  hasSaleStock: boolean
  orderFormError: string | null
  showLineErrors: boolean
  orderInvalidField: 'lines' | 'service' | 'phone' | 'address' | 'scheduled' | 'payment' | null
  orderPaymentType: string
  onOrderPaymentTypeChange: (v: string) => void
  saleStockOptions: SaleStockOption[]
  storeFlowerStockBySf: Map<number, StoreFlowerStockBreakdown>
  orderLines: SaleModalLineRow[]
  onSetOrderLines: Dispatch<SetStateAction<SaleModalLineRow[]>>
  orderBusy: boolean
  deliveryServiceId: string
  customerPhone: string
  deliveryAddress: string
  scheduledDate: string
  scheduledTime: string
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  onDeliveryServiceIdChange: (v: string) => void
  onCustomerPhoneChange: (v: string) => void
  onDeliveryAddressChange: (v: string) => void
  onScheduledDateChange: (v: string) => void
  onScheduledTimeChange: (v: string) => void
}

export function OrderModal({
  open,
  hasSaleStock,
  orderFormError,
  showLineErrors,
  orderInvalidField,
  saleStockOptions,
  storeFlowerStockBySf,
  orderLines,
  onSetOrderLines,
  orderBusy,
  deliveryServiceId,
  customerPhone,
  deliveryAddress,
  scheduledDate,
  scheduledTime,
  onClose,
  onSubmit,
  onDeliveryServiceIdChange,
  onCustomerPhoneChange,
  onDeliveryAddressChange,
  onScheduledDateChange,
  onScheduledTimeChange,
  orderPaymentType,
  onOrderPaymentTypeChange,
}: Props) {
  const [services, setServices] = useState<DeliveryServiceOpt[] | null>(null)
  const [servicesError, setServicesError] = useState<string | null>(null)
  const [phoneDigits, setPhoneDigits] = useState('')

  const stockListOptions = useMemo(
    () => saleStockOptionsToListSearch(saleStockOptions),
    [saleStockOptions],
  )

  useEffect(() => {
    if (!open) return
    setServicesError(null)
    setPhoneDigits(digitsFromPhoneInput(customerPhone))
    void apiFetch('/api/me/delivery-services/')
      .then((res) => {
        if (res.status === 401) throw new Error('Сессия недействительна. Войдите снова.')
        if (!res.ok && isUpstreamErrorStatus(res.status)) return null
        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        return res.json() as Promise<{ delivery_services: DeliveryServiceOpt[] }>
      })
      .then((data) => {
        if (!data) return
        setServices(data.delivery_services)
        if (data.delivery_services.length === 1 && !deliveryServiceId) {
          onDeliveryServiceIdChange(String(data.delivery_services[0].id))
        }
      })
      .catch((e: unknown) => {
        setServices([])
        setServicesError(e instanceof Error ? e.message : 'Не удалось загрузить сервисы доставки')
      })
  }, [open, deliveryServiceId, onDeliveryServiceIdChange, customerPhone])

  const setRow = (rowKey: number, patch: Partial<SaleModalLineRow>) => {
    onSetOrderLines((prev) => prev.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)))
  }

  const allLinesComplete = useMemo(
    () => areAllSaleModalLinesComplete(orderLines, saleStockOptions, storeFlowerStockBySf),
    [orderLines, saleStockOptions, storeFlowerStockBySf],
  )

  const isPickup = isOrderPickupDelivery(deliveryServiceId)

  const servicePickOptions = useMemo((): CrmPickOption[] => {
    const pickup: CrmPickOption = {
      value: ORDER_PICKUP_SERVICE_VALUE,
      label: ORDER_PICKUP_SERVICE_LABEL,
      meta: '0 ₽',
    }
    const fromApi = (services ?? []).map((s) => ({
      value: String(s.id),
      label: s.name,
      meta:
        s.city_delivery_price != null && s.city_delivery_price !== ''
          ? formatRubNumber(parseAmount(s.city_delivery_price))
          : undefined,
    }))
    return [pickup, ...fromApi]
  }, [services])

  const selectedService = useMemo(
    () => services?.find((s) => String(s.id) === deliveryServiceId) ?? null,
    [services, deliveryServiceId],
  )

  const deliveryPrice = useMemo(() => {
    if (isPickup) return 0
    if (!selectedService) return 0
    return parseAmount(selectedService.city_delivery_price ?? '0')
  }, [isPickup, selectedService])

  const productTotal = useMemo(() => {
    let sum = 0
    for (const row of orderLines) {
      const line = saleStockOptions.find((o) => o.key === row.lineKey)
      if (!line) continue
      const q = Number.parseInt(row.qty.trim(), 10)
      const p = Number.parseFloat(row.unitPrice.replace(',', '.'))
      if (Number.isFinite(q) && q >= 1 && Number.isFinite(p) && p > 0) {
        sum += q * p
      }
    }
    return sum > 0 ? sum : null
  }, [orderLines, saleStockOptions])

  const grandTotal = productTotal !== null ? productTotal + deliveryPrice : null

  const scheduledBad = isScheduledAtInputBad(scheduledDate, scheduledTime)
  const scheduledError = scheduledAtInputBadMessage(scheduledDate, scheduledTime)
  const scheduledReady = isScheduledAtSubmitReady(scheduledDate, scheduledTime)

  const servicesReady = services !== null
  const addressOk = isPickup || deliveryAddress.trim().length > 0
  const serviceOk = Boolean(deliveryServiceId)
  const phoneOk = phoneDigits.length >= 11

  const phoneDisplay = formatRuPhoneMasked(phoneDigits)

  return (
    <CrmModal
      open={open}
      onClose={onClose}
      title="Новый заказ"
      width="2xl"
      busy={orderBusy}
      onSubmit={hasSaleStock && servicesReady ? onSubmit : undefined}
    >
      {!hasSaleStock ? (
        <p className="crm-sale-empty">На складе нет позиций с ненулевым остатком.</p>
      ) : !servicesReady ? (
        <p className="crm-sale-empty">{servicesError ?? 'Загрузка сервисов доставки…'}</p>
      ) : (
        <>
          {orderFormError ? (
            <p className="crm-field__error" role="alert">
              {orderFormError}
            </p>
          ) : null}
          <div className={`crm-field${showLineErrors ? ' crm-field--invalid' : ''}`.trim()}>
            <span className="crm-field__lab">Состав заказа</span>
            <ul
              className={`crm-delivery-lines crm-delivery-lines--grid-cards crm-delivery-lines--sale${
                showLineErrors ? ' crm-delivery-lines--invalid' : ''
              }`.trim()}
            >
              {orderLines.map((row) => {
                const line = saleStockOptions.find((o) => o.key === row.lineKey) ?? null
                const priceCatalogMissing = Boolean(
                  line && parseStoredMoney(line.unit_price ?? null) == null,
                )
                const priceNeedsManual = priceCatalogMissing && !isRequiredMoneyReady(row.unitPrice)
                const priceFieldInvalid = Boolean(line && isMoneyInputBad(row.unitPrice))
                const realizationCap = line?.realizationAvailable ?? 0
                const q = Number.parseInt(row.qty.trim(), 10)
                const saleN = Number.isFinite(q) && q >= 1 ? q : 0
                const realizationMax =
                  realizationCap > 0 && line
                    ? Math.min(realizationCap, saleN || realizationCap)
                    : 0
                const showRealization = realizationMax > 0
                const realizationInvalid = isSaleModalLineRealizationInvalid(row, line ?? undefined)
                const realizationShowInvalid =
                  realizationInvalid &&
                  (showLineErrors || row.realizationQty.trim() !== '')

                return (
                  <li key={row.key} className="crm-delivery-lines__row crm-delivery-lines__row--stacked">
                    <div className="crm-sale-line-fields">
                      <label className="crm-field">
                        <span className="crm-field__lab">Позиция</span>
                        <CrmListSearch
                          options={stockListOptions}
                          selectedKey={row.lineKey}
                          onSelect={(key) => {
                            const k = key as typeof row.lineKey
                            const picked = saleStockOptions.find((o) => o.key === k)
                            const catalog = picked
                              ? parseStoredMoney(picked.unit_price ?? null)
                              : null
                            setRow(row.key, {
                              lineKey: k,
                              qty: '1',
                              realizationQty: '',
                              unitPrice:
                                catalog != null ? formatMoneyInputValue(catalog) : '',
                            })
                          }}
                          placeholder="Партия, вид, товар или букет…"
                          ariaLabel="Позиция на складе"
                          invalid={showLineErrors && !row.lineKey}
                          disabled={orderBusy}
                          emptyHint="Нет подходящих позиций"
                          openListOnFocus
                        />
                      </label>
                      <CrmMoneyField
                        label="Цена, ₽/шт"
                        wrapperClass={`crm-field crm-field--sale-price${
                          line && priceNeedsManual ? ' crm-field--sale-price-miss' : ''
                        }`.trim()}
                        invalid={showLineErrors && priceFieldInvalid}
                        placeholder="—"
                        value={row.unitPrice}
                        disabled={!line || orderBusy}
                        onChange={(e) => setRow(row.key, { unitPrice: e.target.value })}
                      />
                      {line && priceNeedsManual ? (
                        <p className="crm-sale-warning" role="status">
                          Цена не задана — укажите вручную.
                        </p>
                      ) : null}
                      <CrmQtyField
                        label="Количество"
                        min={1}
                        invalid={showLineErrors && Boolean(line && (!Number.isFinite(q) || q < 1))}
                        value={row.qty}
                        disabled={!line || orderBusy}
                        onChange={(e) => setRow(row.key, { qty: e.target.value })}
                        required
                      />
                      {showRealization ? (
                        <div className="crm-realization-block crm-realization-block--sale">
                          <div className="crm-realization-block__qty-row">
                            <span className="crm-realization-block__label">
                              Из них с реализации
                              <span className="crm-realization-block__hint">
                                {' '}
                                (макс. {realizationMax} шт.)
                              </span>
                            </span>
                            <CrmInlineQtyField
                              wrapperClass={`crm-delivery-lines__qty crm-delivery-lines__qty--inline${
                                realizationShowInvalid ? ' crm-delivery-lines__qty--invalid' : ''
                              }`}
                              min={0}
                              invalid={realizationShowInvalid}
                              aria-label="Количество с реализации"
                              value={row.realizationQty}
                              disabled={!line || orderBusy}
                              onChange={(e) =>
                                setRow(row.key, { realizationQty: e.target.value })
                              }
                              suffix={<span className="crm-delivery-lines__suffix">шт</span>}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <CrmButton
                      variant="deliveryLineRemove"
                      title="Убрать товар"
                      aria-label="Убрать товар"
                      disabled={orderLines.length < 2 || orderBusy}
                      onClick={() =>
                        onSetOrderLines((prev) =>
                          prev.length < 2 ? prev : prev.filter((r) => r.key !== row.key),
                        )
                      }
                    >
                      ×
                    </CrmButton>
                  </li>
                )
              })}
            </ul>
            <CrmButton
              variant="deliveryLineAdd"
              disabled={orderBusy || !allLinesComplete}
              onClick={() => onSetOrderLines((prev) => [...prev, newSaleModalLine()])}
            >
              + товар
            </CrmButton>
          </div>
          <CrmPickField
            label="Тип оплаты"
            value={orderPaymentType}
            options={PAYMENT_TYPE_OPTIONS}
            onChange={onOrderPaymentTypeChange}
            invalid={orderInvalidField === 'payment'}
            disabled={orderBusy}
            placeholder="Выберите способ оплаты…"
          />
          <CrmPickField
            label="Доставка"
            value={deliveryServiceId}
            options={servicePickOptions}
            onChange={(v) => {
              onDeliveryServiceIdChange(v)
              if (isOrderPickupDelivery(v)) onDeliveryAddressChange('')
            }}
            invalid={orderInvalidField === 'service'}
            disabled={orderBusy || services === null}
            placeholder="Выберите способ…"
          />
          <CrmField
            label="Телефон клиента"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 (900) 123-45-67"
            value={phoneDisplay}
            disabled={orderBusy}
            invalid={orderInvalidField === 'phone'}
            onChange={(e) => {
              const nextDigits = applyPhoneFieldChange(phoneDigits, phoneDisplay, e.target.value)
              setPhoneDigits(nextDigits)
              onCustomerPhoneChange(nextDigits)
            }}
          />
          {!isPickup ? (
            <label
              className={`crm-field${orderInvalidField === 'address' && !addressOk ? ' crm-field--invalid' : ''}`}
            >
              <span className="crm-field__lab">Адрес доставки</span>
              <textarea
                className="crm-field__input suppliers-page__textarea"
                rows={2}
                value={deliveryAddress}
                disabled={orderBusy}
                onChange={(e) => onDeliveryAddressChange(e.target.value)}
                placeholder="Улица, дом, подъезд…"
              />
            </label>
          ) : null}
          <CrmDateTimeField
            label={isPickup ? 'Дата и время выдачи' : 'Дата и время доставки'}
            dateValue={scheduledDate}
            timeValue={scheduledTime}
            onDateChange={onScheduledDateChange}
            onTimeChange={onScheduledTimeChange}
            invalid={orderInvalidField === 'scheduled' || scheduledBad}
            errorMessage={scheduledBad && scheduledDate.trim() ? scheduledError : null}
            dateAriaLabel="Дата доставки"
            timeAriaLabel="Время доставки"
            hint={
              isPickup
                ? todayDdMmYyMask()
                  ? `Без даты — выдача сегодня (${todayDdMmYyMask()})`
                  : 'Без даты — выдача сегодня'
                : todayDdMmYyMask()
                  ? `Без даты — доставка сегодня (${todayDdMmYyMask()})`
                  : 'Без даты — доставка сегодня'
            }
          />
          {productTotal !== null ? (
            <p className="crm-sale-total" aria-live="polite">
              Товар: <strong>{formatRubFixed2(productTotal)}</strong>
              {!isPickup && selectedService ? (
                <>
                  {' '}
                  · доставка: <strong>{formatRubFixed2(deliveryPrice)}</strong>
                </>
              ) : null}
            </p>
          ) : null}
          {grandTotal !== null ? (
            <p className="crm-sale-total crm-sale-total--grand" aria-live="polite">
              {isPickup ? (
                <>
                  Итого: <strong>{formatRubFixed2(grandTotal)}</strong>
                </>
              ) : (
                <>
                  Итого с доставкой: <strong>{formatRubFixed2(grandTotal)}</strong>
                </>
              )}
            </p>
          ) : null}
          <CrmModal.Actions
            submitLabel="Создать заказ"
            submitDisabled={
              !allLinesComplete ||
              !orderPaymentType ||
              !serviceOk ||
              !phoneOk ||
              !addressOk ||
              !scheduledReady ||
              orderBusy
            }
            submitBusy={orderBusy}
          />
        </>
      )}
    </CrmModal>
  )
}
