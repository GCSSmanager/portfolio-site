/** Подписи типов действий в журнале (ключи API / старый сид → русский UI). */
const LABELS: Record<string, string> = {
  order_created: 'Создание заказа',
  order_updated: 'Изменение заказа',
  order_assigned: 'Назначение мастера',
  order_completed: 'Выполнение заказа',
  order_cancelled: 'Отмена заказа',
  lead_received: 'Заявка с сайта',
};

export function activityActionLabel(action: string): string {
  const trimmed = action.trim();
  if (!trimmed) return '—';
  return LABELS[trimmed] ?? trimmed;
}

/** Коды для записи в демо-БД (всегда по-русски). */
export const ActivityAction = {
  orderCreated: 'Создание заказа',
  orderUpdated: 'Изменение заказа',
  orderAssigned: 'Назначение мастера',
  orderCompleted: 'Выполнение заказа',
  orderCancelled: 'Отмена заказа',
  leadReceived: 'Заявка с сайта',
} as const;
