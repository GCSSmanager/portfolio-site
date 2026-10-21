import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { apiFetch } from '../../api/apiFetch'
import { CrmButton } from '../../components/ui/CrmButton'
import { ReportPeriodControls } from '../../components/report/ReportPeriodControls'
import { formatPct, formatRub, parseAmount } from '../../utils/formatMoney'
import { isUpstreamErrorStatus } from '../../utils/networkError'
import {
  chartXTickIndices,
  chartXTickIndicesEveryOther,
  defaultReportPeriod,
  formatChartTooltipDate,
  formatChartXAxisLabel,
  inclusiveDayCount,
  periodQueryString,
  type ReportPeriodRange,
} from '../../utils/reportPeriod'

type DaySummary = {
  date: string
  total_quantity: number
  total_amount: string
  total_cost: string
  total_supplier_payout?: string
  total_profit: string
  total_delivery_amount?: string
  sales_count: number
}

type TaxonRow = {
  kind?: 'flower' | 'retail' | 'bouquet' | 'custom_bouquet'
  taxon_id?: number
  retail_product_id?: number
  bouquet_id?: number
  display_name: string
  latin_name: string
  quantity: number
  total_amount: string
  total_cost: string
  total_supplier_payout?: string
  total_profit: string
}

type StatsExpenseLine = {
  key: string
  label: string
  amount: string
  kind?: 'income' | 'expense'
}

type StatsExpenseSection = {
  key: string
  title: string
  description: string
  total: string
  net?: string
  lines: StatsExpenseLine[]
}

const EXPENSE_SECTION_TITLE: Record<string, string> = {
  in_shop_profit: 'Закупки по приходу',
  beyond_shop_profit: 'Прочие',
}

const EXPENSE_LINE_ORDER = [
  'purchase_flowers',
  'purchase_retail',
  'purchase_consumables',
  'purchase',
  'supplier_payout',
  'delivery_expense',
  'delivery',
  'waste',
  'inventory_waste',
  'manual_discard',
  'inventory_loss',
  'acquiring',
  'sbp_fee',
  'tax',
  'regular',
  'additional',
] as const

const EXPENSE_LINE_LABEL: Record<string, string> = {
  purchase_flowers: 'Закупка цветов',
  purchase_retail: 'Закупка товаров',
  purchase_consumables: 'Закупка расходников',
  purchase: 'Закупки (всего)',
  supplier_payout: 'Поставщики',
  delivery_expense: 'Курьерам',
  delivery: 'Курьерам',
  waste: 'Утиль',
  inventory_waste: 'Утиль (инвентаризация)',
  manual_discard: 'Утиль (ручной)',
  inventory_loss: 'Потери',
  acquiring: 'Эквайринг',
  sbp_fee: 'СБП',
  tax: 'Налог',
  regular: 'Регулярные',
  additional: 'Дополнительные',
}

type StatsExpensesReconciliation = {
  total_revenue: string
  sales_revenue: string
  delivery_revenue: string
  shop_profit: string
  in_shop_total: string
  sales_revenue_minus_shop_profit: string
  matches_shop_profit: boolean
}

type StatsExpenses = {
  total: string
  net_profit?: string
  reconciliation?: StatsExpensesReconciliation
  sections?: StatsExpenseSection[]
  summary: {
    regular: string
    mandatory: string
    goods: string
    additional: string
    total: string
  }
  breakdown: {
    regular: string
    mandatory: string
    additional: string
    goods: string
    purchase: string
    purchase_flowers?: string
    purchase_retail?: string
    purchase_consumables?: string
    supplier_payout: string
    delivery: string
    waste: string
    inventory_waste: string
    manual_discard: string
    inventory_loss: string
    acquiring: string
    sbp_fee: string
    tax: string
  }
  sales_in_period: {
    revenue: string
    cost: string
    profit: string
    sales_count: number
  }
}

type TaxonSortKey = 'quantity' | 'amount' | 'supplier' | 'profit'
type TaxonSortDir = 'asc' | 'desc'

type RangeResponse = {
  days: number
  from: string
  to: string
  by_day: DaySummary[]
  totals?: {
    total_quantity: number
    total_amount: string
    sales_revenue?: string
    total_cost: string
    total_supplier_payout?: string
    total_profit: string
    total_delivery_amount?: string
    total_expenses?: string
    net_profit_after_expenses?: string
    sales_count: number
  }
  expenses?: StatsExpenses
  by_taxon?: TaxonRow[]
  by_flowers?: TaxonRow[]
  by_retail?: TaxonRow[]
  by_bouquets?: TaxonRow[]
}

function statsExpensesAmount(parts: { total_expenses?: string }): number {
  return parseAmount(parts.total_expenses ?? '0')
}

function aggregateTotalsFromDays(byDay: DaySummary[]): RangeResponse['totals'] {
  let q = 0
  let n = 0
  let rev = 0
  let cost = 0
  let supplier = 0
  let profit = 0
  let delivery = 0
  for (const d of byDay) {
    q += d.total_quantity
    n += d.sales_count
    rev += parseAmount(d.total_amount)
    cost += parseAmount(d.total_cost ?? '0')
    supplier += parseAmount(d.total_supplier_payout ?? '0')
    profit += parseAmount(d.total_profit ?? '0')
    delivery += parseAmount(d.total_delivery_amount ?? '0')
  }
  const totals = {
    total_quantity: q,
    total_amount: rev.toFixed(2),
    total_cost: cost.toFixed(2),
    total_supplier_payout: supplier.toFixed(2),
    total_profit: profit.toFixed(2),
    total_delivery_amount: delivery.toFixed(2),
    sales_count: n,
  }
  return totals
}

function formatAxisMoney(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(Math.round(n))
}

function useStatsChartMobile(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return mobile
}

function formatTooltipRub(n: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

type ChartSeriesSpec = {
  key: string
  label: string
  values: number[]
  strokeColor: string
  areaFill: string
  formatTooltip: (n: number) => string
}

type ChartGeom = {
  linePoints: string
  areaPoints: string
  coords: { x: number; y: number }[]
  xTicks: { x: number; label: string; textAnchor: 'start' | 'middle' | 'end' }[]
  gridYs: number[]
}

function computeSharedScale(valuesList: number[][]): { minV: number; maxV: number } {
  const all = valuesList.flat()
  if (all.length === 0) return { minV: 0, maxV: 1 }
  const minV = Math.min(0, ...all)
  let maxV = Math.max(1, ...all)
  if (minV >= maxV) maxV = minV + 1
  return { minV, maxV }
}

function buildChartGeom(
  values: number[],
  dates: string[],
  w: number,
  h: number,
  padL: number,
  padR: number,
  padT: number,
  padB: number,
  minV: number,
  maxV: number,
  ySteps = 4,
): ChartGeom {
  const iw = w - padL - padR
  const ih = h - padT - padB
  const n = values.length
  if (n === 0) {
    return { linePoints: '', areaPoints: '', coords: [], xTicks: [], gridYs: [] }
  }
  const coords = values.map((v, i) => {
    const x = n === 1 ? padL + iw / 2 : padL + (iw * i) / (n - 1)
    const y = padT + ih - ((v - minV) / (maxV - minV)) * ih
    return { x, y }
  })
  const linePoints = coords.map((p) => `${p.x},${p.y}`).join(' ')
  const y0 = padT + ih - ((0 - minV) / (maxV - minV)) * ih
  const areaPoints =
    n === 0
      ? ''
      : `${coords[0]!.x},${y0} ` + coords.map((p) => `${p.x},${p.y}`).join(' ') + ` ${coords[n - 1]!.x},${y0}`

  const gridYs: number[] = []
  for (let s = 0; s <= ySteps; s++) {
    gridYs.push(padT + ih * (s / ySteps))
  }

  const tickIdxs = chartXTickIndices(n)
  const m = tickIdxs.length
  const xTicks: { x: number; label: string; textAnchor: 'start' | 'middle' | 'end' }[] = []
  for (let j = 0; j < m; j++) {
    const i = tickIdxs[j]!
    const textAnchor: 'start' | 'middle' | 'end' =
      m <= 1 ? 'middle' : j === 0 ? 'start' : j === m - 1 ? 'end' : 'middle'
    xTicks.push({
      x: coords[i]!.x,
      label: formatChartXAxisLabel(dates[i] ?? ''),
      textAnchor,
    })
  }

  return { linePoints, areaPoints, coords, xTicks, gridYs }
}

type HoverExtraSeries = {
  key: string
  label: string
  values: number[]
  formatTooltip: (n: number) => string
}

function buildDisplayXTicks(
  n: number,
  dates: string[],
  coords: { x: number; y: number }[],
  mobile: boolean,
): ChartGeom['xTicks'] {
  if (n <= 0 || coords.length === 0) return []
  const indices = mobile ? chartXTickIndicesEveryOther(n) : chartXTickIndices(n)
  const m = indices.length
  return indices.map((idx, j) => ({
    x: coords[idx]?.x ?? 0,
    label: formatChartXAxisLabel(dates[idx] ?? ''),
    textAnchor: (m <= 1 ? 'middle' : j === 0 ? 'start' : j === m - 1 ? 'end' : 'middle') as
      | 'start'
      | 'middle'
      | 'end',
  }))
}

function CombinedDayAreaChart({
  title,
  series,
  dates,
  hoverExtras = [],
}: {
  title: string
  series: ChartSeriesSpec[]
  dates: string[]
  hoverExtras?: HoverExtraSeries[]
}) {
  const mobile = useStatsChartMobile()
  const plotW = 704
  const plotH = 240
  const ySteps = mobile ? 2 : 4

  const scale = useMemo(
    () => computeSharedScale(series.map((s) => s.values)),
    [series],
  )

  const geoms = useMemo(
    () =>
      series.map((s) =>
        buildChartGeom(
          s.values,
          dates,
          plotW,
          plotH,
          0,
          0,
          0,
          0,
          scale.minV,
          scale.maxV,
          ySteps,
        ),
      ),
    [series, dates, scale, plotH, ySteps],
  )

  const yTicks = useMemo(() => {
    const ticks: { y: number; label: string }[] = []
    for (let s = 0; s <= ySteps; s++) {
      const frac = s / ySteps
      const val = scale.maxV - (scale.maxV - scale.minV) * frac
      ticks.push({ y: plotH * frac, label: formatAxisMoney(val) })
    }
    return ticks
  }, [scale, plotH, ySteps])

  const baseGeom = geoms[0]
  const n = dates.length
  const scrollPlot = mobile && n > 10
  const plotMinWidth = scrollPlot ? Math.max(320, n * 44) : undefined

  const displayXTicks = useMemo(
    () => buildDisplayXTicks(n, dates, baseGeom?.coords ?? [], mobile),
    [n, dates, baseGeom, mobile],
  )

  const [hoverI, setHoverI] = useState<number | null>(null)
  const plotScrollRef = useRef<HTMLDivElement>(null)

  const scrollToDay = useCallback(
    (i: number) => {
      if (!scrollPlot) return
      requestAnimationFrame(() => {
        const scrollEl = plotScrollRef.current
        const innerEl = scrollEl?.querySelector('.crm-stats-chart__plot-inner')
        const coord = baseGeom?.coords[i]
        if (!scrollEl || !innerEl || !coord) return
        const innerW = innerEl.getBoundingClientRect().width
        const markerX = (coord.x / plotW) * innerW
        scrollEl.scrollLeft = Math.max(0, markerX - scrollEl.clientWidth * 0.45)
      })
    },
    [scrollPlot, baseGeom, plotW],
  )

  const selectDay = useCallback(
    (i: number) => {
      setHoverI(i)
      scrollToDay(i)
    },
    [scrollToDay],
  )

  useEffect(() => {
    if (!mobile || n < 1 || !baseGeom?.coords[n - 1]) return
    setHoverI(n - 1)
    scrollToDay(n - 1)
  }, [mobile, n, dates, baseGeom, scrollToDay])

  const plotInnerStyle = plotMinWidth
    ? ({ minWidth: `${plotMinWidth}px` } as CSSProperties)
    : undefined

  const xLabels = (
    <div className="crm-stats-chart__x-labels" aria-hidden>
      {displayXTicks.map((t, i) => (
        <span
          key={`${t.label}-${i}`}
          className={`crm-stats-chart__axis-label crm-stats-chart__x-label crm-stats-chart__x-label--${t.textAnchor}`}
          style={{ left: `${(t.x / plotW) * 100}%` }}
        >
          {t.label}
        </span>
      ))}
    </div>
  )

  const hoverBand = (i: number) => {
    if (n <= 1) {
      return { x: 0, width: plotW }
    }
    const cx = baseGeom?.coords[i]?.x ?? 0
    const prevX = i === 0 ? 0 : (baseGeom?.coords[i - 1]?.x ?? 0)
    const nextX = i === n - 1 ? plotW : (baseGeom?.coords[i + 1]?.x ?? plotW)
    const left = i === 0 ? 0 : (prevX + cx) / 2
    const right = i === n - 1 ? plotW : (cx + nextX) / 2
    return { x: left, width: Math.max(8, right - left) }
  }

  return (
    <figure className="crm-stats-chart crm-stats-chart--combined">
      <figcaption className="crm-stats-chart__title">{title}</figcaption>
      <ul className="crm-stats-chart__legend" aria-hidden>
        {series.map((s) => (
          <li key={s.key} className="crm-stats-chart__legend-item">
            <span
              className="crm-stats-chart__legend-swatch"
              style={{ background: s.areaFill, borderColor: s.strokeColor }}
            />
            {s.label}
          </li>
        ))}
      </ul>
      <div
        className={`crm-stats-chart__frame${mobile ? ' crm-stats-chart__frame--mobile' : ''}${
          scrollPlot ? ' crm-stats-chart__frame--scroll' : ''
        }`.trim()}
      >
        {!mobile ? (
          <ul className="crm-stats-chart__y-labels" aria-hidden>
            {yTicks.map((t, i) => (
              <li key={`y-${i}`} className="crm-stats-chart__axis-label">
                {t.label}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="crm-stats-chart__plot-scroll" ref={plotScrollRef}>
          <div className="crm-stats-chart__plot-inner" style={plotInnerStyle}>
            <div className="crm-stats-chart__svg-wrap">
              <svg
                className="crm-stats-chart__svg"
                viewBox={`0 0 ${plotW} ${plotH}`}
                preserveAspectRatio={scrollPlot ? 'none' : 'xMidYMid meet'}
                role="img"
                aria-label={title}
                onMouseLeave={() => {
                  if (!mobile) setHoverI(null)
                }}
              >
            {baseGeom?.gridYs.map((gy, i) => (
              <line key={i} x1={0} x2={plotW} y1={gy} y2={gy} className="crm-stats-chart__grid" />
            ))}
            {series.map((s, si) => {
              const g = geoms[si]
              if (!g?.areaPoints) return null
              return (
                <g key={s.key}>
                  <polygon
                    points={g.areaPoints}
                    fill={s.areaFill}
                    stroke="none"
                    className="crm-stats-chart__area"
                  />
                  {g.linePoints ? (
                    <polyline
                      points={g.linePoints}
                      fill="none"
                      stroke={s.strokeColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="crm-stats-chart__line"
                    />
                  ) : null}
                </g>
              )
            })}
            {hoverI !== null && baseGeom?.coords[hoverI] ? (
              <line
                x1={baseGeom.coords[hoverI]!.x}
                x2={baseGeom.coords[hoverI]!.x}
                y1={0}
                y2={plotH}
                className="crm-stats-chart__hover-line"
              />
            ) : null}
            {n > 0
              ? Array.from({ length: n }, (_, i) => {
                  const band = hoverBand(i)
                  return (
                    <rect
                      key={i}
                      x={band.x}
                      y={0}
                      width={band.width}
                      height={plotH}
                      fill="transparent"
                      className="crm-stats-chart__hit-band"
                      onMouseEnter={() => {
                        if (!mobile) setHoverI(i)
                      }}
                      onFocus={() => selectDay(i)}
                      onClick={() => selectDay(i)}
                      tabIndex={0}
                      aria-label={formatChartTooltipDate(dates[i] ?? '')}
                    />
                  )
                })
              : null}
          </svg>
            </div>
            {mobile ? xLabels : null}
          </div>
        </div>
        {!mobile ? xLabels : null}
      </div>
      <div className="crm-stats-chart__detail" aria-live="polite">
        {hoverI !== null && hoverI >= 0 && hoverI < n ? (
          <>
            <span className="crm-stats-chart__detail-date">
              {formatChartTooltipDate(dates[hoverI] ?? '')}
            </span>
            <ul className="crm-stats-chart__detail-rows">
              {hoverExtras.map((s) => (
                <li key={s.key} className="crm-stats-chart__detail-row crm-stats-chart__detail-row--extra">
                  <span className="crm-stats-chart__detail-lab">{s.label}</span>
                  <span className="crm-stats-chart__detail-val">
                    {s.formatTooltip(s.values[hoverI] ?? 0)}
                  </span>
                </li>
              ))}
              {series.map((s) => (
                <li key={s.key} className="crm-stats-chart__detail-row">
                  <span
                    className="crm-stats-chart__legend-swatch crm-stats-chart__legend-swatch--inline"
                    style={{ background: s.areaFill, borderColor: s.strokeColor }}
                    aria-hidden
                  />
                  <span className="crm-stats-chart__detail-lab">{s.label}</span>
                  <span className="crm-stats-chart__detail-val">
                    {s.formatTooltip(s.values[hoverI] ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <span className="crm-stats-chart__detail-hint">
            {mobile ? 'Нажмите на график, чтобы выбрать день' : 'Наведите или нажмите на график'}
          </span>
        )}
      </div>
    </figure>
  )
}

type TaxonRowWithPct = TaxonRow & {
  pctQty: number
  pctAmt: number
  pctProfit: number
}

type SectionTotals = {
  quantity: number
  total_amount: string
  total_supplier_payout: string
  total_profit: string
}

function aggregateSectionTotals(rows: TaxonRow[]): SectionTotals {
  let quantity = 0
  let amount = 0
  let supplier = 0
  let profit = 0
  for (const r of rows) {
    quantity += r.quantity
    amount += parseAmount(r.total_amount)
    supplier += parseAmount(r.total_supplier_payout ?? '0')
    profit += parseAmount(r.total_profit ?? '0')
  }
  return {
    quantity,
    total_amount: amount.toFixed(2),
    total_supplier_payout: supplier.toFixed(2),
    total_profit: profit.toFixed(2),
  }
}

function rowsWithSectionPct(rows: TaxonRow[], sectionTotals: SectionTotals): TaxonRowWithPct[] {
  const denomQty = Math.max(1, sectionTotals.quantity)
  const denomAmt = Math.max(1, parseAmount(sectionTotals.total_amount))
  const tp = parseAmount(sectionTotals.total_profit)
  return rows.map((r) => ({
    ...r,
    pctQty: (r.quantity / denomQty) * 100,
    pctAmt: (parseAmount(r.total_amount) / denomAmt) * 100,
    pctProfit: Math.abs(tp) < 1e-9 ? 0 : (parseAmount(r.total_profit ?? '0') / tp) * 100,
  }))
}

function sortTaxonRows(rows: TaxonRowWithPct[], sort: { key: TaxonSortKey; dir: TaxonSortDir }) {
  const next = [...rows]
  const sign = sort.dir === 'asc' ? 1 : -1
  next.sort((a, b) => {
    if (sort.key === 'quantity') return (a.quantity - b.quantity) * sign
    if (sort.key === 'supplier')
      return (
        (parseAmount(a.total_supplier_payout ?? '0') - parseAmount(b.total_supplier_payout ?? '0')) *
        sign
      )
    if (sort.key === 'profit')
      return (parseAmount(a.total_profit ?? '0') - parseAmount(b.total_profit ?? '0')) * sign
    return (parseAmount(a.total_amount) - parseAmount(b.total_amount)) * sign
  })
  return next
}

function taxonRowKey(row: TaxonRow) {
  if (row.kind === 'retail') return `retail-${row.retail_product_id}`
  if (row.kind === 'bouquet') return `bouquet-${row.bouquet_id}`
  if (row.kind === 'custom_bouquet') return `custom-${row.display_name}`
  return `taxon-${row.taxon_id ?? row.display_name}`
}

function CollapsibleTaxonTable({
  sectionId,
  title,
  rows,
  expanded,
  onToggle,
  sort,
  onToggleSort,
}: {
  sectionId: string
  title: string
  rows: TaxonRow[]
  expanded: boolean
  onToggle: () => void
  sort: { key: TaxonSortKey; dir: TaxonSortDir }
  onToggleSort: (key: TaxonSortKey) => void
}) {
  const sectionTotals = useMemo(() => aggregateSectionTotals(rows), [rows])
  const rowsWithPct = useMemo(() => rowsWithSectionPct(rows, sectionTotals), [rows, sectionTotals])
  const sortedRows = useMemo(() => sortTaxonRows(rowsWithPct, sort), [rowsWithPct, sort])
  const profitTotal = parseAmount(sectionTotals.total_profit)

  const sortBtn = (key: TaxonSortKey, label: string) => (
    <CrmButton
      variant="statsSort"
      aria-label={
        sort.key === key
          ? `Сортировка по ${label}, ${sort.dir === 'desc' ? 'сначала больше' : 'сначала меньше'}`
          : `Сортировать по ${label}`
      }
      onClick={() => onToggleSort(key)}
    >
      <span>{label}</span>
      <span className="crm-stats-table__sort-arrows" aria-hidden>
        {sort.key === key ? (
          <span className="crm-stats-table__sort-arrow crm-stats-table__sort-arrow--active">
            {sort.dir === 'desc' ? '▼' : '▲'}
          </span>
        ) : (
          <span className="crm-stats-table__sort-arrow crm-stats-table__sort-arrow--idle">↕</span>
        )}
      </span>
    </CrmButton>
  )

  return (
    <section
      className={`crm-stats-table-section${expanded ? '' : ' crm-stats-table-section--collapsed'}`}
      aria-labelledby={sectionId}
    >
      <header className="crm-stats-section-head">
        <CrmButton
          variant="statsTableToggle"
          id={sectionId}
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <span className="crm-btn__chev" aria-hidden>
            {expanded ? '▼' : '▶'}
          </span>
          <span>{title}</span>
          <span className="crm-btn__count">{rows.length}</span>
        </CrmButton>
        <div className="crm-stats-section-head__totals">
          <span className="crm-stats-section-head__stat">
            <span className="crm-stats-section-head__stat-lab">Шт.</span>
            <span className="crm-stats-section-head__stat-val">
              {sectionTotals.quantity.toLocaleString('ru-RU')}
            </span>
          </span>
          <span className="crm-stats-section-head__stat">
            <span className="crm-stats-section-head__stat-lab">Сумма</span>
            <span className="crm-stats-section-head__stat-val">
              {formatRub(sectionTotals.total_amount)}
            </span>
          </span>
          <span className="crm-stats-section-head__stat">
            <span className="crm-stats-section-head__stat-lab">Прибыль</span>
            <span
              className={
                profitTotal < 0
                  ? 'crm-stats-section-head__stat-val crm-stats-table__profit-neg'
                  : 'crm-stats-section-head__stat-val'
              }
            >
              {formatRub(sectionTotals.total_profit)}
            </span>
          </span>
        </div>
      </header>
      {expanded ? (
        <>
          <div className="crm-stats-table-wrap crm-stats-table-wrap--desktop">
            <table className="crm-stats-table">
              <thead>
                <tr>
                  <th scope="col">Название</th>
                  <th
                    scope="col"
                    className="crm-stats-table__num crm-stats-table__th-sort"
                    aria-sort={
                      sort.key === 'quantity'
                        ? sort.dir === 'desc'
                          ? 'descending'
                          : 'ascending'
                        : 'none'
                    }
                  >
                    {sortBtn('quantity', 'Шт.')}
                  </th>
                  <th
                    scope="col"
                    className="crm-stats-table__num crm-stats-table__th-sort"
                    aria-sort={
                      sort.key === 'amount'
                        ? sort.dir === 'desc'
                          ? 'descending'
                          : 'ascending'
                        : 'none'
                    }
                  >
                    {sortBtn('amount', 'Сумма')}
                  </th>
                  <th
                    scope="col"
                    className="crm-stats-table__num crm-stats-table__th-sort"
                    aria-sort={
                      sort.key === 'profit'
                        ? sort.dir === 'desc'
                          ? 'descending'
                          : 'ascending'
                        : 'none'
                    }
                  >
                    {sortBtn('profit', 'Прибыль')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="crm-stats-table__empty">
                      Нет продаж за период.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((row) => {
                    const pAmt = parseAmount(row.total_profit ?? '0')
                    return (
                      <tr key={taxonRowKey(row)}>
                        <td className="crm-stats-table__name">
                          <span>{row.display_name}</span>
                          {row.kind === 'custom_bouquet' ? (
                            <span className="crm-stats-table__name-meta">Букет на заказ</span>
                          ) : null}
                        </td>
                        <td className="crm-stats-table__num">
                          {row.quantity.toLocaleString('ru-RU')}{' '}
                          <span className="crm-stats-table__pct">({formatPct(row.pctQty)})</span>
                        </td>
                        <td className="crm-stats-table__num">
                          {formatRub(row.total_amount)}{' '}
                          <span className="crm-stats-table__pct">({formatPct(row.pctAmt)})</span>
                        </td>
                        <td
                          className={
                            pAmt < 0
                              ? 'crm-stats-table__num crm-stats-table__profit-neg'
                              : 'crm-stats-table__num'
                          }
                        >
                          {formatRub(row.total_profit ?? '0')}{' '}
                          <span className="crm-stats-table__pct">({formatPct(row.pctProfit)})</span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <ul className="crm-stats-table__cards">
            {sortedRows.length === 0 ? (
              <li className="crm-stats-table__cards-empty">Нет продаж за период.</li>
            ) : (
              sortedRows.map((row) => {
                const pAmt = parseAmount(row.total_profit ?? '0')
                return (
                  <li key={taxonRowKey(row)} className="crm-stats-table__card">
                    <p className="crm-stats-table__card-title">{row.display_name}</p>
                    {row.kind === 'custom_bouquet' ? (
                      <p className="crm-stats-table__name-meta">Букет на заказ</p>
                    ) : null}
                    <dl className="crm-stats-table__card-stats">
                      <div className="crm-stats-table__card-stat">
                        <dt>Шт.</dt>
                        <dd>
                          {row.quantity.toLocaleString('ru-RU')}{' '}
                          <span className="crm-stats-table__pct">({formatPct(row.pctQty)})</span>
                        </dd>
                      </div>
                      <div className="crm-stats-table__card-stat">
                        <dt>Сумма</dt>
                        <dd>
                          {formatRub(row.total_amount)}{' '}
                          <span className="crm-stats-table__pct">({formatPct(row.pctAmt)})</span>
                        </dd>
                      </div>
                      <div className="crm-stats-table__card-stat">
                        <dt>Прибыль</dt>
                        <dd className={pAmt < 0 ? 'crm-stats-table__profit-neg' : undefined}>
                          {formatRub(row.total_profit ?? '0')}{' '}
                          <span className="crm-stats-table__pct">({formatPct(row.pctProfit)})</span>
                        </dd>
                      </div>
                    </dl>
                  </li>
                )
              })
            )}
          </ul>
        </>
      ) : null}
    </section>
  )
}

export function CrmSalesStats() {
  const [period, setPeriod] = useState<ReportPeriodRange>(() => defaultReportPeriod())
  const [range, setRange] = useState<RangeResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [flowersOpen, setFlowersOpen] = useState(false)
  const [retailOpen, setRetailOpen] = useState(false)
  const [bouquetsOpen, setBouquetsOpen] = useState(false)
  const [flowerSort, setFlowerSort] = useState<{ key: TaxonSortKey; dir: TaxonSortDir }>({
    key: 'quantity',
    dir: 'desc',
  })
  const [retailSort, setRetailSort] = useState<{ key: TaxonSortKey; dir: TaxonSortDir }>({
    key: 'quantity',
    dir: 'desc',
  })
  const [bouquetSort, setBouquetSort] = useState<{ key: TaxonSortKey; dir: TaxonSortDir }>({
    key: 'quantity',
    dir: 'desc',
  })

  const periodFrom = period.from
  const periodTo = period.to

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErr(null)
    setRange(null)
    void apiFetch(`/api/me/stock/sales/range/?${periodQueryString({ from: periodFrom, to: periodTo })}`)
      .then((res) => {
        if (res.status === 401) throw new Error('Сессия недействительна. Войдите снова.')
        if (!res.ok && isUpstreamErrorStatus(res.status)) return null
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
        return res.json() as Promise<RangeResponse>
      })
      .then((json) => {
        if (cancelled || json === null) return
        setRange(json)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setRange(null)
          setErr(e instanceof Error ? e.message : 'Не удалось загрузить статистику')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [periodFrom, periodTo])

  const spanDays = useMemo(
    () => (range ? inclusiveDayCount(range.from, range.to) : inclusiveDayCount(period.from, period.to)),
    [range, period],
  )

  const totals = useMemo(() => {
    if (!range) return null
    return range.totals ?? aggregateTotalsFromDays(range.by_day)
  }, [range])

  const dates = useMemo(() => (range?.by_day ?? []).map((d) => d.date), [range])
  const qtySeries = useMemo(() => (range?.by_day ?? []).map((d) => d.total_quantity), [range])
  const amtSeries = useMemo(() => (range?.by_day ?? []).map((d) => parseAmount(d.total_amount)), [range])
  const profitSeries = useMemo(
    () => (range?.by_day ?? []).map((d) => parseAmount(d.total_profit ?? '0')),
    [range],
  )

  const chartSeries = useMemo(
    (): ChartSeriesSpec[] => [
      {
        key: 'amount',
        label: 'Выручка',
        values: amtSeries,
        strokeColor: '#2a5588',
        areaFill: 'rgba(58, 111, 168, 0.2)',
        formatTooltip: formatTooltipRub,
      },
      {
        key: 'profit',
        label: 'Прибыль',
        values: profitSeries,
        strokeColor: '#8b5a2b',
        areaFill: 'rgba(139, 90, 43, 0.18)',
        formatTooltip: formatTooltipRub,
      },
    ],
    [amtSeries, profitSeries],
  )

  const chartHoverExtras = useMemo(
    (): HoverExtraSeries[] => [
      {
        key: 'qty',
        label: 'Шт.',
        values: qtySeries,
        formatTooltip: (n) => `${n.toLocaleString('ru-RU')} шт.`,
      },
    ],
    [qtySeries],
  )

  const flowerRows = useMemo(() => {
    if (range?.by_flowers) return range.by_flowers
    return (range?.by_taxon ?? []).filter((r) => r.kind === 'flower' || !r.kind)
  }, [range])
  const retailRows = useMemo(() => {
    if (range?.by_retail) return range.by_retail
    return (range?.by_taxon ?? []).filter((r) => r.kind === 'retail')
  }, [range])
  const bouquetRows = useMemo(() => {
    if (range?.by_bouquets) return range.by_bouquets
    return (range?.by_taxon ?? []).filter(
      (r) => r.kind === 'bouquet' || r.kind === 'custom_bouquet',
    )
  }, [range])

  const toggleFlowerSort = (key: TaxonSortKey) => {
    setFlowerSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' },
    )
  }

  const toggleRetailSort = (key: TaxonSortKey) => {
    setRetailSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' },
    )
  }

  const toggleBouquetSort = (key: TaxonSortKey) => {
    setBouquetSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' },
    )
  }

  const kpiShopProfit = useMemo(() => {
    if (!totals) return 0
    return parseAmount(totals.total_profit ?? '0')
  }, [totals])

  const kpiSalesRevenue = useMemo(() => {
    if (!totals) return 0
    if (totals.sales_revenue) return parseAmount(totals.sales_revenue)
    const delivery = parseAmount(totals.total_delivery_amount ?? '0')
    return parseAmount(totals.total_amount) - delivery
  }, [totals])

  const kpiShopProfitMarginPct = useMemo(() => {
    if (!totals || kpiSalesRevenue < 1e-9) return 0
    return (kpiShopProfit / kpiSalesRevenue) * 100
  }, [totals, kpiShopProfit, kpiSalesRevenue])

  const kpiExpenses = useMemo(
    () => (range?.expenses ? parseAmount(range.expenses.total) : totals ? statsExpensesAmount(totals) : 0),
    [range, totals],
  )

  const kpiNetProfit = useMemo(() => {
    if (!totals) return 0
    if (range?.expenses?.net_profit) return parseAmount(range.expenses.net_profit)
    if (totals.net_profit_after_expenses) return parseAmount(totals.net_profit_after_expenses)
    const rev = parseAmount(totals.total_amount)
    return rev - kpiExpenses
  }, [range, totals, kpiExpenses])

  const kpiNetProfitMarginPct = useMemo(() => {
    if (!totals) return 0
    const rev = parseAmount(totals.total_amount)
    if (rev < 1e-9) return 0
    return (kpiNetProfit / rev) * 100
  }, [totals, kpiNetProfit])

  const kpiExpensesHint = 'Итого расходов за период (регулярные, налоги, закупки, утиль и др.)'

  const hasAnyTaxonRows = flowerRows.length > 0 || retailRows.length > 0 || bouquetRows.length > 0

  const expenseDisplaySections = useMemo((): StatsExpenseSection[] => {
    const order = new Map(EXPENSE_LINE_ORDER.map((key, index) => [key, index]))
    const normalizeLines = (lines: StatsExpenseLine[]) => {
      const seen = new Set<string>()
      return lines
        .map((line) => ({
          ...line,
          label: EXPENSE_LINE_LABEL[line.key] ?? line.label,
        }))
        .filter((line) => {
          if (parseAmount(line.amount) <= 0 || line.kind === 'income') return false
          if (seen.has(line.key)) return false
          seen.add(line.key)
          return true
        })
        .sort(
          (a, b) =>
            (order.get(a.key as (typeof EXPENSE_LINE_ORDER)[number]) ?? 99) -
            (order.get(b.key as (typeof EXPENSE_LINE_ORDER)[number]) ?? 99),
        )
    }

    const apiSections = range?.expenses?.sections
    if (apiSections?.length) {
      const inShopLines: StatsExpenseLine[] = []
      const beyondLines: StatsExpenseLine[] = []
      for (const section of apiSections) {
        if (section.key === 'in_shop_profit') {
          inShopLines.push(...section.lines)
        } else if (section.key === 'delivery') {
          inShopLines.push(...section.lines.filter((line) => line.kind !== 'income'))
        } else {
          beyondLines.push(...section.lines)
        }
      }
      const blocks: StatsExpenseSection[] = [
        {
          key: 'in_shop_profit',
          title: EXPENSE_SECTION_TITLE.in_shop_profit,
          description: '',
          total: '0',
          lines: normalizeLines(inShopLines),
        },
        {
          key: 'beyond_shop_profit',
          title: EXPENSE_SECTION_TITLE.beyond_shop_profit,
          description: '',
          total: '0',
          lines: normalizeLines(beyondLines),
        },
      ]
      return blocks
        .map((block) => {
          const fromApi = apiSections.find((s) => s.key === block.key)
          const lineSum = block.lines.reduce((sum, line) => sum + parseAmount(line.amount), 0)
          return {
            ...block,
            title: EXPENSE_SECTION_TITLE[block.key] ?? fromApi?.title ?? block.title,
            total: fromApi?.total ?? lineSum.toFixed(2),
          }
        })
        .filter((block) => block.lines.length > 0 || parseAmount(block.total) > 0)
    }

    const b = range?.expenses?.breakdown
    if (!b) return []
    const inShop = normalizeLines([
      { key: 'purchase_flowers', label: 'Закупка цветов', amount: b.purchase_flowers ?? '0' },
      { key: 'purchase_retail', label: 'Закупка товаров', amount: b.purchase_retail ?? '0' },
      { key: 'purchase_consumables', label: 'Закупка расходников', amount: b.purchase_consumables ?? '0' },
      { key: 'supplier_payout', label: 'Поставщики', amount: b.supplier_payout },
      { key: 'delivery_expense', label: 'Курьерам', amount: b.delivery },
    ])
    const beyond = normalizeLines([
      { key: 'waste', label: 'Утиль', amount: b.waste },
      { key: 'acquiring', label: 'Эквайринг', amount: b.acquiring },
      { key: 'sbp_fee', label: 'СБП', amount: b.sbp_fee },
      { key: 'tax', label: 'Налог', amount: b.tax },
      { key: 'regular', label: 'Регулярные', amount: b.regular },
      { key: 'additional', label: 'Дополнительные', amount: b.additional },
    ])
    return [
      {
        key: 'in_shop_profit',
        title: EXPENSE_SECTION_TITLE.in_shop_profit,
        description: '',
        total: inShop.reduce((sum, line) => sum + parseAmount(line.amount), 0).toFixed(2),
        lines: inShop,
      },
      {
        key: 'beyond_shop_profit',
        title: EXPENSE_SECTION_TITLE.beyond_shop_profit,
        description: '',
        total: beyond.reduce((sum, line) => sum + parseAmount(line.amount), 0).toFixed(2),
        lines: beyond,
      },
    ].filter((block) => block.lines.length > 0 || parseAmount(block.total) > 0)
  }, [range])

  return (
    <div className="crm-stats-report" role="region" aria-label="Статистика продаж">
      <header className="crm-stats-report__head">
        <h1 className="crm-stats-report__h1">Статистика продаж</h1>
        <ReportPeriodControls
          className="crm-stats-report__period"
          value={period}
          disabled={loading}
          onChange={setPeriod}
        />
      </header>

      {err ? (
        <p className="crm-stats-report__err" role="alert">
          {err}
        </p>
      ) : null}

      {loading ? <div className="crm-stats-report__skel" aria-busy="true" /> : null}

      {!loading && range && totals ? (
        <>
          <div className="crm-stats-report__kpis">
            <div className="crm-stats-report__kpi">
              <span className="crm-stats-report__kpi-lab">Чеков</span>
              <span className="crm-stats-report__kpi-val">{totals.sales_count}</span>
            </div>
            <div className="crm-stats-report__kpi">
              <span className="crm-stats-report__kpi-lab">Продано, шт.</span>
              <span className="crm-stats-report__kpi-val">
                {totals.total_quantity.toLocaleString('ru-RU')}
              </span>
            </div>
            <div
              className="crm-stats-report__kpi crm-stats-report__kpi--accent"
              title={
                parseAmount(totals.total_delivery_amount ?? '0') > 0
                  ? `Товары: ${formatRub(kpiSalesRevenue.toFixed(2))}, доставка: ${formatRub(totals.total_delivery_amount ?? '0')}`
                  : undefined
              }
            >
              <span className="crm-stats-report__kpi-lab">Выручка</span>
              <span className="crm-stats-report__kpi-val">{formatRub(totals.total_amount)}</span>
            </div>
            <div
              className="crm-stats-report__kpi crm-stats-report__kpi--expenses"
              title={kpiExpensesHint}
            >
              <span className="crm-stats-report__kpi-lab">Расходы</span>
              <span className="crm-stats-report__kpi-val">{formatRub(kpiExpenses.toFixed(2))}</span>
            </div>
            <div
              className={`crm-stats-report__kpi crm-stats-report__kpi--profit${
                kpiShopProfit < 0 ? ' crm-stats-report__kpi--profit-neg' : ''
              }`}
              title="Маржа по товарам (без доставки): выручка по товарам − закупки (не с реализации) − поставщики"
            >
              <span className="crm-stats-report__kpi-lab">Прибыль от продаж</span>
              <span className="crm-stats-report__kpi-val">
                {formatRub(kpiShopProfit.toFixed(2))}{' '}
                <span className="crm-stats-report__kpi-pct">
                  ({formatPct(kpiShopProfitMarginPct)} по товарам)
                </span>
              </span>
            </div>
            <div
              className={`crm-stats-report__kpi crm-stats-report__kpi--profit${
                kpiNetProfit < 0 ? ' crm-stats-report__kpi--profit-neg' : ''
              }`}
              title="Выручка минус все расходы за период"
            >
              <span className="crm-stats-report__kpi-lab">Чистая прибыль</span>
              <span className="crm-stats-report__kpi-val">
                {formatRub(kpiNetProfit.toFixed(2))}{' '}
                <span className="crm-stats-report__kpi-pct">({formatPct(kpiNetProfitMarginPct)} выручки)</span>
              </span>
            </div>
          </div>

          {range.expenses ? (
            <section className="crm-stats-report__expenses" aria-labelledby="crm-stats-expenses-heading">
              <header className="crm-stats-report__expenses-head">
                <h2 id="crm-stats-expenses-heading" className="crm-stats-report__h2">
                  Расходы за период
                </h2>
                <span className="crm-stats-report__expenses-total">{formatRub(range.expenses.total)}</span>
              </header>
              <div className="crm-stats-report__expenses-cards">
                {expenseDisplaySections.map((section) => (
                  <article key={section.key} className="crm-stats-report__expenses-card">
                    <div className="crm-stats-report__expenses-card-head">
                      <h3 className="crm-stats-report__expenses-card-title">{section.title}</h3>
                      <span className="crm-stats-report__expenses-card-total">
                        {formatRub(section.total)}
                      </span>
                    </div>
                    <ul className="crm-stats-report__expenses-list">
                      {section.lines.map((line) => (
                        <li key={line.key} className="crm-stats-report__expenses-item">
                          <span>{line.label}</span>
                          <span>{formatRub(line.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <div className="crm-stats-report__charts">
            <CombinedDayAreaChart
              title={`Динамика по дням (${spanDays} дн.)`}
              series={chartSeries}
              dates={dates}
              hoverExtras={chartHoverExtras}
            />
          </div>

          <section className="crm-stats-report__table-section" aria-labelledby="crm-stats-taxa-heading">
            <h2 id="crm-stats-taxa-heading" className="crm-stats-report__h2">
              По видам за период
            </h2>
            {!hasAnyTaxonRows ? (
              <p className="crm-stats-report__empty">За выбранный период продаж нет.</p>
            ) : (
              <div className="crm-stats-report__tables">
                <CollapsibleTaxonTable
                  sectionId="crm-stats-flowers-heading"
                  title="Цветы"
                  rows={flowerRows}
                  expanded={flowersOpen}
                  onToggle={() => setFlowersOpen((v) => !v)}
                  sort={flowerSort}
                  onToggleSort={toggleFlowerSort}
                />
                <CollapsibleTaxonTable
                  sectionId="crm-stats-retail-heading"
                  title="Вещи"
                  rows={retailRows}
                  expanded={retailOpen}
                  onToggle={() => setRetailOpen((v) => !v)}
                  sort={retailSort}
                  onToggleSort={toggleRetailSort}
                />
                <CollapsibleTaxonTable
                  sectionId="crm-stats-bouquets-heading"
                  title="Букеты"
                  rows={bouquetRows}
                  expanded={bouquetsOpen}
                  onToggle={() => setBouquetsOpen((v) => !v)}
                  sort={bouquetSort}
                  onToggleSort={toggleBouquetSort}
                />
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
