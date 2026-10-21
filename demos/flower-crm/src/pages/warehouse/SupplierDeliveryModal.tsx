import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../api/apiFetch'
import { CrmButton } from '../../components/ui/CrmButton'
import { CrmModal } from '../../components/ui/CrmModal'
import { isUpstreamErrorStatus } from '../../utils/networkError'
import {
  combineLocalDateTime,
  isReceivedAtInputBad,
  isReceivedAtSubmitReady,
  localDateToIsoDate,
  receivedAtInputBadMessage,
  todayDdMmYyMask,
  validateReceivedAtInput,
} from '../../utils/receivedAtRuInput'
import {
  realizationPayloadFromLine,
  validateRealizationLine,
} from './SaleTermsFields'
import { formatUnitCostInput, newTaxonQtyLine, TaxonPickQtyRow, type TaxonQtyLineRow } from './TaxonPickQtyRow'

function deliveryLineIsIncomplete(ln: TaxonQtyLineRow, withSupplierFields: boolean): boolean {
  if (ln.taxon == null) return true
  if (!withSupplierFields) return false
  const q = Number.parseInt(ln.qty.trim(), 10)
  if (!Number.isFinite(q) || q < 1) return true
  return validateRealizationLine(ln, q) != null
}
import {
  isFlowerStockHit,
  isRetailStockHit,
  type StockSearchHit,
} from '../../utils/stockSearchQuery'
import { CrmDateTimeField } from './CrmField'
import { CrmListSearch } from './CrmListSearch'
import { parseMoneyInput, withCrmFieldInvalid } from '../../utils/crmInput'

type SupplierOpt = { id: number; name: string }

export function SupplierDeliveryModal({
  open,
  onClose,
  defaultSupplierId,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  defaultSupplierId?: number | null
  onCreated?: () => void
}) {
  const [suppliers, setSuppliers] = useState<SupplierOpt[] | null>(null)
  const [supplierId, setSupplierId] = useState<string>('')
  const [expectedDate, setExpectedDate] = useState('')
  const [expectedTime, setExpectedTime] = useState('')
  const [lines, setLines] = useState<TaxonQtyLineRow[]>(() => [newTaxonQtyLine()])
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  /** Какое поле подсветить рамкой (server — только текст сверху). */
  const [issueField, setIssueField] = useState<'supplier' | 'date' | 'lines' | 'server' | null>(null)

  useEffect(() => {
    if (!open) return
    setLocalError(null)
    setIssueField(null)
    void apiFetch('/api/me/suppliers/')
      .then((res) => {
        if (res.status === 401) throw new Error('Сессия недействительна. Войдите снова.')
        if (!res.ok && isUpstreamErrorStatus(res.status)) return null
        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        return res.json() as Promise<{ suppliers: { id: number; name: string }[] }>
      })
      .then((data) => {
        if (!data) return
        const opts = data.suppliers.map((s) => ({ id: s.id, name: s.name }))
        setSuppliers(opts)
        if (defaultSupplierId != null && opts.some((s) => s.id === defaultSupplierId)) {
          setSupplierId(String(defaultSupplierId))
        } else if (opts.length === 1) {
          setSupplierId(String(opts[0].id))
        } else {
          setSupplierId('')
        }
      })
      .catch((e: unknown) => {
        setSuppliers([])
        setLocalError(e instanceof Error ? e.message : 'Не удалось загрузить поставщиков')
        setIssueField('server')
      })

    setExpectedDate('')
    setExpectedTime('')
    setLines([newTaxonQtyLine()])
  }, [open, defaultSupplierId])

  const handleDialogClose = useCallback(() => {
    setLocalError(null)
    setIssueField(null)
    onClose()
  }, [onClose])

  const expectedAtBad = useMemo(
    () => isReceivedAtInputBad(expectedDate, expectedTime),
    [expectedDate, expectedTime],
  )
  const expectedAtReady = useMemo(
    () => isReceivedAtSubmitReady(expectedDate, expectedTime),
    [expectedDate, expectedTime],
  )
  const expectedAtError = useMemo(
    () => receivedAtInputBadMessage(expectedDate, expectedTime),
    [expectedDate, expectedTime],
  )

  const supplierSearchOptions = useMemo(
    () => (suppliers ?? []).map((s) => ({ key: String(s.id), title: s.name })),
    [suppliers],
  )

  const supplierChosen = useMemo(() => {
    const sid = Number.parseInt(supplierId, 10)
    return Number.isFinite(sid) && sid > 0
  }, [supplierId])

  const deliveryCompositionReady = useMemo(() => {
    if (!supplierChosen) return false
    if (lines.some((ln) => deliveryLineIsIncomplete(ln, true))) return false
    return lines.some((ln) => ln.taxon != null)
  }, [lines, supplierChosen])

  const hasIncompleteLine = useMemo(
    () => lines.some((ln) => deliveryLineIsIncomplete(ln, supplierChosen)),
    [lines, supplierChosen],
  )

  const supplierIdForTaxonSearch = useMemo(() => {
    const sid = Number.parseInt(supplierId, 10)
    return Number.isFinite(sid) && sid > 0 ? sid : null
  }, [supplierId])

  const setTaxon = (key: number, t: StockSearchHit | null) => {
    setLines((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row
        if (t == null) return { ...row, taxon: null, unitCost: '' }
        const nextPrice =
          isFlowerStockHit(t) &&
          t.unit_purchase_price != null &&
          Number.isFinite(t.unit_purchase_price)
            ? formatUnitCostInput(t.unit_purchase_price)
            : row.unitCost
        return { ...row, taxon: t, unitCost: nextPrice }
      }),
    )
  }

  const setQty = (key: number, qty: string) => {
    setLines((prev) => prev.map((row) => (row.key === key ? { ...row, qty } : row)))
  }

  const setUnitCost = (key: number, unitCost: string) => {
    setLines((prev) => prev.map((row) => (row.key === key ? { ...row, unitCost } : row)))
  }

  const setRealizationQty = (key: number, v: string) => {
    setLines((prev) => prev.map((row) => (row.key === key ? { ...row, realizationQty: v } : row)))
  }
  const setSaleTermsFixedPrice = (key: number, v: string) => {
    setLines((prev) => prev.map((row) => (row.key === key ? { ...row, saleTermsFixedPrice: v } : row)))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setIssueField(null)
    const sid = Number.parseInt(supplierId, 10)
    if (!Number.isFinite(sid)) {
      setLocalError('Выберите поставщика.')
      setIssueField('supplier')
      return
    }
    const datePart = expectedDate.trim() || todayDdMmYyMask()
    const recvCheck = validateReceivedAtInput(datePart, expectedTime.trim())
    if (recvCheck.ok === false) {
      setIssueField('date')
      return
    }
    const dt = combineLocalDateTime(datePart, expectedTime.trim())
    if (!dt || Number.isNaN(dt.getTime())) {
      setIssueField('date')
      return
    }
    const arrivalIso = localDateToIsoDate(dt)

    const bodyLines: Record<string, unknown>[] = []
    for (const ln of lines) {
      if (!ln.taxon) {
        setLocalError('Выберите товар в каждой строке или удалите пустую.')
        setIssueField('lines')
        return
      }
      const q = Number.parseInt(ln.qty.trim(), 10)
      if (!Number.isFinite(q) || q < 1) {
        setIssueField('lines')
        return
      }
      const termsErr = validateRealizationLine(ln, q)
      if (termsErr) {
        setLocalError(termsErr)
        setIssueField('lines')
        return
      }
      const unitPrice = parseMoneyInput(ln.unitCost)
      const priceStr = unitPrice != null ? String(unitPrice) : '0'
      const terms = realizationPayloadFromLine(ln)
      if (isRetailStockHit(ln.taxon)) {
        bodyLines.push({
          retail_product_id: ln.taxon.retail_product_id,
          quantity: q,
          unit_purchase_price: priceStr,
          ...terms,
        })
      } else if (isFlowerStockHit(ln.taxon)) {
        bodyLines.push({
          store_flower_id: ln.taxon.store_flower_id ?? ln.taxon.id,
          quantity: q,
          unit_purchase_price: priceStr,
          ...terms,
        })
      }
    }
    if (bodyLines.length === 0) {
      setLocalError('Добавьте хотя бы один вид и количество.')
      setIssueField('lines')
      return
    }
    setBusy(true)
    void apiFetch('/api/me/stock/supplier-deliveries/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: sid,
        expected_arrival_date: arrivalIso,
        lines: bodyLines,
      }),
    })
      .then((res) => {
        if (!res.ok && isUpstreamErrorStatus(res.status)) {
          return
        }
        if (!res.ok) {
          return res.json().then(
            (j: { error?: string }) => {
              throw new Error(j.error ?? `Ошибка ${res.status}`)
            },
            () => {
              throw new Error(`Ошибка ${res.status}`)
            },
          )
        }
        onClose()
        onCreated?.()
      })
      .catch((err: unknown) => {
        setLocalError(err instanceof Error ? err.message : 'Не удалось сохранить')
        setIssueField('server')
      })
      .finally(() => setBusy(false))
  }

  return (
    <CrmModal
      open={open}
      onClose={handleDialogClose}
      title="Сделать поставку"
      width="2xl"
      busy={busy}
      portal
      onSubmit={submit}
    >
      {localError ? (
            <p className="crm-field__error" role="alert">
              {localError}
            </p>
          ) : null}
          <label className={withCrmFieldInvalid(issueField === 'supplier', 'crm-field')}>
            <span className="crm-field__lab">Поставщик</span>
            <CrmListSearch
              options={supplierSearchOptions}
              selectedKey={supplierId}
              onSelect={(key) => {
                setSupplierId(key)
                setLines((prev) => prev.map((r) => ({ ...r, taxon: null, unitCost: '' })))
              }}
              placeholder="Название поставщика…"
              ariaLabel="Поиск поставщика"
              invalid={issueField === 'supplier'}
              disabled={suppliers === null || suppliers.length === 0}
              emptyHint="Нет подходящих поставщиков"
            />
          </label>
          <CrmDateTimeField
            label="Дата привоза"
            dateValue={expectedDate}
            timeValue={expectedTime}
            onDateChange={setExpectedDate}
            onTimeChange={setExpectedTime}
            invalid={issueField === 'date' || expectedAtBad}
            errorMessage={expectedAtError}
            dateAriaLabel="Дата привоза"
            timeAriaLabel="Время привоза (необязательно)"
            hint="Пусто — сегодня. Шесть цифр → ДД/ММ/ГГ. Время необязательно."
          />

          <div
            className={`crm-field${issueField === 'lines' ? ' crm-field--invalid' : ''}`.trim()}
          >
            <span className="crm-field__lab">Состав партии</span>
            <ul
              className={
                supplierIdForTaxonSearch != null
                  ? `crm-delivery-lines crm-delivery-lines--grid-cards crm-delivery-lines--with-unit-cost${
                      issueField === 'lines' ? ' crm-delivery-lines--invalid' : ''
                    }`.trim()
                  : `crm-delivery-lines crm-delivery-lines--grid-cards${
                      issueField === 'lines' ? ' crm-delivery-lines--invalid' : ''
                    }`.trim()
              }
            >
              {lines.map((ln) => (
                <li key={ln.key} className="crm-delivery-lines__row crm-delivery-lines__row--stacked">
                  <TaxonPickQtyRow
                    lineKey={ln.key}
                    taxon={ln.taxon}
                    qty={ln.qty}
                    unitCost={ln.unitCost}
                    quantityMin={1}
                    supplierId={supplierIdForTaxonSearch ?? undefined}
                    requireSupplierForSearch
                    showUnitCost={supplierIdForTaxonSearch != null}
                    showRealization={supplierIdForTaxonSearch != null}
                    realizationQty={ln.realizationQty}
                    saleTermsFixedPrice={ln.saleTermsFixedPrice}
                    onQtyChange={setQty}
                    onUnitCostChange={setUnitCost}
                    onRealizationQtyChange={setRealizationQty}
                    onSaleTermsFixedPriceChange={setSaleTermsFixedPrice}
                    useStockSearch
                    onTaxonChange={setTaxon}
                    showLineErrors={issueField === 'lines'}
                    openListOnFocus
                  />
                  <CrmButton
                    variant="deliveryLineRemove"
                    title="Убрать позицию"
                    aria-label="Убрать позицию"
                    disabled={lines.length < 2}
                    onClick={() =>
                      setLines((prev) => (prev.length < 2 ? prev : prev.filter((r) => r.key !== ln.key)))
                    }
                  >
                    ×
                  </CrmButton>
                </li>
              ))}
            </ul>
            <CrmButton
              variant="deliveryLineAdd"
              disabled={hasIncompleteLine}
              onClick={() => setLines((prev) => [...prev, newTaxonQtyLine()])}
            >
              + позиция
            </CrmButton>
          </div>

        <CrmModal.Actions
          submitLabel="Запланировать"
          submitDisabled={!expectedAtReady || !supplierChosen || !deliveryCompositionReady}
          submitBusy={busy}
        />
    </CrmModal>
  )
}
