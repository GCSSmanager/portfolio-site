import { type FormEvent, useEffect, useState } from 'react'
import { CrmButton } from '../../components/ui/CrmButton'
import { CrmModal } from '../../components/ui/CrmModal'
import { CrmInlineQtyField, CrmMoneyField, CrmPickField } from '../warehouse'
import { formatRub } from '../../utils/formatMoney'
import {
  formatMoneyInputValue,
  isMoneyInputBad,
  parseMoneyInput,
} from '../../utils/crmInput'
import { PAYMENT_TYPE_OPTIONS } from '../../utils/paymentType'
import { cartItemsTotal, realizationMaxForItem, type SalesCartItem } from './saleCart'

type Props = {
  open: boolean
  items: SalesCartItem[]
  paymentType: string
  busy: boolean
  error: string | null
  onClose: () => void
  onPaymentTypeChange: (v: string) => void
  onRemove: (id: string) => void
  onUpdateQty: (id: string, qty: number) => void
  onUpdatePrice: (id: string, unitPrice: number) => void
  onUpdateRealization: (id: string, realizationQty: number) => void
  onConfirm: () => void
}

export function SalesCheckoutModal({
  open,
  items,
  paymentType,
  busy,
  error,
  onClose,
  onPaymentTypeChange,
  onRemove,
  onUpdateQty,
  onUpdatePrice,
  onUpdateRealization,
  onConfirm,
}: Props) {
  const total = cartItemsTotal(items)
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({})
  const [realizationDrafts, setRealizationDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    const prices: Record<string, string> = {}
    const realizations: Record<string, string> = {}
    for (const item of items) {
      prices[item.id] = formatMoneyInputValue(item.unitPrice)
      realizations[item.id] =
        item.realizationQty > 0 ? String(item.realizationQty) : ''
    }
    setPriceDrafts(prices)
    setRealizationDrafts(realizations)
  }, [open, items])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onConfirm()
  }

  return (
    <CrmModal
      open={open}
      onClose={onClose}
      title="Оплата"
      width="2xl"
      boxClassName="crm-modal__box--scroll"
      busy={busy}
      portal
      onSubmit={handleSubmit}
      className="crm-modal--sales-checkout"
    >
      {error ? (
        <p className="crm-field__error" role="alert">
          {error}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="crm-sale-empty">Корзина пуста.</p>
      ) : (
        <>
          <ul className="sales-cart__list sales-cart__list--checkout">
            {items.map((item) => {
              const realizationMax = realizationMaxForItem(item)
              return (
                <li key={item.id} className="sales-cart__row">
                  <div className="sales-cart__row-main">
                    <p className="sales-cart__name">{item.name}</p>
                    <div className="sales-cart__edit-row">
                      <CrmInlineQtyField
                        wrapperClass="crm-delivery-lines__qty crm-delivery-lines__qty--inline"
                        min={1}
                        aria-label={`Количество ${item.name}`}
                        value={String(item.qty)}
                        disabled={busy}
                        onChange={(e) => {
                          const n = Number.parseInt(e.target.value, 10)
                          if (Number.isFinite(n) && n >= 1) onUpdateQty(item.id, n)
                        }}
                        suffix={
                          <span className="crm-delivery-lines__suffix">
                            / {item.maxStock} шт
                          </span>
                        }
                      />
                      <CrmMoneyField
                        label="Цена, ₽/шт"
                        wrapperClass="crm-field sales-cart__price-field"
                        invalid={isMoneyInputBad(priceDrafts[item.id] ?? '')}
                        value={priceDrafts[item.id] ?? formatMoneyInputValue(item.unitPrice)}
                        disabled={busy}
                        onChange={(e) => {
                          const v = e.target.value
                          setPriceDrafts((prev) => ({ ...prev, [item.id]: v }))
                          const p = parseMoneyInput(v)
                          if (p !== null && p !== 'bad' && p > 0) onUpdatePrice(item.id, p)
                        }}
                      />
                      {realizationMax > 0 ? (
                        <CrmInlineQtyField
                          wrapperClass="crm-delivery-lines__qty crm-delivery-lines__qty--inline sales-cart__real-field"
                          min={0}
                          aria-label={`С реализации ${item.name}`}
                          value={realizationDrafts[item.id] ?? ''}
                          disabled={busy}
                          onChange={(e) => {
                            const v = e.target.value
                            setRealizationDrafts((prev) => ({ ...prev, [item.id]: v }))
                            const raw = v.trim()
                            const rq = raw === '' ? 0 : Number.parseInt(raw, 10)
                            if (Number.isFinite(rq) && rq >= 0) {
                              onUpdateRealization(item.id, rq)
                            }
                          }}
                          suffix={
                            <span className="crm-delivery-lines__suffix">
                              реал. макс {realizationMax}
                            </span>
                          }
                        />
                      ) : null}
                    </div>
                  </div>
                  <p className="sales-cart__sum">{formatRub(String(item.qty * item.unitPrice))}</p>
                  <CrmButton
                    variant="deliveryLineRemove"
                    title="Убрать"
                    aria-label={`Убрать ${item.name}`}
                    disabled={busy}
                    onClick={() => onRemove(item.id)}
                  >
                    ×
                  </CrmButton>
                </li>
              )
            })}
          </ul>
          <p className="crm-sale-total">
            Итого: <strong>{formatRub(String(total))}</strong>
          </p>
          <CrmPickField
            label="Тип оплаты"
            value={paymentType}
            options={PAYMENT_TYPE_OPTIONS}
            onChange={onPaymentTypeChange}
            disabled={busy}
            placeholder="Выберите способ оплаты…"
          />
          <CrmModal.Actions
            submitLabel="Подтвердить оплату"
            submitDisabled={busy || !paymentType || items.length < 1}
            submitBusy={busy}
          />
        </>
      )}
    </CrmModal>
  )
}
