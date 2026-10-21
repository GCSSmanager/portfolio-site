import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/apiFetch'
import { useAuth } from '../../auth/AuthContext'
import { CrmInlineQtyField } from '../../components/form/CrmInlineQtyField'
import { CrmButton } from '../../components/ui/CrmButton'
import { StoreFlowerThumb } from '../../components/ui/StoreFlowerThumb'
import { isUpstreamErrorStatus } from '../../utils/networkError'
import { validateDiscardRealizationQty } from '../../utils/discardRealizationQty'
import '../warehouse.css'
import './stock/forms-fields.css'
import './stock/warehouse-stock-list.css'

export type InventorySnapshotLine = {
  line_key: string
  stock_kind: 'flower' | 'retail' | 'bouquet'
  store_flower_id?: number | null
  flower_batch_id?: number | null
  retail_product_id?: number | null
  bouquet_id?: number | null
  display_name: string
  rank_label?: string
  photo_url?: string | null
  system_quantity: number
  system_realization_quantity?: number
}

type InventorySnapshotResponse = {
  inventory_periodic_due?: boolean
  inventory_interval_days?: number
  last_inventory_completed_at?: string | null
  lines: InventorySnapshotLine[]
}

type InventoryHistoryRow = {
  id: number
  completed_at: string
  line_count: number
  adjusted_count: number
}

type InventoryDetailLine = {
  id: number
  stock_kind: string
  display_name: string
  system_quantity: number
  counted_quantity: number
  waste_quantity: number
  stock_quantity: number
}

type InventoryDetail = InventoryHistoryRow & { lines: InventoryDetailLine[] }

type LineDraft = {
  lineKey: string
  stockKind: InventorySnapshotLine['stock_kind']
  photoUrl: string | null
  displayName: string
  rankLabel: string
  system: number
  systemRealization: number
  counted: string
  waste: string
  realizationFromRealization: string
}

function parseQty(s: string): number | null {
  const t = s.trim()
  if (t === '') return null
  const n = Number.parseInt(t, 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function formatDateTimeRu(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function draftsFromLines(lines: InventorySnapshotLine[]): LineDraft[] {
  return lines.map((l) => ({
    lineKey: l.line_key,
    stockKind: l.stock_kind,
    photoUrl: l.photo_url ?? null,
    displayName: l.display_name,
    rankLabel: l.rank_label ?? '',
    system: l.system_quantity,
    systemRealization: l.system_realization_quantity ?? 0,
    counted: String(l.system_quantity),
    waste: '0',
    realizationFromRealization: '0',
  }))
}

function inventoryThumbVariant(
  stockKind: LineDraft['stockKind'],
): 'flower' | 'retail' | 'bouquet' {
  if (stockKind === 'retail') return 'retail'
  if (stockKind === 'bouquet') return 'bouquet'
  return 'flower'
}

function InventoryLineThumb({ d }: { d: LineDraft }) {
  return (
    <div className="warehouse-stock-row__thumb" aria-hidden>
      <StoreFlowerThumb
        url={d.photoUrl}
        alt={d.displayName}
        size={48}
        variant={inventoryThumbVariant(d.stockKind)}
        className="warehouse-stock-row__img"
      />
    </div>
  )
}

function inventoryShortfall(d: LineDraft): number | null {
  const counted = parseQty(d.counted)
  const waste = parseQty(d.waste)
  if (counted === null || waste === null) return null
  if (waste > counted) return null
  const stockQty = Math.max(0, counted - waste)
  return Math.max(0, d.system - stockQty)
}

function inventoryLineViewModel(d: LineDraft) {
  const counted = parseQty(d.counted)
  const wasteParsed = parseQty(d.waste)
  const wasteInvalid =
    counted != null && wasteParsed != null && wasteParsed > counted
  const onStock =
    counted != null && !wasteInvalid ? Math.max(0, counted - (wasteParsed ?? 0)) : null
  const shortfall = inventoryShortfall(d)
  const showRealization = shortfall != null && shortfall > 0 && d.systemRealization > 0
  const wasteRqTrim = d.realizationFromRealization.trim()
  const wasteRq = wasteRqTrim === '' ? 0 : parseQty(d.realizationFromRealization)
  const realizationIssue =
    showRealization && shortfall != null && wasteRq != null
      ? validateDiscardRealizationQty(shortfall, wasteRq, d.systemRealization, d.system)
      : null
  const realizationLeft =
    showRealization &&
    wasteRq != null &&
    wasteRq >= 0 &&
    wasteRq <= d.systemRealization &&
    realizationIssue == null
      ? d.systemRealization - wasteRq
      : null
  return {
    counted,
    wasteParsed,
    wasteInvalid,
    onStock,
    shortfall,
    showRealization,
    wasteRq,
    realizationIssue,
    realizationLeft,
  }
}

type InventoryDraftCardProps = {
  d: LineDraft
  issue: string | null
  onCounted: (v: string) => void
  onWaste: (v: string) => void
  onRealization: (v: string) => void
}

function InventoryDraftCard({ d, issue, onCounted, onWaste, onRealization }: InventoryDraftCardProps) {
  const vm = inventoryLineViewModel(d)
  const {
    counted,
    wasteInvalid,
    onStock,
    showRealization,
    shortfall,
    realizationIssue,
    realizationLeft,
  } = vm

  return (
    <li className={`crm-inventory-card${issue != null ? ' crm-inventory-card--invalid' : ''}`}>
      <div className="crm-inventory-card__head">
        <InventoryLineThumb d={d} />
        <div className="crm-inventory-card__head-text">
          <p className="crm-inventory-card__title">{d.displayName}</p>
          {d.rankLabel ? <p className="crm-inventory-card__rank">{d.rankLabel}</p> : null}
        </div>
      </div>
      <div className="crm-inventory-card__row">
        <span className="crm-inventory-card__label">По учёту</span>
        <span className="crm-inventory-card__system">
          {d.system}
          <span className="crm-supplier-receive-table__unit"> шт</span>
        </span>
      </div>
      <div className="crm-inventory-card__row crm-inventory-card__row--field">
        <span className="crm-inventory-card__label">Факт</span>
        <div className="crm-inventory-card__control">
          <CrmInlineQtyField
            value={d.counted}
            onChange={(e) => onCounted(e.target.value)}
            min={0}
            wrapperClass="crm-supplier-receive-table__qty"
            aria-label={`Факт: ${d.displayName}`}
          />
          {onStock != null ? (
            <span className="crm-supplier-receive-table__stock-hint">на склад: {onStock}</span>
          ) : null}
        </div>
      </div>
      <div className="crm-inventory-card__row crm-inventory-card__row--field">
        <span className="crm-inventory-card__label">В утиль</span>
        <div className="crm-inventory-card__control">
          <CrmInlineQtyField
            value={d.waste}
            onChange={(e) => onWaste(e.target.value)}
            min={0}
            max={counted != null && counted > 0 ? counted : undefined}
            invalid={wasteInvalid}
            wrapperClass="crm-supplier-receive-table__qty crm-supplier-receive-table__qty--defect"
            aria-label={`В утиль: ${d.displayName}`}
          />
        </div>
      </div>
      {showRealization ? (
        <div className="crm-inventory-card__row crm-inventory-card__row--field">
          <span className="crm-inventory-card__label">Утиль из реализации</span>
          <div className="crm-inventory-card__control">
            <CrmInlineQtyField
              value={d.realizationFromRealization}
              onChange={(e) => onRealization(e.target.value)}
              min={0}
              max={Math.min(d.systemRealization, shortfall ?? 0)}
              invalid={realizationIssue != null}
              wrapperClass="crm-supplier-receive-table__qty"
              aria-label={`Утиль из реализации: ${d.displayName}`}
            />
            {realizationIssue ? (
              <p className="crm-field__error" role="alert">
                {realizationIssue}
              </p>
            ) : realizationLeft != null ? (
              <span className="crm-supplier-receive-table__stock-hint">
                Останется на реализации: {realizationLeft} шт.
              </span>
            ) : (
              <span className="crm-supplier-receive-table__stock-hint">
                По реализации на складе: {d.systemRealization} шт.
              </span>
            )}
          </div>
        </div>
      ) : null}
      {issue ? (
        <p className="crm-field__error crm-inventory-card__issue" role="alert">
          {issue}
        </p>
      ) : null}
    </li>
  )
}

function InventoryHistoryDetailCards({ lines }: { lines: InventoryDetailLine[] }) {
  return (
    <ul className="crm-inventory-detail-cards">
      {lines.map((ln) => {
        const onStock = ln.stock_quantity ?? ln.counted_quantity - ln.waste_quantity
        const changed = onStock !== ln.system_quantity || ln.waste_quantity > 0
        return (
          <li
            key={ln.id}
            className={
              changed
                ? 'crm-inventory-detail-card crm-inventory-detail-card--changed'
                : 'crm-inventory-detail-card'
            }
          >
            <p className="crm-inventory-card__title">{ln.display_name}</p>
            <dl className="crm-inventory-detail-card__grid">
              <div className="crm-inventory-detail-card__item">
                <dt>Учёт</dt>
                <dd>{ln.system_quantity}</dd>
              </div>
              <div className="crm-inventory-detail-card__item">
                <dt>Факт</dt>
                <dd>{ln.counted_quantity}</dd>
              </div>
              <div className="crm-inventory-detail-card__item">
                <dt>Утиль</dt>
                <dd>{ln.waste_quantity}</dd>
              </div>
              <div className="crm-inventory-detail-card__item">
                <dt>На склад</dt>
                <dd>{onStock}</dd>
              </div>
            </dl>
          </li>
        )
      })}
    </ul>
  )
}

function InventoryHistoryDetailTable({ lines }: { lines: InventoryDetailLine[] }) {
  return (
    <table className="crm-supplier-receive-table crm-inventory-table crm-inventory-table--history">
      <thead>
        <tr>
          <th scope="col">Товар</th>
          <th scope="col" className="crm-supplier-receive-table__num">
            Учёт
          </th>
          <th scope="col" className="crm-supplier-receive-table__num">
            Факт
          </th>
          <th scope="col" className="crm-supplier-receive-table__num">
            Утиль
          </th>
          <th scope="col" className="crm-supplier-receive-table__num">
            На склад
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((ln) => {
          const onStock = ln.stock_quantity ?? ln.counted_quantity - ln.waste_quantity
          return (
            <tr
              key={ln.id}
              className={
                onStock !== ln.system_quantity || ln.waste_quantity > 0
                  ? 'crm-inventory-table__row--changed'
                  : undefined
              }
            >
              <td>{ln.display_name}</td>
              <td className="crm-supplier-receive-table__num">{ln.system_quantity}</td>
              <td className="crm-supplier-receive-table__num">{ln.counted_quantity}</td>
              <td className="crm-supplier-receive-table__num">{ln.waste_quantity}</td>
              <td className="crm-supplier-receive-table__num">{onStock}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function WarehouseInventoryPage() {
  const navigate = useNavigate()
  const { isOwner } = useAuth()

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<LineDraft[]>([])
  const [meta, setMeta] = useState<{
    due: boolean
    intervalDays: number
    lastCompleted: string | null
  }>({ due: false, intervalDays: 14, lastCompleted: null })
  const [history, setHistory] = useState<InventoryHistoryRow[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detailById, setDetailById] = useState<Record<number, InventoryDetail>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setPageError(null)
    setLoading(true)
    try {
      const [snapRes, histRes] = await Promise.all([
        apiFetch('/api/me/stock/inventory/'),
        apiFetch('/api/me/stock/inventory/history/'),
      ])
      if (!snapRes.ok) {
        if (isUpstreamErrorStatus(snapRes.status)) {
          setPageError('Сервер недоступен. Попробуйте позже.')
          return
        }
        const j = (await snapRes.json().catch(() => ({}))) as { error?: string }
        setPageError(j.error ?? `Ошибка ${snapRes.status}`)
        return
      }
      const snap = (await snapRes.json()) as InventorySnapshotResponse
      setDrafts(draftsFromLines(snap.lines ?? []))
      setMeta({
        due: Boolean(snap.inventory_periodic_due),
        intervalDays: snap.inventory_interval_days ?? 14,
        lastCompleted: snap.last_inventory_completed_at ?? null,
      })
      if (histRes.ok) {
        const h = (await histRes.json()) as { history?: InventoryHistoryRow[] }
        setHistory(h.history ?? [])
      }
    } catch {
      setPageError('Не удалось загрузить данные инвентаризации.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isOwner) {
      navigate('/warehouse', { replace: true })
      return
    }
    void load()
  }, [isOwner, load, navigate])

  const lineIssues = useMemo(() => {
    return drafts.map((d) => {
      const counted = parseQty(d.counted)
      const waste = parseQty(d.waste)
      if (counted === null || waste === null) return null
      if (waste > counted) return 'В утиль не может быть больше факта.'
      const shortfall = inventoryShortfall(d)
      if (shortfall != null && shortfall > 0 && d.systemRealization > 0) {
        const rqRaw = d.realizationFromRealization.trim()
        const rq = rqRaw === '' ? 0 : parseQty(d.realizationFromRealization)
        if (rq === null) return 'Укажите целое число ≥ 0 в «утиль из реализации».'
        const err = validateDiscardRealizationQty(shortfall, rq, d.systemRealization, d.system)
        if (err) return err
      }
      return null
    })
  }, [drafts])

  const canSubmit = useMemo(() => {
    if (drafts.length === 0) return false
    if (lineIssues.some((m) => m != null)) return false
    return drafts.every((d) => parseQty(d.counted) !== null && parseQty(d.waste) !== null)
  }, [drafts, lineIssues])

  const setCounted = (lineKey: string, v: string) => {
    setDrafts((prev) => prev.map((d) => (d.lineKey === lineKey ? { ...d, counted: v } : d)))
    setLocalError(null)
  }

  const setWaste = (lineKey: string, v: string) => {
    setDrafts((prev) => prev.map((d) => (d.lineKey === lineKey ? { ...d, waste: v } : d)))
    setLocalError(null)
  }

  const setRealizationFromRealization = (lineKey: string, v: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.lineKey === lineKey ? { ...d, realizationFromRealization: v } : d)),
    )
    setLocalError(null)
  }

  const toggleHistory = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (detailById[id]) return
    setDetailLoadingId(id)
    try {
      const res = await apiFetch(`/api/me/stock/inventory/${id}/`)
      if (res.ok) {
        const detail = (await res.json()) as InventoryDetail
        setDetailById((m) => ({ ...m, [id]: detail }))
      }
    } finally {
      setDetailLoadingId(null)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const lines: Array<{
      line_key: string
      counted_quantity: number
      waste_quantity: number
      realization_quantity?: number
    }> = []
    for (const d of drafts) {
      const counted = parseQty(d.counted)
      const waste = parseQty(d.waste)
      if (counted === null || waste === null) {
        setLocalError('Укажите целые числа ≥ 0 в «Факт» и «В утиль».')
        return
      }
      const row: {
        line_key: string
        counted_quantity: number
        waste_quantity: number
        realization_quantity?: number
      } = { line_key: d.lineKey, counted_quantity: counted, waste_quantity: waste }
      const shortfall = inventoryShortfall(d)
      if (shortfall != null && shortfall > 0 && d.systemRealization > 0) {
        const rq = parseQty(d.realizationFromRealization)
        if (rq === null) {
          setLocalError('Укажите целые числа ≥ 0 в «утиль из реализации».')
          return
        }
        if (rq > 0) row.realization_quantity = rq
      }
      lines.push(row)
    }
    setBusy(true)
    setLocalError(null)
    try {
      const res = await apiFetch('/api/me/stock/inventory/complete/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setLocalError(j.error ?? `Ошибка ${res.status}`)
        return
      }
      await load()
    } catch {
      setLocalError('Не удалось сохранить инвентаризацию.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flowers-page warehouse-page warehouse-inventory-page">
      <div className="crm-shell">
        <header className="crm-page-head crm-page-head--warehouse">
          <div className="crm-page-head__top">
            <h1 className="crm-page-head__title">Инвентаризация</h1>
          </div>
        </header>

        {pageError ? (
          <div className="crm-alert" role="alert">
            {pageError}
          </div>
        ) : null}

        {loading ? <p className="crm-care-empty">Загрузка…</p> : null}

        {!loading && !pageError ? (
          <>
            <p className="crm-inventory-lead">
              Сверьте остатки по учёту с фактом на полке. На склад попадёт «Факт» минус «В утиль». После сохранения
              остатки обновятся, запись попадёт в историю ниже.
              {meta.due ? (
                <span className="crm-inventory-lead__due"> · пора провести (раз в {meta.intervalDays} дн.)</span>
              ) : null}
              {meta.lastCompleted ? (
                <span className="crm-inventory-lead__meta">
                  {' '}
                  · последняя: {formatDateTimeRu(meta.lastCompleted)}
                </span>
              ) : null}
            </p>

            {drafts.length === 0 ? (
              <p className="crm-care-empty">На складе нет остатков для пересчёта.</p>
            ) : (
              <form className="crm-inventory-form" onSubmit={(e) => void submit(e)}>
                {localError ? (
                  <p className="crm-field__error" role="alert">
                    {localError}
                  </p>
                ) : null}
                <ul className="crm-inventory-cards" aria-label="Позиции инвентаризации">
                  {drafts.map((d, i) => (
                    <InventoryDraftCard
                      key={d.lineKey}
                      d={d}
                      issue={lineIssues[i]}
                      onCounted={(v) => setCounted(d.lineKey, v)}
                      onWaste={(v) => setWaste(d.lineKey, v)}
                      onRealization={(v) => setRealizationFromRealization(d.lineKey, v)}
                    />
                  ))}
                </ul>
                <div className="crm-inventory-table-wrap crm-inventory-table-wrap--desktop">
                  <table className="crm-supplier-receive-table crm-inventory-table">
                    <thead>
                      <tr>
                        <th scope="col">Товар</th>
                        <th scope="col" className="crm-supplier-receive-table__num">
                          По учёту
                        </th>
                        <th scope="col" className="crm-supplier-receive-table__num">
                          Факт
                        </th>
                        <th scope="col" className="crm-supplier-receive-table__num">
                          В утиль
                        </th>
                        <th scope="col" className="crm-supplier-receive-table__num">
                          Утиль из реализации
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {drafts.map((d, i) => {
                        const issue = lineIssues[i]
                        const vm = inventoryLineViewModel(d)
                        const {
                          counted,
                          wasteInvalid,
                          onStock,
                          showRealization,
                          shortfall,
                          realizationIssue,
                          realizationLeft,
                        } = vm
                        return (
                          <tr
                            key={d.lineKey}
                            className={
                              issue != null ? 'crm-supplier-receive-table__row--invalid' : undefined
                            }
                          >
                            <td className="crm-supplier-receive-table__name">
                              <div className="crm-inventory-table__name-cell">
                                <InventoryLineThumb d={d} />
                                <div className="crm-inventory-table__name-text">
                                  <span className="crm-inventory-table__name">{d.displayName}</span>
                                  {d.rankLabel ? (
                                    <span className="crm-inventory-table__rank">{d.rankLabel}</span>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="crm-supplier-receive-table__num">
                              <span className="crm-supplier-receive-table__ordered">{d.system}</span>
                              <span className="crm-supplier-receive-table__unit"> шт</span>
                            </td>
                            <td className="crm-supplier-receive-table__num">
                              <CrmInlineQtyField
                                value={d.counted}
                                onChange={(e) => setCounted(d.lineKey, e.target.value)}
                                min={0}
                                wrapperClass="crm-supplier-receive-table__qty"
                                aria-label={`Факт: ${d.displayName}`}
                              />
                              {onStock != null ? (
                                <span className="crm-supplier-receive-table__stock-hint">
                                  на склад: {onStock}
                                </span>
                              ) : null}
                            </td>
                            <td className="crm-supplier-receive-table__num">
                              <CrmInlineQtyField
                                value={d.waste}
                                onChange={(e) => setWaste(d.lineKey, e.target.value)}
                                min={0}
                                max={counted != null && counted > 0 ? counted : undefined}
                                invalid={wasteInvalid}
                                wrapperClass="crm-supplier-receive-table__qty crm-supplier-receive-table__qty--defect"
                                aria-label={`В утиль: ${d.displayName}`}
                              />
                            </td>
                            <td className="crm-supplier-receive-table__num">
                              {showRealization ? (
                                <>
                                  <CrmInlineQtyField
                                    value={d.realizationFromRealization}
                                    onChange={(e) =>
                                      setRealizationFromRealization(d.lineKey, e.target.value)
                                    }
                                    min={0}
                                    max={Math.min(d.systemRealization, shortfall ?? 0)}
                                    invalid={realizationIssue != null}
                                    wrapperClass="crm-supplier-receive-table__qty"
                                    aria-label={`Утиль из реализации: ${d.displayName}`}
                                  />
                                  {realizationIssue ? (
                                    <p className="crm-field__error" role="alert">
                                      {realizationIssue}
                                    </p>
                                  ) : realizationLeft != null ? (
                                    <span className="crm-supplier-receive-table__stock-hint">
                                      Останется на реализации: {realizationLeft} шт.
                                    </span>
                                  ) : (
                                    <span className="crm-supplier-receive-table__stock-hint">
                                      По реализации на складе: {d.systemRealization} шт.
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="crm-supplier-receive-table__unit">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="crm-inventory-form__actions">
                  <CrmButton type="submit" variant="add" disabled={!canSubmit || busy}>
                    {busy ? 'Сохранение…' : 'Сохранить инвентаризацию'}
                  </CrmButton>
                </div>
              </form>
            )}

            <section className="crm-inventory-history" aria-labelledby="crm-inventory-history-title">
              <h2 id="crm-inventory-history-title" className="crm-block__title">
                История
              </h2>
              {history.length === 0 ? (
                <p className="crm-care-empty">Пока нет завершённых инвентаризаций.</p>
              ) : (
                <ul className="crm-inventory-history__list">
                  {history.map((row) => {
                    const open = expandedId === row.id
                    const detail = detailById[row.id]
                    return (
                      <li key={row.id} className="crm-inventory-history__item">
                        <CrmButton
                          variant="inventoryHistoryHead"
                          aria-expanded={open}
                          onClick={() => void toggleHistory(row.id)}
                        >
                          <span className="crm-inventory-history__date">{formatDateTimeRu(row.completed_at)}</span>
                          <span className="crm-inventory-history__meta">
                            {row.line_count} поз.
                            {row.adjusted_count > 0 ? ` · расхождений: ${row.adjusted_count}` : ' · без расхождений'}
                          </span>
                          <span className="crm-inventory-history__chev" aria-hidden>
                            {open ? '▼' : '▶'}
                          </span>
                        </CrmButton>
                        {open ? (
                          <div className="crm-inventory-history__panel">
                            {detailLoadingId === row.id && !detail ? (
                              <p className="crm-care-empty">Загрузка…</p>
                            ) : detail ? (
                              <>
                                <InventoryHistoryDetailCards lines={detail.lines} />
                                <div className="crm-inventory-table-wrap crm-inventory-table-wrap--desktop">
                                  <InventoryHistoryDetailTable lines={detail.lines} />
                                </div>
                              </>
                            ) : (
                              <p className="crm-care-empty">Не удалось загрузить детали.</p>
                            )}
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}