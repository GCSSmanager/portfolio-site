import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/apiFetch'
import { useAuth, formatPhoneDisplay } from '../auth/AuthContext'
import { CrmButton } from '../components/ui/CrmButton'
import { CrmTextField } from '../components/form'
import { CrmPageStatus, crmPageStatusPanelClass } from '../components/ui/CrmPageStatus'
import { isUpstreamErrorStatus } from '../utils/networkError'
import './customerAccountPage.css'
import './customerMarket.css'

type MarketShop = {
  id: number
  name: string
  label: string
  phone: string | null
  flowers_count: number
  retail_count: number
  bouquets_count: number
  items_count: number
}

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

function shopMeta(shop: MarketShop): string {
  const parts: string[] = []
  if (shop.flowers_count > 0) parts.push(`${shop.flowers_count} цветов`)
  if (shop.retail_count > 0) parts.push(`${shop.retail_count} товаров`)
  if (shop.bouquets_count > 0) parts.push(`${shop.bouquets_count} букетов`)
  if (parts.length === 0) return 'Пока пусто'
  return parts.join(' · ')
}

export function CustomerAccountPage() {
  const { phone } = useAuth()
  const [shops, setShops] = useState<MarketShop[] | null>(null)
  const [shopsError, setShopsError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shopName, setShopName] = useState('')
  const [registerError, setRegisterError] = useState<string | null>(null)

  const loadShops = useCallback(() => {
    setShopsError(null)
    return apiFetch('/api/market/shops/')
      .then((res) => {
        if (res.status === 401) throw new Error('Войдите в систему.')
        if (!res.ok && isUpstreamErrorStatus(res.status)) return
        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        return res.json() as Promise<{ shops: MarketShop[] }>
      })
      .then((data) => {
        if (data) setShops(data.shops)
      })
      .catch((e: unknown) => {
        setShopsError(e instanceof Error ? e.message : 'Не удалось загрузить магазины')
      })
  }, [])

  useEffect(() => {
    void loadShops()
  }, [loadShops])

  const registerShop = async () => {
    if (isDemo) return
    const trimmed = shopName.trim()
    if (!trimmed) {
      setRegisterError('Укажите название магазина.')
      return
    }
    setBusy(true)
    setRegisterError(null)
    try {
      const res = await apiFetch('/api/auth/register-shop/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_name: trimmed }),
      })
      if (!res.ok && isUpstreamErrorStatus(res.status)) return
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        setRegisterError(typeof data.error === 'string' ? data.error : `Ошибка ${res.status}`)
        return
      }
      window.location.replace('/')
    } catch {
      setRegisterError('Не удалось зарегистрировать магазин')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="customer-account">
      <div className="customer-account__card">
        <h1 className="customer-account__title">Личный кабинет</h1>
        {phone ? (
          <p className="customer-account__phone">{formatPhoneDisplay(phone)}</p>
        ) : null}
        <p className="customer-account__lead">
          Смотрите магазины: что в наличии и по каким ценам. Заказ цветов появится позже.
        </p>

        <section className="customer-market__section" aria-labelledby="shops-h">
          <h2 id="shops-h" className="customer-market__section-title">
            Магазины
          </h2>
          <CrmPageStatus error={shopsError} loading={shops === null && !shopsError} />
          {shops && shops.length === 0 ? (
            <p className={crmPageStatusPanelClass()}>Пока нет подключённых магазинов.</p>
          ) : null}
          {shops && shops.length > 0 ? (
            <div className="customer-market__shops">
              {shops.map((shop) => (
                <Link
                  key={shop.id}
                  to={`/shops/${shop.id}`}
                  className="customer-market__shop-card"
                >
                  <p className="customer-market__shop-card-title">{shop.name}</p>
                  {shop.phone ? (
                    <p className="customer-market__shop-card-phone">
                      {formatPhoneDisplay(shop.phone)}
                    </p>
                  ) : null}
                  <p className="customer-market__shop-card-meta">{shopMeta(shop)}</p>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="customer-account__owner-block">
          <p className="customer-account__owner-lead">Владеете цветочным магазином?</p>
          {isDemo ? (
            <p className="crm-field__hint" role="status">
              В демо регистрация магазина недоступна — войдите как владелец или флорист с экрана входа.
            </p>
          ) : null}
          {registerError ? (
            <p className="crm-field__error" role="alert">
              {registerError}
            </p>
          ) : null}
          <div className="customer-account__register-form">
            <CrmTextField
              label="Название магазина"
              value={shopName}
              disabled={busy || isDemo}
              placeholder="Например, «Роза на Арбате»"
              autoComplete="organization"
              maxLength={120}
              onChange={(e) => {
                setShopName(e.target.value)
                if (registerError) setRegisterError(null)
              }}
            />
          </div>
          <CrmButton
            variant="loginSecondary"
            disabled={busy || isDemo}
            onClick={() => void registerShop()}
          >
            {isDemo ? 'Недоступно в демо' : busy ? '…' : 'Зарегистрировать магазин'}
          </CrmButton>
        </section>
      </div>
    </main>
  )
}
