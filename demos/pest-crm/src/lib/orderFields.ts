import { CrmProjectId, getStoredProjectId } from './projects';

const PEST_CONTROL_SERVICES = [
  'Клопы', 'Тараканы', 'Муравьи', 'Крысы', 'Мыши', 'Кроты', 'Моль', 'Блохи',
  'Плесень', 'Вирусы', 'Клещи', 'Комары', 'Мухи', 'Короед',
  'Борщевик', 'Лечение Деревьев', 'Запахи', 'Другое',
];

const DRYING_SERVICES = [
  'Сушка',
  'Откачка воды',
  'Плесень',
  'Запахи',
  'Диагностика',
];

export const getOrderServices = (
  projectId: CrmProjectId = getStoredProjectId(),
): string[] => projectId === 'drying-center' ? DRYING_SERVICES : PEST_CONTROL_SERVICES;

export const getOrderServiceLabel = (
  projectId: CrmProjectId = getStoredProjectId(),
): string => projectId === 'drying-center' ? 'Услуга' : 'Вредитель';

export const getDefaultOrderService = (
  projectId: CrmProjectId = getStoredProjectId(),
): string => getOrderServices(projectId)[0];

export const resolveOrderService = (
  pest?: string,
  projectId: CrmProjectId = getStoredProjectId(),
): string => {
  const services = getOrderServices(projectId);
  const trimmed = (pest || '').trim();
  return trimmed && services.includes(trimmed) ? trimmed : services[0];
};
