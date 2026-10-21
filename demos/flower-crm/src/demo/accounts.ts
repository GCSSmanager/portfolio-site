import type { FloristRole } from '../auth/AuthContext'

/** Тестовые учётки демо — держим рядом с сидом, чтобы логин и seed не разъезжались. */
export const DEMO_ACCOUNTS: Array<{
  phone: string
  password: string
  role: FloristRole
  label: string
}> = [
  { phone: '79999999999', password: 'demo111111', role: 'owner', label: 'Владелец (Роза Шоп)' },
  { phone: '79001111111', password: 'demo111111', role: 'florist', label: 'Флорист Анна' },
  { phone: '79002222222', password: 'demo111111', role: 'customer', label: 'Покупатель (личный кабинет)' },
]
