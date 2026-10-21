import type { ReactNode } from 'react'
import { formatRubBriefFromString } from '../../utils/formatMoney'
import { parseStoredMoney } from '../../utils/crmInput'

type Props = {
  qty: number | null
  revenueStr: string | null | undefined
  profitStr: string | null | undefined
  loaded: boolean
  /** Только числа (без «шт» и подсказок в title). */
  bare?: boolean
}

/** Строка продаж на главной: количество · выручка · прибыль. */
export function HomeSalesTripleDisplay({
  qty,
  revenueStr,
  profitStr,
  loaded,
  bare = false,
}: Props): ReactNode {
  if (!loaded) {
    return <span className="crm-home-headboard__sales-skel">…</span>
  }
  if (qty == null) {
    return (
      <>
        <span className="crm-home-headboard__sales-qty">—</span>
        <span className="crm-home-headboard__sales-sep" aria-hidden>
          {' '}
          ·{' '}
        </span>
        <span className="crm-home-headboard__sales-rev">—</span>
        <span className="crm-home-headboard__sales-sep" aria-hidden>
          {' '}
          ·{' '}
        </span>
        <span className="crm-home-headboard__sales-profit">—</span>
      </>
    )
  }
  const profitNum = parseStoredMoney(profitStr ?? null)
  const profitClass =
    profitNum == null
      ? 'crm-home-headboard__sales-profit'
      : profitNum < 0
        ? 'crm-home-headboard__sales-profit crm-home-headboard__sales-profit--neg'
        : profitNum > 0
          ? 'crm-home-headboard__sales-profit crm-home-headboard__sales-profit--pos'
          : 'crm-home-headboard__sales-profit'

  const qtyLabel = bare ? qty.toLocaleString('ru-RU') : `${qty.toLocaleString('ru-RU')} шт`

  return (
    <>
      <span
        className="crm-home-headboard__sales-qty"
        title={bare ? undefined : 'Сколько штук цветов продано'}
      >
        {qtyLabel}
      </span>
      <span className="crm-home-headboard__sales-sep" aria-hidden>
        {' '}
        ·{' '}
      </span>
      <span
        className="crm-home-headboard__sales-rev"
        title={bare ? undefined : 'Сумма по ценам продажи с клиента'}
      >
        {formatRubBriefFromString(revenueStr ?? undefined)}
      </span>
      <span className="crm-home-headboard__sales-sep" aria-hidden>
        {' '}
        ·{' '}
      </span>
      <span
        className={profitClass}
        title={
          bare ? undefined : 'Выручка минус выплата поставщику (реализация) и закупка по своим штукам'
        }
      >
        {formatRubBriefFromString(profitStr ?? undefined)}
      </span>
    </>
  )
}
