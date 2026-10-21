import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api/apiFetch'
import { useAuth, formatPhoneDisplay } from '../auth/AuthContext'
import { SiteHeader } from '../auth/SiteHeader'
import { CollapsiblePanel } from '../components/ui/CollapsiblePanel'
import { CatalogFilter } from '../components/ui/CatalogFilter'
import { CrmPageStatus, crmPageStatusPanelClass } from '../components/ui/CrmPageStatus'
import { StoreFlowerThumb } from '../components/ui/StoreFlowerThumb'
import { textMatchesSearchQuery } from '../utils/listSearchQuery'
import { formatRubBriefFromString } from '../utils/formatMoney'
import { isUpstreamErrorStatus } from '../utils/networkError'
import './customerMarket.css'
import './flowersCatalog.css'
import './pricesPage.css'

type FlowerRow = {
  store_flower_id: number
  display_name: string
  latin_name: string | null
  rank_label: string
  unit_price: string | null
  in_stock: boolean
  photo_url?: string | null
}

type SimpleRow = {
  id: number
  name: string
  unit_price: string
  photo_url?: string | null
}

type CatalogResponse = {
  shop: { id: number; name: string; phone: string | null }
  flowers: FlowerRow[]
  retail_products: SimpleRow[]
  bouquets: SimpleRow[]
}

export function CustomerShopCatalogPage() {
  const { shopId } = useParams()
  const id = Number.parseInt(shopId ?? '', 10)
  const { phone, loading, backendUnreachable } = useAuth()
  const [data, setData] = useState<CatalogResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [flowersOpen, setFlowersOpen] = useState(true)
  const [retailOpen, setRetailOpen] = useState(true)
  const [bouquetsOpen, setBouquetsOpen] = useState(true)

  const load = useCallback(() => {
    if (!Number.isFinite(id)) return
    setError(null)
    return apiFetch(`/api/market/shops/${id}/`)
      .then((res) => {
        if (res.status === 401) throw new Error('Войдите в систему.')
        if (res.status === 404) throw new Error('Магазин не найден.')
        if (!res.ok && isUpstreamErrorStatus(res.status)) return
        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        return res.json() as Promise<CatalogResponse>
      })
      .then((json) => {
        if (json) setData(json)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить каталог')
      })
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const filteredFlowers = useMemo(
    () =>
      (data?.flowers ?? []).filter((f) =>
        textMatchesSearchQuery(filterQuery, f.display_name, f.latin_name ?? '', f.rank_label),
      ),
    [data?.flowers, filterQuery],
  )

  const filteredRetail = useMemo(
    () => (data?.retail_products ?? []).filter((r) => textMatchesSearchQuery(filterQuery, r.name)),
    [data?.retail_products, filterQuery],
  )

  const filteredBouquets = useMemo(
    () => (data?.bouquets ?? []).filter((b) => textMatchesSearchQuery(filterQuery, b.name)),
    [data?.bouquets, filterQuery],
  )

  if (backendUnreachable) {
    return <Navigate to="/service-unavailable" replace />
  }

  if (loading) {
    return (
      <div className="login-page login-page--busy" aria-busy="true">
        <p className="login-page__loading">Загрузка…</p>
      </div>
    )
  }

  if (!phone) {
    return <Navigate to="/login" replace />
  }

  if (!Number.isFinite(id)) {
    return <Navigate to="/" replace />
  }

  const filterActive = filterQuery.trim().length > 0

  const totalItems =
    (data?.flowers?.length ?? 0) +
    (data?.retail_products?.length ?? 0) +
    (data?.bouquets?.length ?? 0)

  return (
    <div className="auth-app-shell">
      <SiteHeader />
      <main className="flowers-page customer-market-page">
        <p className="customer-market-page__back">
          <Link to="/">← К списку магазинов</Link>
        </p>
        <header className="flowers-page__head customer-market-page__head">
          <h1 className="flowers-page__title">{data?.shop.name ?? 'Магазин'}</h1>
          {data?.shop.phone ? (
            <p className="customer-market-page__shop-phone">{formatPhoneDisplay(data.shop.phone)}</p>
          ) : null}
        </header>
        <p className="customer-market-page__lead">
          Ассортимент магазина: цены и наличие на сегодня. Онлайн-заказ появится позже.
        </p>

        <CrmPageStatus error={error} loading={!error && data === null} />

        {!error && data ? (
          <>
            <div className="prices-page__filter">
              <CatalogFilter
                id="customer-shop-search"
                label="Поиск"
                value={filterQuery}
                onChange={setFilterQuery}
                placeholder="Поиск по каталогу…"
              />
            </div>
            {totalItems === 0 ? (
              <p className={crmPageStatusPanelClass()}>В магазине пока нет позиций в каталоге.</p>
            ) : (
              <div className="prices-page__panels customer-market-page__panels">
                {(data.flowers?.length ?? 0) > 0 ? (
                <CollapsiblePanel
                  sectionId="customer-shop-flowers"
                  title="Цветы"
                  count={filteredFlowers.length}
                  expanded={flowersOpen}
                  onToggle={() => setFlowersOpen((o) => !o)}
                  emptyHint={
                    filterActive ? 'Ничего не найдено по запросу.' : 'В каталоге пока нет цветов.'
                  }
                >
                  <ul className="crm-prices-list prices-page__list customer-market-page__list">
                    {filteredFlowers.map((f) => (
                      <li key={f.store_flower_id} className="crm-prices-list__row">
                        <StoreFlowerThumb
                          url={f.photo_url}
                          alt=""
                          size={44}
                          className="crm-prices-list__thumb"
                        />
                        <div className="crm-prices-list__taxon">
                          <span className="crm-prices-list__name">{f.display_name}</span>
                          {f.latin_name ? (
                            <span className="crm-prices-list__rank">{f.latin_name}</span>
                          ) : null}
                          {!f.in_stock ? (
                            <span className="customer-market-page__stock-hint">Нет в наличии</span>
                          ) : null}
                        </div>
                        <span className="customer-market-page__price">
                          {formatRubBriefFromString(f.unit_price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CollapsiblePanel>
                ) : null}

                {(data.retail_products?.length ?? 0) > 0 ? (
                <CollapsiblePanel
                  sectionId="customer-shop-retail"
                  title="Товары"
                  count={filteredRetail.length}
                  expanded={retailOpen}
                  onToggle={() => setRetailOpen((o) => !o)}
                  emptyHint={
                    filterActive ? 'Ничего не найдено по запросу.' : 'В каталоге пока нет товаров.'
                  }
                >
                  <ul className="crm-prices-list prices-page__list customer-market-page__list">
                    {filteredRetail.map((r) => (
                      <li key={r.id} className="crm-prices-list__row">
                        <StoreFlowerThumb
                          url={r.photo_url}
                          alt=""
                          size={44}
                          variant="retail"
                          className="crm-prices-list__thumb"
                        />
                        <div className="crm-prices-list__taxon">
                          <span className="crm-prices-list__name">{r.name}</span>
                        </div>
                        <span className="customer-market-page__price">
                          {formatRubBriefFromString(r.unit_price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CollapsiblePanel>
                ) : null}

                {(data.bouquets?.length ?? 0) > 0 ? (
                <CollapsiblePanel
                  sectionId="customer-shop-bouquets"
                  title="Букеты"
                  count={filteredBouquets.length}
                  expanded={bouquetsOpen}
                  onToggle={() => setBouquetsOpen((o) => !o)}
                  emptyHint={
                    filterActive ? 'Ничего не найдено по запросу.' : 'В каталоге пока нет букетов.'
                  }
                >
                  <ul className="crm-prices-list prices-page__list customer-market-page__list">
                    {filteredBouquets.map((b) => (
                      <li key={b.id} className="crm-prices-list__row">
                        <StoreFlowerThumb
                          url={b.photo_url}
                          alt=""
                          size={44}
                          variant="bouquet"
                          className="crm-prices-list__thumb"
                        />
                        <div className="crm-prices-list__taxon">
                          <span className="crm-prices-list__name">{b.name}</span>
                        </div>
                        <span className="customer-market-page__price">
                          {formatRubBriefFromString(b.unit_price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CollapsiblePanel>
                ) : null}
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  )
}
