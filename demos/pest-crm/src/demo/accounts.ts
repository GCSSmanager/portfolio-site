import type { UserRole } from '@/types';

/** Тестовые учётки демо — держим рядом с сидом, чтобы логин и seed не разъезжались. */
export const DEMO_ACCOUNTS: Array<{
  login: string;
  password: string;
  role: UserRole;
  label: string;
}> = [
  { login: 'admin', password: 'demo111111', role: 'admin', label: 'Администратор' },
  { login: 'operator', password: 'demo111111', role: 'operator', label: 'Оператор' },
  { login: 'master', password: 'demo111111', role: 'master', label: 'Мастер Иван' },
  { login: 'master2', password: 'demo111111', role: 'master', label: 'Мастер Пётр' },
  { login: 'master3', password: 'demo111111', role: 'master', label: 'Мастер Алексей' },
];
