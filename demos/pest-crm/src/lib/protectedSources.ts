/** Системный источник для заявок из раздела «ЛИДЫ» — нельзя переименовать/удалить */
export const PRIVATE_ADVERTISER_SOURCE = 'частный рекламщик';

/** Доля от чистой прибыли — затраты на рекламщика */
export const PRIVATE_ADVERTISER_COMMISSION_RATE = 0.1;

export const isProtectedSource = (name: string): boolean =>
  name.trim().toLowerCase() === PRIVATE_ADVERTISER_SOURCE.toLowerCase();
