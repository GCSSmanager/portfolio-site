import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api/apiFetch'
import { CrmDateField, CrmMoneyField, CrmQtyField, CrmTextField } from '../components/form'
import { parseMoneyInput } from '../utils/crmInput'
import {
  careAnchorDateErrorMessage,
  careAnchorDateToIso,
  formatDdMmYyMask,
  formatDdMmYyyyMask,
  isoDateToDdMmYy,
  isCareAnchorDateIncomplete,
} from '../utils/receivedAtRuInput'
import { parseAmount } from '../utils/formatMoney'
import { isUpstreamErrorStatus } from '../utils/networkError'
import { CrmPickField, type CrmPickOption } from './warehouse'
import './expensesPage.css'
import './warehouse/stock/forms-fields.css'
import './warehouse/stock/modal-shell-taxons.css'

type WarehouseModeId = 'basic' | 'variety' | 'advanced'

const WAREHOUSE_MODE_OPTIONS: CrmPickOption[] = [
  {
    value: 'basic',
    label: 'Базовый',
    meta: 'Один ряд на вид; общий день ухода для всего склада',
  },
  {
    value: 'variety',
    label: 'По видам',
    meta: 'Один ряд на вид; уход по партиям и правилам каталога',
  },
  {
    value: 'advanced',
    label: 'Продвинутый',
    meta: 'Отдельные партии и уход по каждой партии',
  },
]

function parseWarehouseMode(raw: string): WarehouseModeId {
  if (raw === 'basic' || raw === 'variety' || raw === 'advanced') return raw
  return 'advanced'
}

type ShopSettings = {
  shop_name: string
  warehouse_mode: string
  basic_care_interval_days: number
  basic_next_care_date: string | null
  inventory_interval_days: number
  acquiring_rate_pct: string
  sbp_commission_rate_pct: string
  tax_rate_pct: string
}

export function SettingsPage() {
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [formErr, setFormErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [mode, setMode] = useState<WarehouseModeId>('basic')
  const [shopName, setShopName] = useState('')
  const [intervalDays, setIntervalDays] = useState('3')
  const [inventoryIntervalDays, setInventoryIntervalDays] = useState('14')
  const [nextCareDate, setNextCareDate] = useState('')
  const lastSavedCareDateIsoRef = useRef<string | null>(null)
  const [acqStr, setAcqStr] = useState('')
  const [sbpStr, setSbpStr] = useState('')
  const [taxStr, setTaxStr] = useState('')

  const apply = useCallback((j: ShopSettings) => {
    setLoadErr(null)
    setFormErr(null)
    setMode(parseWarehouseMode(j.warehouse_mode))
    setShopName(j.shop_name ?? '')
    setIntervalDays(String(j.basic_care_interval_days))
    setInventoryIntervalDays(String(j.inventory_interval_days ?? 14))
    lastSavedCareDateIsoRef.current = j.basic_next_care_date
    setNextCareDate(isoDateToDdMmYy(j.basic_next_care_date))
    setAcqStr(String(parseAmount(j.acquiring_rate_pct)).replace('.', ','))
    setSbpStr(String(parseAmount(j.sbp_commission_rate_pct ?? '0.70')).replace('.', ','))
    setTaxStr(String(parseAmount(j.tax_rate_pct)).replace('.', ','))
  }, [])

  const refresh = useCallback(async () => {
    const res = await apiFetch('/api/me/shop-settings/')
    if (res.status === 401) {
      setLoadErr('Войдите в систему.')
      return
    }
    if (!res.ok && isUpstreamErrorStatus(res.status)) return
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setLoadErr(j.error ?? `Ошибка ${res.status}`)
      return
    }
    apply((await res.json()) as ShopSettings)
  }, [apply])

  useEffect(() => {
    void refresh().finally(() => setLoading(false))
  }, [refresh])

  const patchSettings = async (body: Record<string, unknown>) => {
    if ('basic_next_care_date' in body) return
    setSaving(true)
    setFormErr(null)
    try {
      const res = await apiFetch('/api/me/shop-settings/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok && isUpstreamErrorStatus(res.status)) return
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setFormErr(j.error ?? `Ошибка ${res.status}`)
        return
      }
      const j = (await res.json()) as ShopSettings
      lastSavedCareDateIsoRef.current = j.basic_next_care_date
      apply(j)
    } catch {
      setFormErr('Не удалось сохранить настройки.')
    } finally {
      setSaving(false)
    }
  }

  const persistShopName = async () => {
    const trimmed = shopName.trim()
    if (!trimmed) {
      setFormErr('Укажите название магазина.')
      void refresh()
      return
    }
    void patchSettings({ shop_name: trimmed })
  }

  const persistIntervalDays = async () => {
    const n = Number.parseInt(intervalDays.trim(), 10)
    if (!Number.isFinite(n) || n < 1 || n > 90) {
      setFormErr('Интервал ухода: от 1 до 90 дней.')
      void refresh()
      return
    }
    void patchSettings({ basic_care_interval_days: n })
  }

  const persistInventoryIntervalDays = async () => {
    const n = Number.parseInt(inventoryIntervalDays.trim(), 10)
    if (!Number.isFinite(n) || n < 1 || n > 90) {
      setFormErr('Инвентаризация: интервал от 1 до 90 дней.')
      void refresh()
      return
    }
    void patchSettings({ inventory_interval_days: n })
  }

  const persistNextCareDate = async (valueFromField?: string) => {
    const raw = (valueFromField ?? nextCareDate).trim()
    if (!raw) return
    const digits = raw.replace(/\D/g, '')
    let masked = raw
    if (digits.length === 6) masked = formatDdMmYyMask(digits)
    else if (digits.length >= 7 && digits.length <= 8) masked = formatDdMmYyyyMask(digits)
    if (masked !== nextCareDate) setNextCareDate(masked)
    if (isCareAnchorDateIncomplete(masked)) return
    const iso = careAnchorDateToIso(masked)
    if (!iso) {
      setFormErr(
        careAnchorDateErrorMessage(masked) ??
          'Введите дату: шесть цифр (19/05/26) или восемь (19/05/2026).',
      )
      return
    }
    if (iso === lastSavedCareDateIsoRef.current) return
    setSaving(true)
    setFormErr(null)
    try {
      const res = await apiFetch('/api/me/shop-settings/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basic_next_care_date: iso }),
      })
      if (!res.ok && isUpstreamErrorStatus(res.status)) return
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setFormErr(j.error ?? `Ошибка ${res.status}`)
        return
      }
      const j = (await res.json()) as ShopSettings
      lastSavedCareDateIsoRef.current = j.basic_next_care_date
      setNextCareDate(isoDateToDdMmYy(j.basic_next_care_date))
      setFormErr(null)
    } catch {
      setFormErr('Не удалось сохранить дату отсчёта ухода.')
    } finally {
      setSaving(false)
    }
  }

  const persistAcquiring = async () => {
    const v = parseMoneyInput(acqStr)
    if (typeof v !== 'number' || v < 0 || v > 100) {
      setFormErr('Эквайринг: от 0 до 100%.')
      void refresh()
      return
    }
    void patchSettings({ acquiring_rate_pct: v })
  }

  const persistSbp = async () => {
    const v = parseMoneyInput(sbpStr)
    if (typeof v !== 'number' || v < 0 || v > 100) {
      setFormErr('Комиссия СБП: от 0 до 100%.')
      void refresh()
      return
    }
    void patchSettings({ sbp_commission_rate_pct: v })
  }

  const persistTax = async () => {
    const tax = parseMoneyInput(taxStr)
    if (typeof tax !== 'number' || tax < 0 || tax > 100) {
      setFormErr('Налог: от 0 до 100%.')
      void refresh()
      return
    }
    void patchSettings({ tax_rate_pct: tax })
  }

  const showBasicInterval = mode === 'basic'
  const showCareAnchorDate = mode === 'basic'

  return (
    <div className="flowers-page flowers-page--expenses">
      <header className="expenses-page__head">
        <h1 className="flowers-page__title">Настройки магазина</h1>
      </header>

      {loadErr ? (
        <p className="expenses-page__banner-err" role="alert">
          {loadErr}
        </p>
      ) : null}

      {loading ? <div className="expenses-page__skel" aria-busy="true" /> : null}

      {!loading && !loadErr ? (
        <div className="expenses-page__sections">
          <section className="expenses-page__section" aria-labelledby="set-shop-h">
            <h2 id="set-shop-h" className="expenses-page__section-title">
              Магазин
            </h2>
            <div className="crm-form" style={{ maxWidth: '36rem' }}>
              <CrmTextField
                label="Название магазина"
                value={shopName}
                disabled={saving}
                placeholder="Как видят покупатели"
                autoComplete="organization"
                maxLength={120}
                hint="Показывается в витрине вместе с номером телефона."
                onChange={(e) => setShopName(e.target.value)}
                onBlur={() => void persistShopName()}
              />
            </div>
          </section>

          <section className="expenses-page__section" aria-labelledby="set-wh-h">
            <h2 id="set-wh-h" className="expenses-page__section-title">
              Склад
            </h2>
            <div style={{ maxWidth: '36rem', marginBottom: '1rem' }}>
              <CrmPickField
                label="Режим склада"
                value={mode}
                options={WAREHOUSE_MODE_OPTIONS}
                disabled={saving}
                placeholder="Выберите режим…"
                onChange={(next) => {
                  const m = parseWarehouseMode(next)
                  setMode(m)
                  void patchSettings({ warehouse_mode: m })
                }}
              />
            </div>
            {showBasicInterval ? (
              <div className="crm-form" style={{ marginBottom: '1rem' }}>
                <CrmQtyField
                  label="Интервал подрезки и воды, дней"
                  value={intervalDays}
                  disabled={saving}
                  min={1}
                  placeholder="3"
                  autoComplete="off"
                  maxLength={2}
                  wrapperClass="crm-field settings-page__interval-days-field"
                  onChange={(e) => setIntervalDays(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  onBlur={() => void persistIntervalDays()}
                />
              </div>
            ) : null}
            {showCareAnchorDate ? (
              <div className="crm-form" style={{ marginBottom: '1rem' }}>
                <CrmDateField
                  label="Дата отсчёта ухода"
                  value={nextCareDate}
                  disabled={saving}
                  careAnchor
                  dateAriaLabel="Дата отсчёта ухода"
                  hint="Шесть цифр: 19/05/26 или восемь: 19/05/2026. Пока дата не наступила — задач ухода на главной нет; можно указать дату в прошлом."
                  onChange={(v) => {
                    setNextCareDate(v)
                    if (formErr?.includes('дат')) setFormErr(null)
                  }}
                  onBlur={(e) => void persistNextCareDate(e.currentTarget.value)}
                />
              </div>
            ) : null}
            <div className="crm-form">
              <CrmQtyField
                label="Инвентаризация раз в, дней"
                value={inventoryIntervalDays}
                disabled={saving}
                min={1}
                placeholder="14"
                autoComplete="off"
                maxLength={2}
                wrapperClass="crm-field settings-page__interval-days-field"
                hint="Задача в блоке «Ещё» на главной, если с последней инвентаризации прошло столько дней."
                onChange={(e) =>
                  setInventoryIntervalDays(e.target.value.replace(/\D/g, '').slice(0, 2))
                }
                onBlur={() => void persistInventoryIntervalDays()}
              />
            </div>
          </section>

          <section className="expenses-page__section expenses-page__section--calc" aria-labelledby="set-rates-h">
            <h2 id="set-rates-h" className="expenses-page__section-title">
              Проценты для сводки расходов
            </h2>
            <div className="expenses-page__calc-list">
              <div className="expenses-page__calc-row expenses-page__calc-row--pct">
                <CrmMoneyField
                  label="Эквайринг, %"
                  wrapperClass="expenses-page__calc-pct-field"
                  value={acqStr}
                  disabled={saving}
                  onChange={(ev) => setAcqStr(ev.target.value)}
                  onBlur={() => void persistAcquiring()}
                />
              </div>
              <div className="expenses-page__calc-row expenses-page__calc-row--pct">
                <CrmMoneyField
                  label="Комиссия СБП, %"
                  wrapperClass="expenses-page__calc-pct-field"
                  value={sbpStr}
                  disabled={saving}
                  onChange={(ev) => setSbpStr(ev.target.value)}
                  onBlur={() => void persistSbp()}
                />
              </div>
              <div className="expenses-page__calc-row expenses-page__calc-row--pct">
                <CrmMoneyField
                  label="Налоги, %"
                  wrapperClass="expenses-page__calc-pct-field"
                  value={taxStr}
                  disabled={saving}
                  onChange={(ev) => setTaxStr(ev.target.value)}
                  onBlur={() => void persistTax()}
                />
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {formErr ? (
        <p className="expenses-page__banner-err expenses-page__banner-err--sticky" role="alert">
          {formErr}
        </p>
      ) : null}
    </div>
  )
}
