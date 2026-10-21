import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CrmButton } from '../../components/ui/CrmButton'
import { CrmModal } from '../../components/ui/CrmModal'
import {
  CrmInlineQtyField,
  CrmMoneyField,
  CrmQtyField,
  type SaleStockOption,
} from '../warehouse'
import {
  formatMoneyInputValue,
  isMoneyInputBad,
  isRequiredMoneyReady,
  parseMoneyInput,
  parseStoredMoney,
} from '../../utils/crmInput'
import type { SalesCartItem } from './saleCart'

type Props = {
  open: boolean
  product: SaleStockOption | null
  editingItem: SalesCartItem | null
  busy: boolean
  onClose: () => void
  onSave: (qty: number, unitPrice: number, realizationQty: number) => void
  /** Только при редактировании позиции уже в корзине. */
  onRemove?: () => void
}

export function SalesAddToCartModal({
  open,
  product,
  editingItem,
  busy,
  onClose,
  onSave,
  onRemove,
}: Props) {
  const [qty, setQty] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [realizationQty, setRealizationQty] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const isEdit = editingItem != null

  useEffect(() => {
    if (!open || !product) return
    setFormError(null)
    if (editingItem) {
      setQty(String(editingItem.qty))
      setUnitPrice(formatMoneyInputValue(editingItem.unitPrice))
      setRealizationQty(
        editingItem.realizationQty > 0 ? String(editingItem.realizationQty) : '',
      )
      return
    }
    setQty('1')
    setRealizationQty('')
    const catalog = parseStoredMoney(product.unit_price ?? null)
    setUnitPrice(catalog != null ? formatMoneyInputValue(catalog) : '')
  }, [open, product, editingItem])

  const realizationMax = useMemo(() => {
    if (!product || (product.realizationAvailable ?? 0) < 1) return 0
    const cap = product.realizationAvailable ?? 0
    const n = Number.parseInt(qty.trim(), 10)
    const saleN = Number.isFinite(n) && n >= 1 ? n : 0
    return Math.min(cap, saleN || cap)
  }, [product, qty])

  const priceCatalogMissing = Boolean(
    product && parseStoredMoney(product.unit_price ?? null) == null,
  )
  const priceOk = isRequiredMoneyReady(unitPrice)
  const priceNeedsManual = priceCatalogMissing && !priceOk
  const priceFieldInvalid = Boolean(product && isMoneyInputBad(unitPrice))
  const showRealization = realizationMax > 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!product) return
    const q = Number.parseInt(qty.trim(), 10)
    if (!Number.isFinite(q) || q < 1 || q > product.qty) {
      setFormError(`Количество — от 1 до ${product.qty} шт.`)
      return
    }
    let saleRq = 0
    const realizationCap = product.realizationAvailable ?? 0
    if (realizationCap > 0) {
      const raw = realizationQty.trim()
      saleRq = raw === '' ? 0 : Number.parseInt(raw, 10)
      if (!Number.isFinite(saleRq) || saleRq < 0 || saleRq > q || saleRq > realizationCap) {
        setFormError(`С реализации — от 0 до ${Math.min(realizationCap, q)} шт.`)
        return
      }
    }
    const priceParsed = parseMoneyInput(unitPrice)
    if (priceParsed === null || priceParsed === 'bad' || priceParsed <= 0) {
      setFormError('Укажите цену.')
      return
    }
    onSave(q, priceParsed, saleRq)
  }

  return (
    <CrmModal
      open={open}
      onClose={onClose}
      title={isEdit ? `Редактировать · ${product?.name ?? ''}` : product?.name ?? 'В корзину'}
      width="md"
      busy={busy}
      portal
      onSubmit={submit}
    >
      {!product ? null : (
        <>
          {formError ? (
            <p className="crm-field__error" role="alert">
              {formError}
            </p>
          ) : null}
          <p className="crm-sale-summary">
            {product.label}
            <span className="crm-sale-summary__meta">
              {' '}
              · на складе {product.qty.toLocaleString('ru-RU')} шт.
            </span>
          </p>
          <CrmMoneyField
            label="Цена, ₽/шт"
            wrapperClass={`crm-field crm-field--sale-price${
              priceNeedsManual ? ' crm-field--sale-price-miss' : ''
            }`.trim()}
            invalid={priceFieldInvalid}
            placeholder="—"
            value={unitPrice}
            disabled={busy}
            onChange={(e) => setUnitPrice(e.target.value)}
          />
          {priceNeedsManual ? (
            <p className="crm-sale-warning" role="status">
              Цена не задана — укажите вручную.
            </p>
          ) : null}
          <CrmQtyField
            label="Количество"
            min={1}
            value={qty}
            disabled={busy}
            onChange={(e) => setQty(e.target.value)}
            required
          />
          {showRealization ? (
            <div className="crm-realization-block crm-realization-block--sale">
              <div className="crm-realization-block__qty-row">
                <span className="crm-realization-block__label">
                  С реализации
                  <span className="crm-realization-block__hint"> (макс. {realizationMax})</span>
                </span>
                <CrmInlineQtyField
                  wrapperClass="crm-delivery-lines__qty crm-delivery-lines__qty--inline"
                  min={0}
                  aria-label="С реализации"
                  value={realizationQty}
                  disabled={busy}
                  onChange={(e) => setRealizationQty(e.target.value)}
                  suffix={<span className="crm-delivery-lines__suffix">шт</span>}
                />
              </div>
            </div>
          ) : null}
          {isEdit && onRemove != null ? (
            <div className="sales-add-modal__remove">
              <CrmButton
                type="button"
                variant="tasksModalDel"
                disabled={busy}
                onClick={() => onRemove()}
              >
                Удалить из корзины
              </CrmButton>
            </div>
          ) : null}
          <CrmModal.Actions
            submitLabel={isEdit ? 'Сохранить' : 'Добавить в корзину'}
            submitDisabled={busy}
            submitBusy={busy}
          />
        </>
      )}
    </CrmModal>
  )
}
