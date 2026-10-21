import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CollapsiblePanel } from '../components/ui/CollapsiblePanel'
import { CatalogFilter } from '../components/ui/CatalogFilter'
import { CrmPageStatus, crmPageStatusPanelClass } from '../components/ui/CrmPageStatus'
import { CrmPageToolbar } from '../components/ui/CrmPageToolbar'
import { HighlightedText } from '../components/ui/HighlightedText'
import { apiFetch } from '../api/apiFetch'
import { catalogNavState } from '../utils/catalogNav'
import { textMatchesSearchQuery } from '../utils/listSearchQuery'
import { isUpstreamErrorStatus } from '../utils/networkError'
import { normalizeTaxonSearchQuery, taxonSearchQueryWords } from '../utils/taxonSearchQuery'
import { moneyNearlyEqual, parseMoneyInput, parseStoredMoney } from '../utils/crmInput'
import { CrmPriceField } from '../components/form'
import { StoreFlowerThumb } from '../components/ui/StoreFlowerThumb'
import './flowersCatalog.css'
import './warehouse.css'
import './warehouse/stock/modal-prices.css'
import './pricesPage.css'

const catalogFromPrices = catalogNavState('/prices')

type CatalogPriceRow = {
  store_flower_id: number
  display_name: string
  latin_name: string | null
  rank_label: string
  unit_price: string | null
  on_warehouse: boolean
  photo_url?: string | null
}

type RetailPriceRow = {
  id: number
  name: string
  unit_price: string | null
  on_warehouse: boolean
  photo_url?: string | null
}

type BouquetPriceRow = {
  id: number
  name: string
  unit_price: string | null
  on_warehouse: boolean
  photo_url?: string | null
}

type PricesCatalogResponse = {
  flowers: CatalogPriceRow[]
  retail_products?: RetailPriceRow[]
  bouquets?: BouquetPriceRow[]
}

function saveUnitPrice(
  body: Record<string, unknown>,
  onSuccess: () => void,
  onError: (message: string) => void,
  onFinally: () => void,
) {
  void apiFetch('/api/me/stock/prices/', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then((res) => {
      if (!res.ok && isUpstreamErrorStatus(res.status)) return
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
      onSuccess()
    })
    .catch((e: unknown) => {
      onError(e instanceof Error ? e.message : 'Не удалось сохранить')
    })
    .finally(onFinally)
}

export function PricesPage() {
  const [rows, setRows] = useState<CatalogPriceRow[] | null>(null)
  const [retailRows, setRetailRows] = useState<RetailPriceRow[]>([])
  const [bouquetRows, setBouquetRows] = useState<BouquetPriceRow[]>([])
  const [draftPriceByFlower, setDraftPriceByFlower] = useState<Record<number, string>>({})
  const [draftPriceByRetail, setDraftPriceByRetail] = useState<Record<number, string>>({})
  const [draftPriceByBouquet, setDraftPriceByBouquet] = useState<Record<number, string>>({})
  const [busyFlowerId, setBusyFlowerId] = useState<number | null>(null)
  const [busyRetailId, setBusyRetailId] = useState<number | null>(null)
  const [busyBouquetId, setBusyBouquetId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [flowersOpen, setFlowersOpen] = useState(false)
  const [retailOpen, setRetailOpen] = useState(false)
  const [bouquetsOpen, setBouquetsOpen] = useState(false)

  const load = useCallback(() => {
    setError(null)
    return apiFetch('/api/me/stock/prices/catalog/')
      .then((res) => {
        if (res.status === 401) throw new Error('Сессия недействительна. Войдите снова.')
        if (!res.ok && isUpstreamErrorStatus(res.status)) {
          return null
        }
        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        return res.json() as Promise<PricesCatalogResponse>
      })
      .then((data) => {
        if (data === null) return
        setRows(data.flowers)
        setRetailRows(data.retail_products ?? [])
        setBouquetRows(data.bouquets ?? [])
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить список цен')
      })
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const sortedFlowers = useMemo(() => {
    const list = [...(rows ?? [])]
    list.sort((a, b) => {
      if (a.on_warehouse !== b.on_warehouse) return a.on_warehouse ? -1 : 1
      return a.display_name.localeCompare(b.display_name, 'ru')
    })
    return list
  }, [rows])

  const sortedRetail = useMemo(() => {
    const list = [...retailRows]
    list.sort((a, b) => {
      if (a.on_warehouse !== b.on_warehouse) return a.on_warehouse ? -1 : 1
      return a.name.localeCompare(b.name, 'ru')
    })
    return list
  }, [retailRows])

  const sortedBouquets = useMemo(() => {
    const list = [...bouquetRows]
    list.sort((a, b) => {
      if (a.on_warehouse !== b.on_warehouse) return a.on_warehouse ? -1 : 1
      return a.name.localeCompare(b.name, 'ru')
    })
    return list
  }, [bouquetRows])

  const filterActive = normalizeTaxonSearchQuery(filterQuery).length >= 1

  const highlightWords = useMemo(
    () => (filterActive ? taxonSearchQueryWords(normalizeTaxonSearchQuery(filterQuery)) : []),
    [filterActive, filterQuery],
  )

  const filteredFlowers = useMemo(
    () =>
      sortedFlowers.filter((t) =>
        textMatchesSearchQuery(filterQuery, t.display_name, t.latin_name ?? '', t.rank_label),
      ),
    [sortedFlowers, filterQuery],
  )

  const filteredRetail = useMemo(
    () => sortedRetail.filter((r) => textMatchesSearchQuery(filterQuery, r.name)),
    [sortedRetail, filterQuery],
  )

  const filteredBouquets = useMemo(
    () => sortedBouquets.filter((b) => textMatchesSearchQuery(filterQuery, b.name)),
    [sortedBouquets, filterQuery],
  )

  const clearFlowerDrafts = (flowerId: number) => {
    setDraftPriceByFlower((prev) => {
      const next = { ...prev }
      delete next[flowerId]
      return next
    })
  }

  const commitFlowerRow = (t: CatalogPriceRow) => {
    const fid = t.store_flower_id
    if (draftPriceByFlower[fid] === undefined) return

    const priceParsed = parseMoneyInput(draftPriceByFlower[fid]!)
    if (priceParsed === 'bad') {
      setError(null)
      return
    }

    const serverPrice = parseStoredMoney(t.unit_price ?? null)
    if (moneyNearlyEqual(priceParsed, serverPrice)) {
      clearFlowerDrafts(fid)
      return
    }
    if (priceParsed === null && serverPrice === null) {
      clearFlowerDrafts(fid)
      return
    }

    setBusyFlowerId(fid)
    setError(null)
    saveUnitPrice(
      {
        store_flower_id: fid,
        unit_price: priceParsed === null ? null : priceParsed,
      },
      () => {
        clearFlowerDrafts(fid)
        void load()
      },
      (message) => setError(message),
      () => setBusyFlowerId(null),
    )
  }

  const clearRetailDrafts = (id: number) => {
    setDraftPriceByRetail((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const commitRetailRow = (r: RetailPriceRow) => {
    const id = r.id
    if (draftPriceByRetail[id] === undefined) return

    const priceParsed = parseMoneyInput(draftPriceByRetail[id]!)
    if (priceParsed === 'bad') {
      setError(null)
      return
    }

    const serverPrice = parseStoredMoney(r.unit_price ?? null)
    if (moneyNearlyEqual(priceParsed, serverPrice)) {
      clearRetailDrafts(id)
      return
    }
    if (priceParsed === null && serverPrice === null) {
      clearRetailDrafts(id)
      return
    }

    setBusyRetailId(id)
    setError(null)
    saveUnitPrice(
      { retail_product_id: id, unit_price: priceParsed === null ? null : priceParsed },
      () => {
        clearRetailDrafts(id)
        void load()
      },
      (message) => setError(message),
      () => setBusyRetailId(null),
    )
  }

  const clearBouquetDrafts = (id: number) => {
    setDraftPriceByBouquet((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const commitBouquetRow = (b: BouquetPriceRow) => {
    const id = b.id
    if (draftPriceByBouquet[id] === undefined) return

    const priceParsed = parseMoneyInput(draftPriceByBouquet[id]!)
    if (priceParsed === 'bad') {
      setError(null)
      return
    }

    const serverPrice = parseStoredMoney(b.unit_price ?? null)
    if (moneyNearlyEqual(priceParsed, serverPrice)) {
      clearBouquetDrafts(id)
      return
    }
    if (priceParsed === null && serverPrice === null) {
      clearBouquetDrafts(id)
      return
    }

    setBusyBouquetId(id)
    setError(null)
    saveUnitPrice(
      { bouquet_id: id, unit_price: priceParsed === null ? null : priceParsed },
      () => {
        clearBouquetDrafts(id)
        void load()
      },
      (message) => setError(message),
      () => setBusyBouquetId(null),
    )
  }

  const hasData =
    rows !== null && (rows.length > 0 || retailRows.length > 0 || bouquetRows.length > 0)

  return (
    <div className="flowers-page flowers-page--prices prices-page">
      <CrmPageToolbar
        title="Цены"
        leadCompact
      />

      <CrmPageStatus error={error} loading={rows === null} />

      {rows !== null && !hasData && !error ? (
        <p className={crmPageStatusPanelClass()}>Пока нет позиций для цен — добавьте цветы, вещи или букеты.</p>
      ) : null}

      {hasData ? (
        <>
          <div className="prices-page__filter">
            <CatalogFilter
              id="prices-page-search"
              label="Поиск"
              value={filterQuery}
              onChange={setFilterQuery}
              placeholder="Название цветка, вещи или букета…"
              hint={
                filterActive
                  ? 'Совпадение по словам в названии; все три списка ниже фильтруются одновременно.'
                  : 'Введите часть названия — списки цветов, вещей и букетов сузятся.'
              }
            />
          </div>

          <div className="prices-page__panels">
            <CollapsiblePanel
              sectionId="prices-flowers-heading"
              title="Цветы"
              count={filteredFlowers.length}
              expanded={flowersOpen}
              onToggle={() => setFlowersOpen((v) => !v)}
              emptyHint={
                filterActive ? 'Ничего не найдено по запросу.' : 'В каталоге пока нет видов цветов.'
              }
            >
              <ul className="crm-prices-list prices-page__list">
                {filteredFlowers.map((t) => {
                  const priceShown =
                    draftPriceByFlower[t.store_flower_id] !== undefined
                      ? draftPriceByFlower[t.store_flower_id]
                      : (t.unit_price ?? '')
                  const rowBusy = busyFlowerId === t.store_flower_id
                  return (
                    <li key={t.store_flower_id} className="crm-prices-list__row">
                      <StoreFlowerThumb
                        url={t.photo_url}
                        alt={t.display_name}
                        size={44}
                        variant="flower"
                        className="crm-prices-list__thumb"
                      />
                      <div className="crm-prices-list__taxon">
                        <span className="crm-prices-list__name">
                          <HighlightedText text={t.display_name} highlightWords={highlightWords} />
                        </span>
                        {t.rank_label ? (
                          <span className="crm-prices-list__rank">{t.rank_label}</span>
                        ) : null}
                        <Link
                          to={`/warehouse/flowers/${t.store_flower_id}`}
                          state={catalogFromPrices}
                          className="prices-page__flower-link"
                        >
                          Карточка ухода
                        </Link>
                      </div>
                      <div className="crm-prices-list__inputs">
                        <CrmPriceField
                          label="Цена, ₽/шт"
                          placeholder="—"
                          aria-label={`Цена за штуку: ${t.display_name}`}
                          value={priceShown}
                          disabled={rowBusy}
                          onChange={(e) => {
                            setError(null)
                            setDraftPriceByFlower((prev) => ({
                              ...prev,
                              [t.store_flower_id]: e.target.value,
                            }))
                          }}
                          onBlur={() => commitFlowerRow(t)}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CollapsiblePanel>

            <CollapsiblePanel
              sectionId="prices-retail-heading"
              title="Вещи"
              count={filteredRetail.length}
              expanded={retailOpen}
              onToggle={() => setRetailOpen((v) => !v)}
              emptyHint={
                filterActive
                  ? 'Ничего не найдено по запросу.'
                  : 'Пока нет вещей без срока — добавьте на «Склад» или «Главная».'
              }
            >
              <ul className="crm-prices-list prices-page__list">
                {filteredRetail.map((r) => {
                  const priceShown =
                    draftPriceByRetail[r.id] !== undefined ? draftPriceByRetail[r.id] : (r.unit_price ?? '')
                  const rowBusy = busyRetailId === r.id
                  return (
                    <li key={r.id} className="crm-prices-list__row">
                      <StoreFlowerThumb
                        url={r.photo_url}
                        alt={r.name}
                        size={44}
                        variant="retail"
                        className="crm-prices-list__thumb"
                      />
                      <div className="crm-prices-list__taxon">
                        <span className="crm-prices-list__name">
                          <HighlightedText text={r.name} highlightWords={highlightWords} />
                        </span>
                      </div>
                      <div className="crm-prices-list__inputs">
                        <CrmPriceField
                          label="Цена, ₽/шт"
                          placeholder="—"
                          aria-label={`Цена за штуку: ${r.name}`}
                          value={priceShown}
                          disabled={rowBusy}
                          onChange={(e) => {
                            setError(null)
                            setDraftPriceByRetail((prev) => ({ ...prev, [r.id]: e.target.value }))
                          }}
                          onBlur={() => commitRetailRow(r)}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CollapsiblePanel>

            <CollapsiblePanel
              sectionId="prices-bouquets-heading"
              title="Букеты"
              count={filteredBouquets.length}
              expanded={bouquetsOpen}
              onToggle={() => setBouquetsOpen((v) => !v)}
              emptyHint={
                filterActive
                  ? 'Ничего не найдено по запросу.'
                  : 'Пока нет букетов — добавьте рецепт на «Склад» или «Главная».'
              }
            >
              <ul className="crm-prices-list prices-page__list">
                {filteredBouquets.map((b) => {
                  const priceShown =
                    draftPriceByBouquet[b.id] !== undefined ? draftPriceByBouquet[b.id] : (b.unit_price ?? '')
                  const rowBusy = busyBouquetId === b.id
                  return (
                    <li key={b.id} className="crm-prices-list__row">
                      <StoreFlowerThumb
                        url={b.photo_url}
                        alt={b.name}
                        size={44}
                        variant="bouquet"
                        className="crm-prices-list__thumb"
                      />
                      <div className="crm-prices-list__taxon">
                        <span className="crm-prices-list__name">
                          <HighlightedText text={b.name} highlightWords={highlightWords} />
                        </span>
                      </div>
                      <div className="crm-prices-list__inputs">
                        <CrmPriceField
                          label="Цена, ₽/шт"
                          placeholder="—"
                          aria-label={`Цена за штуку: ${b.name}`}
                          value={priceShown}
                          disabled={rowBusy}
                          onChange={(e) => {
                            setError(null)
                            setDraftPriceByBouquet((prev) => ({ ...prev, [b.id]: e.target.value }))
                          }}
                          onBlur={() => commitBouquetRow(b)}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CollapsiblePanel>
          </div>
        </>
      ) : null}
    </div>
  )
}
