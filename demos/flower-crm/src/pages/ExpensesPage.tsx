import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api/apiFetch'
import { useCrmConfirm } from '../hooks/useCrmConfirm'
import { useAuth } from '../auth/AuthContext'
import { CrmButton } from '../components/ui/CrmButton'
import { CrmRowActions } from '../components/ui/CrmRowActions'
import { ReportPeriodControls } from '../components/report/ReportPeriodControls'
import { formatRubNumber, parseAmount } from '../utils/formatMoney'
import { isUpstreamErrorStatus } from '../utils/networkError'
import {
  defaultReportPeriod,
  periodQueryString,
  type ReportPeriodRange,
} from '../utils/reportPeriod'
import {
  ExpenseEntryModal,
  ExpensePayModal,
  useCrmDialogScrollLock,
  type ExpenseEntryInitial,
} from './warehouse'
import './flowersCatalog.css'
import './warehouse/stock/forms-fields.css'
import './warehouse/stock/modal-shell-taxons.css'
import './expensesPage.css'

type PeriodChoice = { value: string; label: string }

type ApiPayment = {
  id: number
  paid_at: string
  amount_rub: string
}

type ApiExpense = {
  id: number
  category: 'regular' | 'additional'
  name: string
  amount_rub: string
  allocated_rub?: string
  period: string
  expense_date: string | null
  due_day?: number
  due_date?: string
  paid_in_period?: boolean
  can_record_payment?: boolean
  payment_due?: boolean
  variable_amount?: boolean
  payments?: ApiPayment[]
}

function formatRegularAmount(row: ApiExpense): string {
  if (row.variable_amount || row.period === 'utilities') return 'по оплате'
  const n = parseAmount(row.amount_rub)
  if (n <= 0) return '—'
  return formatRubNumber(n)
}

type ExpensesApi = {
  report_days: number
  period: { from: string; to: string }
  rates: { acquiring_pct: string; sbp_commission_pct: string; tax_pct: string }
  period_choices: PeriodChoice[]
  sales: { revenue: string }
  computed: {
    acquiring: string
    sbp_fee: string
    tax: string
    mandatory_total: string
    purchase_total: string
    purchase_flowers_total: string
    purchase_retail_total: string
    purchase_consumables_total: string
    supplier_payout_total: string
    delivery_total: string
    waste_cost_total: string
    inventory_waste_total?: string
    manual_discard_total?: string
    inventory_loss_total: string
    goods_total: string
  }
  expenses: ApiExpense[]
  summary: {
    regular: string
    mandatory: string
    goods: string
    additional: string
    total: string
    independent?: string
    purchase?: string
  }
}

function formatDateRu(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function periodLabel(choices: PeriodChoice[], code: string): string {
  return choices.find((c) => c.value === code)?.label ?? code
}

const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function dueDayShortLabel(periodCode: string, dueDay: number): string {
  if (periodCode === 'weekly') {
    return WEEKDAY_SHORT[dueDay - 1] ?? String(dueDay)
  }
  return `${dueDay}-го`
}

function ExpenseAdditionalCard({
  row,
  onEdit,
  onDelete,
}: {
  row: ApiExpense
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="expenses-page__card">
      <p className="expenses-page__card-title">{row.name}</p>
      <p className="expenses-page__card-amt">{formatRubNumber(parseAmount(row.amount_rub))}</p>
      <div className="expenses-page__card-foot">
        <span className="expenses-page__card-date">
          {row.expense_date ? formatDateRu(row.expense_date) : '—'}
        </span>
        <CrmRowActions onEdit={onEdit} onDelete={onDelete} />
      </div>
    </li>
  )
}

function ExpenseRegularCard({
  row,
  periodChoices,
  onEdit,
  onDelete,
  onPay,
}: {
  row: ApiExpense
  periodChoices: PeriodChoice[]
  onEdit: () => void
  onDelete: () => void
  onPay: () => void
}) {
  return (
    <li className={row.can_record_payment ? 'expenses-page__card expenses-page__card--due' : 'expenses-page__card'}>
      <div className="expenses-page__card-head">
        <p className="expenses-page__card-title">{row.name}</p>
        <p className="expenses-page__card-amt">{formatRegularAmount(row)}</p>
        <div className="expenses-page__card-foot">
          {row.can_record_payment ? (
            <CrmButton variant="expensesRowPay" onClick={onPay}>
              Оплатить
            </CrmButton>
          ) : null}
          <CrmRowActions onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
      <dl className="expenses-page__card-details">
        <div className="expenses-page__card-detail">
          <dt>Период</dt>
          <dd>{periodLabel(periodChoices, row.period)}</dd>
        </div>
        <div className="expenses-page__card-detail">
          <dt>День оплаты</dt>
          <dd>{row.due_day != null ? dueDayShortLabel(row.period, row.due_day) : '—'}</dd>
        </div>
        <div className="expenses-page__card-detail">
          <dt>Статус</dt>
          <dd>
            {row.paid_in_period ? (
              <span className="expenses-page__paid-badge">Оплачено</span>
            ) : row.can_record_payment ? (
              <span className="expenses-page__due-badge">К оплате сегодня</span>
            ) : row.due_date ? (
              <span className="expenses-page__td-muted">{formatDateRu(row.due_date)}</span>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div className="expenses-page__card-detail">
          <dt>Начислено</dt>
          <dd>{row.allocated_rub ? formatRubNumber(parseAmount(row.allocated_rub)) : '—'}</dd>
        </div>
      </dl>
      {(row.payments?.length ?? 0) > 0 ? (
        <ul className="expenses-page__pay-history" aria-label={`История оплат: ${row.name}`}>
          {row.payments!.map((p) => (
            <li key={p.id}>
              <span>{formatDateRu(p.paid_at)}</span>
              <span>{formatRubNumber(parseAmount(p.amount_rub))} ₽</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function ExpensesPage() {
  useCrmDialogScrollLock()
  const { ask, dialog: confirmDialog } = useCrmConfirm()
  const { isOwner } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [period, setPeriod] = useState<ReportPeriodRange>(() => defaultReportPeriod())
  const [payload, setPayload] = useState<ExpensesApi | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [entryOpen, setEntryOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [modalCategory, setModalCategory] = useState<'regular' | 'additional'>('additional')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [entryInitial, setEntryInitial] = useState<ExpenseEntryInitial>({
    name: '',
    amountStr: '',
    periodCode: 'monthly',
    dueDayStr: '1',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [payRow, setPayRow] = useState<ApiExpense | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [paySaving, setPaySaving] = useState(false)

  const applyPayload = useCallback((j: ExpensesApi) => {
    setPayload(j)
    setLoadErr(null)
  }, [])

  const refresh = useCallback(async () => {
    const res = await apiFetch(`/api/me/expenses/?${periodQueryString(period)}`)
    if (res.status === 401) {
      setLoadErr('Войдите в систему.')
      setPayload(null)
      return
    }
    if (!res.ok && isUpstreamErrorStatus(res.status)) return
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      setLoadErr(j.error ?? `Ошибка ${res.status}`)
      return
    }
    applyPayload((await res.json()) as ExpensesApi)
  }, [applyPayload, period])

  useEffect(() => {
    let c = false
    setLoading(true)
    void refresh()
      .catch(() => {
        if (!c) setLoadErr('Не удалось загрузить данные.')
      })
      .finally(() => {
        if (!c) setLoading(false)
      })
    return () => {
      c = true
    }
  }, [refresh])

  const regularRows = useMemo(
    () => (payload?.expenses ?? []).filter((e) => e.category === 'regular'),
    [payload],
  )
  const addlRows = useMemo(
    () => (payload?.expenses ?? []).filter((e) => e.category === 'additional'),
    [payload],
  )

  const summary = useMemo(() => {
    if (!payload) return null
    const s = payload.summary
    return {
      regular: parseAmount(s.regular),
      mandatory: parseAmount(s.mandatory ?? s.independent ?? '0'),
      goods: parseAmount(s.goods ?? s.purchase ?? '0'),
      additional: parseAmount(s.additional),
      total: parseAmount(s.total),
    }
  }, [payload])

  const openPay = useCallback((row: ApiExpense) => {
    if (!row.can_record_payment) return
    setPayRow(row)
    setPayError(null)
  }, [])

  const openAdd = (cat: 'regular' | 'additional') => {
    setModalMode('add')
    setModalCategory(cat)
    setEditingId(null)
    setEntryInitial({
      name: '',
      amountStr: '',
      periodCode: 'monthly',
      dueDayStr: '1',
    })
    setFormError(null)
    setEntryOpen(true)
  }

  const openEdit = (row: ApiExpense) => {
    setModalMode('edit')
    setModalCategory(row.category)
    setEditingId(row.id)
    setEntryInitial({
      name: row.name,
      amountStr: String(parseAmount(row.amount_rub)).replace('.', ','),
      periodCode: row.period || 'monthly',
      dueDayStr: String(row.due_day ?? 1),
    })
    setFormError(null)
    setEntryOpen(true)
  }

  const closeEntry = () => {
    setEntryOpen(false)
    setSaving(false)
  }

  const closePay = () => {
    setPayRow(null)
    setPaySaving(false)
  }

  useEffect(() => {
    if (!isOwner) return
    const payId = searchParams.get('pay')
    if (!payId || !payload) return
    const id = Number(payId)
    if (!Number.isFinite(id)) return
    const row = payload.expenses.find((e) => e.id === id && e.category === 'regular')
    if (row?.can_record_payment) openPay(row)
    const next = new URLSearchParams(searchParams)
    next.delete('pay')
    setSearchParams(next, { replace: true })
  }, [isOwner, payload, searchParams, setSearchParams, openPay])

  const handlePaySubmit = async (amount: number) => {
    if (payRow == null) return
    setPaySaving(true)
    setPayError(null)
    try {
      const res = await apiFetch(`/api/me/expenses/${payRow.id}/payments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_rub: amount }),
      })
      const j = (await res.json().catch(() => ({}))) as ExpensesApi & { error?: string }
      if (!res.ok) {
        setPayError(j.error ?? `Ошибка ${res.status}`)
        return
      }
      applyPayload(j)
      closePay()
    } finally {
      setPaySaving(false)
    }
  }

  const handleEntrySubmit = async (values: {
    name: string
    amount: number
    periodCode: string
    dueDay: number
  }) => {
    setSaving(true)
    setFormError(null)
    try {
      if (modalMode === 'add') {
        const body: Record<string, unknown> = {
          category: modalCategory,
          name: values.name,
          amount_rub: values.amount,
        }
        if (modalCategory === 'regular') {
          body.period = values.periodCode
          body.due_day = values.dueDay
        }
        const res = await apiFetch('/api/me/expenses/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          setFormError(j.error ?? `Ошибка ${res.status}`)
          return
        }
      } else if (editingId != null) {
        const body: Record<string, unknown> = { name: values.name, amount_rub: values.amount }
        if (modalCategory === 'regular') {
          body.period = values.periodCode
          body.due_day = values.dueDay
        }
        const res = await apiFetch(`/api/me/expenses/${editingId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          setFormError(j.error ?? `Ошибка ${res.status}`)
          return
        }
      }
      await refresh()
      closeEntry()
    } finally {
      setSaving(false)
    }
  }

  const requestRemoveRow = (row: { id: number; name: string }) => {
    ask({
      title: `Удалить «${row.name}»?`,
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        const res = await apiFetch(`/api/me/expenses/${row.id}/`, { method: 'DELETE' })
        if (!res.ok) return
        await refresh()
      },
    })
  }

  return (
    <div className="flowers-page flowers-page--expenses">
      <header className="expenses-page__head">
        <h1 className="flowers-page__title">Расходы</h1>
        <ReportPeriodControls
          className="expenses-page__period"
          value={period}
          disabled={loading}
          onChange={setPeriod}
        />
      </header>

      {loadErr ? (
        <p className="expenses-page__banner-err" role="alert">
          {loadErr}
        </p>
      ) : null}

      {loading ? <div className="expenses-page__skel" aria-busy="true" /> : null}

      {!loading && payload && summary ? (
        <>
          <div className="expenses-page__kpi-row" aria-label="Сводка">
            <div className="expenses-page__kpi expenses-page__kpi--extra">
              <span className="expenses-page__kpi-lab">Дополнительно</span>
              <span className="expenses-page__kpi-val">{formatRubNumber(summary.additional)}</span>
            </div>
            {isOwner ? (
              <>
                <div className="expenses-page__kpi expenses-page__kpi--regular">
                  <span className="expenses-page__kpi-lab">Регулярные</span>
                  <span className="expenses-page__kpi-val">{formatRubNumber(summary.regular)}</span>
                </div>
                <div className="expenses-page__kpi expenses-page__kpi--indep">
                  <span className="expenses-page__kpi-lab">Обязательные</span>
                  <span className="expenses-page__kpi-val">{formatRubNumber(summary.mandatory)}</span>
                </div>
                <div className="expenses-page__kpi expenses-page__kpi--purchase">
                  <span className="expenses-page__kpi-lab">Товарные</span>
                  <span className="expenses-page__kpi-val">{formatRubNumber(summary.goods)}</span>
                </div>
              </>
            ) : null}
          </div>

          <p className="expenses-page__total-line">
            Итого: <strong>{formatRubNumber(summary.total)}</strong>
          </p>

          <div className="expenses-page__sections">
            <section className="expenses-page__section expenses-page__section--scroll" aria-labelledby="exp-addl-h">
              <div className="expenses-page__section-head">
                <h2 id="exp-addl-h" className="expenses-page__section-title">
                  Дополнительные
                </h2>
                <CrmButton variant="expensesSectionAdd" onClick={() => openAdd('additional')}>
                  Добавить
                </CrmButton>
              </div>
              <ul className="expenses-page__cards" aria-label="Дополнительные расходы">
                {addlRows.length === 0 ? (
                  <li className="expenses-page__cards-empty">Нет записей за период.</li>
                ) : (
                  addlRows.map((row) => (
                    <ExpenseAdditionalCard
                      key={row.id}
                      row={row}
                      onEdit={() => openEdit(row)}
                      onDelete={() => requestRemoveRow(row)}
                    />
                  ))
                )}
              </ul>
              <div className="expenses-page__table-wrap expenses-page__table-wrap--desktop">
                <table className="expenses-page__table">
                  <thead>
                    <tr>
                      <th scope="col">Дата</th>
                      <th scope="col">Статья</th>
                      <th scope="col">Сумма</th>
                      <th scope="col" className="expenses-page__th-actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {addlRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="expenses-page__td-empty">
                          Нет записей за период.
                        </td>
                      </tr>
                    ) : (
                      addlRows.map((row) => (
                        <tr key={row.id}>
                          <td className="expenses-page__td-date">
                            {row.expense_date ? formatDateRu(row.expense_date) : '—'}
                          </td>
                          <td>{row.name}</td>
                          <td className="expenses-page__td-num">{formatRubNumber(parseAmount(row.amount_rub))}</td>
                          <CrmRowActions
                            as="td"
                            className="expenses-page__td-actions"
                            onEdit={() => openEdit(row)}
                            onDelete={() => requestRemoveRow(row)}
                          />
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {isOwner ? (
              <section className="expenses-page__section" aria-labelledby="exp-reg-h">
                <div className="expenses-page__section-head">
                  <h2 id="exp-reg-h" className="expenses-page__section-title">
                    Регулярные
                  </h2>
                  <CrmButton variant="expensesSectionAdd" onClick={() => openAdd('regular')}>
                    Добавить
                  </CrmButton>
                </div>
                <ul className="expenses-page__cards" aria-label="Регулярные расходы">
                  {regularRows.length === 0 ? (
                    <li className="expenses-page__cards-empty">Нет статей.</li>
                  ) : (
                    regularRows.map((row) => (
                      <ExpenseRegularCard
                        key={row.id}
                        row={row}
                        periodChoices={payload.period_choices}
                        onEdit={() => openEdit(row)}
                        onDelete={() => requestRemoveRow(row)}
                        onPay={() => openPay(row)}
                      />
                    ))
                  )}
                </ul>
                <div className="expenses-page__table-wrap expenses-page__table-wrap--desktop">
                  <table className="expenses-page__table">
                    <thead>
                      <tr>
                        <th scope="col">Статья</th>
                        <th scope="col">Сумма</th>
                        <th scope="col">Период</th>
                        <th scope="col">День оплаты</th>
                        <th scope="col">Статус</th>
                        <th scope="col">Начислено</th>
                        <th scope="col" className="expenses-page__th-actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {regularRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="expenses-page__td-empty">
                            Нет статей.
                          </td>
                        </tr>
                      ) : (
                        regularRows.map((row) => (
                          <Fragment key={row.id}>
                            <tr className={row.can_record_payment ? 'expenses-page__tr--due' : undefined}>
                              <td>{row.name}</td>
                              <td className="expenses-page__td-num expenses-page__td-amount">
                                {formatRegularAmount(row)}
                              </td>
                              <td className="expenses-page__td-muted">
                                {periodLabel(payload.period_choices, row.period)}
                              </td>
                              <td className="expenses-page__td-muted">
                                {row.due_day != null ? dueDayShortLabel(row.period, row.due_day) : '—'}
                              </td>
                              <td className="expenses-page__td-status">
                                {row.paid_in_period ? (
                                  <span className="expenses-page__paid-badge">Оплачено</span>
                                ) : row.can_record_payment ? (
                                  <span className="expenses-page__due-badge">К оплате сегодня</span>
                                ) : row.due_date ? (
                                  <span className="expenses-page__td-muted">{formatDateRu(row.due_date)}</span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="expenses-page__td-num">
                                {row.allocated_rub ? formatRubNumber(parseAmount(row.allocated_rub)) : '—'}
                              </td>
                              <CrmRowActions
                                as="td"
                                className="expenses-page__td-actions"
                                leading={
                                  row.can_record_payment ? (
                                    <CrmButton variant="expensesRowPay" onClick={() => openPay(row)}>
                                      Оплатить
                                    </CrmButton>
                                  ) : null
                                }
                                onEdit={() => openEdit(row)}
                                onDelete={() => requestRemoveRow(row)}
                              />
                            </tr>
                            {(row.payments?.length ?? 0) > 0 ? (
                              <tr className="expenses-page__history-row">
                                <td colSpan={7}>
                                  <ul className="expenses-page__pay-history" aria-label={`История оплат: ${row.name}`}>
                                    {row.payments!.map((p) => (
                                      <li key={p.id}>
                                        <span>{formatDateRu(p.paid_at)}</span>
                                        <span>{formatRubNumber(parseAmount(p.amount_rub))} ₽</span>
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {isOwner ? (
              <>
                <section className="expenses-page__section expenses-page__section--calc" aria-labelledby="exp-mandatory-h">
                  <h2 id="exp-mandatory-h" className="expenses-page__section-title">
                    Обязательные
                  </h2>
                  <div className="expenses-page__calc-list">
                    <div className="expenses-page__calc-row expenses-page__calc-row--pct">
                      <span className="expenses-page__calc-name">
                        Эквайринг ({payload.rates.acquiring_pct}% от оплат картой)
                      </span>
                      <span className="expenses-page__calc-amt">
                        {formatRubNumber(parseAmount(payload.computed.acquiring))}
                      </span>
                    </div>
                    <div className="expenses-page__calc-row expenses-page__calc-row--pct">
                      <span className="expenses-page__calc-name">
                        Комиссия СБП ({payload.rates.sbp_commission_pct}% от оплат СБП)
                      </span>
                      <span className="expenses-page__calc-amt">
                        {formatRubNumber(parseAmount(payload.computed.sbp_fee))}
                      </span>
                    </div>
                    <div className="expenses-page__calc-row expenses-page__calc-row--pct">
                      <span className="expenses-page__calc-name">
                        Налог ({payload.rates.tax_pct}% от всей выручки)
                      </span>
                      <span className="expenses-page__calc-amt">
                        {formatRubNumber(parseAmount(payload.computed.tax))}
                      </span>
                    </div>
                  </div>
                </section>
                <section className="expenses-page__section expenses-page__section--calc" aria-labelledby="exp-goods-h">
                  <h2 id="exp-goods-h" className="expenses-page__section-title">
                    Товарные
                  </h2>
                  <div className="expenses-page__calc-list">
                    <div className="expenses-page__calc-row expenses-page__calc-row--purchase">
                      <span className="expenses-page__calc-name">Закупка цветов</span>
                      <span className="expenses-page__calc-amt expenses-page__calc-amt--solo">
                        {formatRubNumber(parseAmount(payload.computed.purchase_flowers_total ?? '0'))}
                      </span>
                    </div>
                    <div className="expenses-page__calc-row expenses-page__calc-row--purchase">
                      <span className="expenses-page__calc-name">Закупка товаров</span>
                      <span className="expenses-page__calc-amt expenses-page__calc-amt--solo">
                        {formatRubNumber(parseAmount(payload.computed.purchase_retail_total ?? '0'))}
                      </span>
                    </div>
                    <div className="expenses-page__calc-row expenses-page__calc-row--purchase">
                      <span className="expenses-page__calc-name">Закупка расходников</span>
                      <span className="expenses-page__calc-amt expenses-page__calc-amt--solo">
                        {formatRubNumber(parseAmount(payload.computed.purchase_consumables_total ?? '0'))}
                      </span>
                    </div>
                    <div className="expenses-page__calc-row expenses-page__calc-row--pct">
                      <span className="expenses-page__calc-name">Поставщику (реализация)</span>
                      <span className="expenses-page__calc-amt">
                        {formatRubNumber(parseAmount(payload.computed.supplier_payout_total))}
                      </span>
                    </div>
                    <div className="expenses-page__calc-row expenses-page__calc-row--pct">
                      <span className="expenses-page__calc-name">Доставка</span>
                      <span className="expenses-page__calc-amt">
                        {formatRubNumber(parseAmount(payload.computed.delivery_total))}
                      </span>
                    </div>
                    <div className="expenses-page__calc-row expenses-page__calc-row--pct">
                      <span className="expenses-page__calc-name">
                        Утиль (по себестоимости)
                        <span className="expenses-page__calc-sub">
                          со склада{' '}
                          {formatRubNumber(parseAmount(payload.computed.manual_discard_total ?? '0'))}, при
                          инвентаризации{' '}
                          {formatRubNumber(parseAmount(payload.computed.inventory_waste_total ?? '0'))}
                        </span>
                      </span>
                      <span className="expenses-page__calc-amt">
                        {formatRubNumber(parseAmount(payload.computed.waste_cost_total))}
                      </span>
                    </div>
                    <div className="expenses-page__calc-row expenses-page__calc-row--pct">
                      <span className="expenses-page__calc-name">
                        Потери при инвентаризации
                        <span className="expenses-page__calc-sub">учёт минус факт, без «В утиль»</span>
                      </span>
                      <span className="expenses-page__calc-amt">
                        {formatRubNumber(parseAmount(payload.computed.inventory_loss_total))}
                      </span>
                    </div>
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </>
      ) : null}


      <ExpenseEntryModal
        open={entryOpen}
        mode={modalMode}
        category={modalCategory}
        periodChoices={payload?.period_choices ?? []}
        initial={entryInitial}
        busy={saving}
        error={formError}
        onClose={closeEntry}
        onSubmit={handleEntrySubmit}
      />

      <ExpensePayModal
        open={payRow != null}
        expenseName={payRow?.name ?? ''}
        defaultAmountStr={
          payRow && !payRow.variable_amount && parseAmount(payRow.amount_rub) > 0
            ? String(parseAmount(payRow.amount_rub)).replace('.', ',')
            : ''
        }
        variableAmount={payRow?.variable_amount ?? payRow?.period === 'utilities'}
        busy={paySaving}
        error={payError}
        onClose={closePay}
        onSubmit={handlePaySubmit}
      />

      {confirmDialog}
    </div>
  )
}
