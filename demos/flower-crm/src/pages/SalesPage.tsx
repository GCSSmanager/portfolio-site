import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api/apiFetch'
import type { BatchesResponse, BatchRow, BouquetRow, RetailProductRow } from '../components/crm/stock/types'
import { ReportPeriodControls } from '../components/report/ReportPeriodControls'
import { formatRub, parseAmount } from '../utils/formatMoney'
import { isUpstreamErrorStatus } from '../utils/networkError'
import {
  defaultReportPeriod,
  periodQueryString,
  type ReportPeriodRange,
} from '../utils/reportPeriod'
import { DEFAULT_PAYMENT_TYPE, type PaymentType } from '../utils/paymentType'
import { BouquetRecipeList } from '../components/crm/cards/BouquetRecipeList'
import { buildSaleCompositionListItems } from '../utils/bouquetAssembleRealization'
import { mediaUrl } from '../utils/mediaUrl'
import {
  buildSaleStockOptions,
  saleStockOptionMeta,
  useCrmDialogScrollLock,
  type SaleStockOption,
} from './warehouse'
import { SalesAddToCartModal } from './sales/SalesAddToCartModal'
import { SalesCheckoutModal } from './sales/SalesCheckoutModal'
import {
  buildSaleRequestBody,
  cartLineKeysInCart,
  salesCartItemFromLine,
  type SalesCartItem,
} from './sales/saleCart'
import './flowersCatalog.css'
import './warehouse/stock/forms-fields.css'
import './warehouse/stock/modal-shell-taxons.css'
import './warehouse/stock/modal-sale.css'
import './salesPage.css'

type SaleHistoryRow = {
  id: number
  kind: 'flower' | 'retail' | 'bouquet' | 'custom_bouquet'
  kind_label: string
  sold_at: string
  display_name: string
  quantity: number
  unit_price: string
  total_amount: string
  payment_type: string
  payment_label: string
  realization_quantity: number
  has_realization: boolean
  batch_id?: number
  has_delivery?: boolean
  delivery_hint?: string
  composition?: { display_name: string; quantity: number; store_flower_id?: number | null }[]
}

type SalesListApi = {
  period: { from: string; to: string }
  totals: {
    sales_count: number
    total_quantity: number
    total_amount: string
    delivery_count?: number
    delivery_amount?: string
  }
  history: SaleHistoryRow[]
}

function formatSoldAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SaleHistoryBadges({ row }: { row: SaleHistoryRow }) {
  return (
    <div className="sales-page__badges">
      <span className="sales-page__badge sales-page__badge--pay">{row.payment_label}</span>
      {row.has_realization ? (
        <span className="sales-page__badge sales-page__badge--realization">
          Реал. {row.realization_quantity}
        </span>
      ) : null}
      {row.has_delivery ? (
        <span className="sales-page__badge sales-page__badge--delivery" title={row.delivery_hint}>
          Доставка
        </span>
      ) : null}
    </div>
  )
}

function SaleHistoryComposition({ row }: { row: SaleHistoryRow }) {
  if (!row.composition?.length) return null
  const items = buildSaleCompositionListItems(row.composition)
  return (
    <BouquetRecipeList
      items={items}
      className="sales-page__history-composition"
    />
  )
}

function SalesHistoryCard({ row }: { row: SaleHistoryRow }) {
  return (
    <li className="sales-page__history-card">
      <p className="sales-page__history-card-title">{row.display_name}</p>
      <SaleHistoryComposition row={row} />
      <p className="sales-page__history-card-sum">{formatRub(row.total_amount)}</p>
      <div className="sales-page__history-card-meta">
        <span className="sales-page__history-card-date">{formatSoldAt(row.sold_at)}</span>
        <span className="sales-page__history-card-qty">
          {row.quantity.toLocaleString('ru-RU')} шт.
        </span>
      </div>
      <SaleHistoryBadges row={row} />
    </li>
  )
}

function matchesCatalogSearch(item: SaleStockOption, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = `${item.name} ${item.label} ${saleStockOptionMeta(item)}`.toLowerCase()
  return hay.includes(q)
}

export function SalesPage() {
  useCrmDialogScrollLock()
  const [period, setPeriod] = useState<ReportPeriodRange>(() => defaultReportPeriod())
  const [historyPayload, setHistoryPayload] = useState<SalesListApi | null>(null)
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [retailProducts, setRetailProducts] = useState<RetailProductRow[]>([])
  const [bouquets, setBouquets] = useState<BouquetRow[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [catalogSearch, setCatalogSearch] = useState('')

  const [cartItems, setCartItems] = useState<SalesCartItem[]>([])
  const [cartPaymentType, setCartPaymentType] = useState<PaymentType>(DEFAULT_PAYMENT_TYPE)
  const [cartBusy, setCartBusy] = useState(false)
  const [cartError, setCartError] = useState<string | null>(null)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addModalProduct, setAddModalProduct] = useState<SaleStockOption | null>(null)
  const [editingCartItem, setEditingCartItem] = useState<SalesCartItem | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const retailForSale = useMemo(
    () => retailProducts.filter((p) => p.quantity > 0),
    [retailProducts],
  )
  const bouquetsForSale = useMemo(() => bouquets.filter((b) => b.quantity > 0), [bouquets])

  const saleStockOptions = useMemo(
    () => buildSaleStockOptions(batches, retailForSale, bouquetsForSale),
    [batches, retailForSale, bouquetsForSale],
  )

  const catalogFiltered = useMemo(
    () =>
      saleStockOptions.filter(
        (item) => item.kind !== 'custom_bouquet' && matchesCatalogSearch(item, catalogSearch),
      ),
    [saleStockOptions, catalogSearch],
  )

  const cartLineKeys = useMemo(() => cartLineKeysInCart(cartItems), [cartItems])
  const hasSaleStock = saleStockOptions.length > 0

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadErr(null)
    const qs = periodQueryString(period)
    try {
      const [stockRes, listRes] = await Promise.all([
        apiFetch('/api/me/stock/'),
        apiFetch(`/api/me/stock/sales/list/?${qs}`),
      ])
      if (!stockRes.ok && !isUpstreamErrorStatus(stockRes.status)) {
        const j = (await stockRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `Ошибка склада ${stockRes.status}`)
      }
      if (!listRes.ok && !isUpstreamErrorStatus(listRes.status)) {
        const j = (await listRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `Ошибка истории ${listRes.status}`)
      }
      if (stockRes.ok) {
        const stock = (await stockRes.json()) as BatchesResponse
        setBatches(stock.batches ?? [])
        setRetailProducts(stock.retail_products ?? [])
        setBouquets(stock.bouquets ?? [])
      }
      if (listRes.ok) {
        setHistoryPayload((await listRes.json()) as SalesListApi)
      }
    } catch (e: unknown) {
      setLoadErr(e instanceof Error ? e.message : 'Не удалось загрузить данные')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openAddModal = (item: SaleStockOption) => {
    const existing = cartItems.find((c) => c.lineKey === item.key) ?? null
    setAddModalProduct(item)
    setEditingCartItem(existing)
    setAddModalOpen(true)
  }

  const saveToCart = (qty: number, unitPrice: number, realizationQty: number) => {
    if (!addModalProduct) return
    const existing = cartItems.find((c) => c.lineKey === addModalProduct.key)
    const next = salesCartItemFromLine(
      addModalProduct,
      qty,
      unitPrice,
      realizationQty,
      existing?.id,
    )
    setCartItems((prev) => {
      const idx = prev.findIndex((c) => c.lineKey === addModalProduct.key)
      if (idx < 0) return [...prev, next]
      const copy = [...prev]
      copy[idx] = next
      return copy
    })
    setCartError(null)
    setAddModalOpen(false)
    setAddModalProduct(null)
    setEditingCartItem(null)
  }

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id))
  }

  const updateCartQty = (id: string, qty: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const q = Math.min(Math.max(1, qty), item.maxStock)
        const rqMax = item.realizationCap > 0 ? Math.min(item.realizationCap, q) : 0
        const rq = rqMax > 0 ? Math.min(item.realizationQty, rqMax) : 0
        return { ...item, qty: q, realizationQty: rq }
      }),
    )
  }

  const updateCartPrice = (id: string, unitPrice: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unitPrice } : item)),
    )
  }

  const updateCartRealization = (id: string, realizationQty: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const rqMax = item.realizationCap > 0 ? Math.min(item.realizationCap, item.qty) : 0
        if (rqMax < 1) return { ...item, realizationQty: 0 }
        const rq = Math.min(Math.max(0, realizationQty), rqMax)
        return { ...item, realizationQty: rq }
      }),
    )
  }

  const confirmCheckout = async () => {
    if (cartItems.length < 1) {
      setCartError('Корзина пуста.')
      return
    }
    if (!cartPaymentType) {
      setCartError('Выберите тип оплаты.')
      return
    }
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i]
      const line = saleStockOptions.find((o) => o.key === item.lineKey)
      const n = i + 1
      if (!line) {
        setCartError(`Позиция ${n}: товар больше недоступен.`)
        return
      }
      if (item.qty < 1 || item.qty > line.qty) {
        setCartError(`Позиция ${n}: количество от 1 до ${line.qty}.`)
        return
      }
      if (item.unitPrice <= 0) {
        setCartError(`Позиция ${n}: укажите цену.`)
        return
      }
      const rqMax =
        item.realizationCap > 0 ? Math.min(item.realizationCap, item.qty) : 0
      if (
        rqMax > 0 &&
        (item.realizationQty < 0 || item.realizationQty > rqMax)
      ) {
        setCartError(`Позиция ${n}: с реализации — от 0 до ${rqMax} шт.`)
        return
      }
    }
    setCartBusy(true)
    setCartError(null)
    try {
      for (const item of cartItems) {
        const line = saleStockOptions.find((o) => o.key === item.lineKey)
        if (!line) continue
        const body = {
          ...buildSaleRequestBody(line, item.qty, item.unitPrice, item.realizationQty),
          payment_type: cartPaymentType,
        }
        const res = await apiFetch('/api/me/stock/sales/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok && isUpstreamErrorStatus(res.status)) return
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? `Ошибка ${res.status}`)
        }
      }
      setCartItems([])
      setCheckoutOpen(false)
      await refresh()
    } catch (e: unknown) {
      setCartError(e instanceof Error ? e.message : 'Оплата не записана')
    } finally {
      setCartBusy(false)
    }
  }

  const totals = historyPayload?.totals
  const historyRows = historyPayload?.history ?? []

  return (
    <div className="flowers-page flowers-page--sales">
      <header className="sales-page__head">
        <h1 className="flowers-page__title">Продажи</h1>
        <ReportPeriodControls
          className="sales-page__period"
          value={period}
          disabled={loading}
          onChange={setPeriod}
        />
      </header>

      {loadErr ? (
        <p className="sales-page__banner-err" role="alert">
          {loadErr}
        </p>
      ) : null}

      {loading ? <div className="sales-page__skel" aria-busy="true" /> : null}

      {!loading ? (
        <div className="sales-page__layout">
          <aside className="sales-page__catalog-panel" aria-labelledby="sales-catalog-heading">
            <div className="sales-page__panel-head">
              <h2 id="sales-catalog-heading" className="sales-page__section-title">
                Товары
              </h2>
              <input
                type="search"
                className="sales-page__search"
                placeholder="Поиск…"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                aria-label="Поиск товара"
              />
            </div>
            {cartItems.length > 0 ? (
              <button
                type="button"
                className="sales-page__checkout-btn"
                onClick={() => {
                  setCartError(null)
                  setCheckoutOpen(true)
                }}
              >
                Перейти к оплате ({cartItems.length})
              </button>
            ) : null}
            <div className="sales-page__catalog">
              {catalogFiltered.length === 0 ? (
                <p className="sales-page__catalog-empty">
                  {hasSaleStock
                    ? 'Ничего не найдено.'
                    : 'На складе нет позиций с остатком.'}
                </p>
              ) : (
                catalogFiltered.map((item) => {
                  const photo = item.photo_url ? mediaUrl(item.photo_url) : null
                  const priceLabel =
                    item.unit_price != null && parseAmount(item.unit_price) > 0
                      ? formatRub(item.unit_price)
                      : 'Цена не задана'
                  const inCart = cartLineKeys.has(item.key)
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`sales-page__product${inCart ? ' sales-page__product--in-cart' : ''}`}
                      onClick={() => openAddModal(item)}
                    >
                      {photo ? (
                        <img
                          src={photo}
                          alt=""
                          className="sales-page__product-photo"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="sales-page__product-photo sales-page__product-photo--empty"
                          aria-hidden
                        >
                          {item.kind === 'bouquet'
                            ? '💐'
                            : item.kind === 'custom_bouquet'
                              ? '✂️'
                              : item.kind === 'retail'
                                ? '🎁'
                                : '🌸'}
                        </div>
                      )}
                      <div className="sales-page__product-body">
                        <p className="sales-page__product-name">{item.name}</p>
                        <p className="sales-page__product-meta">
                          {item.qty.toLocaleString('ru-RU')} шт. · {priceLabel}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <div className="sales-page__history-panel">
            {totals ? (
              <div className="sales-page__kpi-row" aria-label="Сводка за период">
                <div className="sales-page__kpi">
                  <span className="sales-page__kpi-lab">Чеков</span>
                  <span className="sales-page__kpi-val">{totals.sales_count}</span>
                </div>
                <div className="sales-page__kpi">
                  <span className="sales-page__kpi-lab">Выручка</span>
                  <span className="sales-page__kpi-val">{formatRub(totals.total_amount)}</span>
                </div>
                {(totals.delivery_count ?? 0) > 0 ? (
                  <div className="sales-page__kpi sales-page__kpi--delivery">
                    <span className="sales-page__kpi-lab">Доставка</span>
                    <span className="sales-page__kpi-val">
                      {formatRub(totals.delivery_amount ?? '0')}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <h2 className="sales-page__section-title">История</h2>
            <ul className="sales-page__history-cards" aria-label="История продаж">
              {!historyRows.length ? (
                <li className="sales-page__history-cards-empty">Нет продаж за период.</li>
              ) : (
                historyRows.map((row) => (
                  <SalesHistoryCard key={`${row.kind}-${row.id}`} row={row} />
                ))
              )}
            </ul>
            <div className="sales-page__table-wrap sales-page__table-wrap--desktop">
              <table className="sales-page__table">
                <thead>
                  <tr>
                    <th scope="col">Дата</th>
                    <th scope="col">Позиция</th>
                    <th scope="col">Кол.</th>
                    <th scope="col">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {!historyRows.length ? (
                    <tr>
                      <td colSpan={4} className="sales-page__td-empty">
                        Нет продаж за период.
                      </td>
                    </tr>
                  ) : (
                    historyRows.map((row) => (
                      <tr key={`${row.kind}-${row.id}`}>
                        <td className="sales-page__td-date">{formatSoldAt(row.sold_at)}</td>
                        <td className="sales-page__name-cell">
                          <span className="sales-page__name-main">{row.display_name}</span>
                          <SaleHistoryComposition row={row} />
                          <SaleHistoryBadges row={row} />
                        </td>
                        <td className="sales-page__td-num">{row.quantity}</td>
                        <td className="sales-page__td-num">{formatRub(row.total_amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      <SalesAddToCartModal
        open={addModalOpen}
        product={addModalProduct}
        editingItem={editingCartItem}
        busy={cartBusy}
        onClose={() => {
          setAddModalOpen(false)
          setAddModalProduct(null)
          setEditingCartItem(null)
        }}
        onSave={saveToCart}
        onRemove={
          editingCartItem
            ? () => {
                removeFromCart(editingCartItem.id)
                setAddModalOpen(false)
                setAddModalProduct(null)
                setEditingCartItem(null)
              }
            : undefined
        }
      />

      <SalesCheckoutModal
        open={checkoutOpen}
        items={cartItems}
        paymentType={cartPaymentType}
        busy={cartBusy}
        error={cartError}
        onClose={() => {
          setCheckoutOpen(false)
          setCartError(null)
        }}
        onPaymentTypeChange={(v) => setCartPaymentType(v as PaymentType)}
        onRemove={removeFromCart}
        onUpdateQty={updateCartQty}
        onUpdatePrice={updateCartPrice}
        onUpdateRealization={updateCartRealization}
        onConfirm={() => void confirmCheckout()}
      />
    </div>
  )
}
