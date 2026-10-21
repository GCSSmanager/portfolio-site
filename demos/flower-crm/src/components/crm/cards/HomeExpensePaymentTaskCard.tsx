import { CrmButton } from '../../ui/CrmButton'
import { formatRubNumber, parseAmount } from '../../../utils/formatMoney'
import type { ExpensePaymentTaskRow } from '../stock/types'

type Props = {
  task: ExpensePaymentTaskRow
}

function formatDateRu(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function HomeExpensePaymentTaskCard({ task }: Props) {
  return (
    <article className="crm-card-mini crm-card-mini--home-price-miss" id={`crm-home-expense-${task.expense_id}`}>
      <div className="crm-card-mini__main">
        <div className="crm-card-mini__body">
          <h3 className="crm-card-mini__name">{task.name}</h3>
          <p className="crm-home-price-miss__task" role="status">
            {task.variable_amount
              ? 'Внести оплату по счётчику'
              : `Внести оплату — ${formatRubNumber(parseAmount(task.amount_rub))} ₽`}
            {task.due_date ? ` (срок ${formatDateRu(task.due_date)})` : ''}
          </p>
          <p className="crm-card-mini__latin">{task.period_label}</p>
        </div>
      </div>
      <div className="crm-home-price-miss__footer" role="group" aria-label="Действия">
        <CrmButton to={`/expenses?pay=${task.expense_id}`} variant="homeTaskPrimary">
          К расходам
        </CrmButton>
      </div>
    </article>
  )
}
