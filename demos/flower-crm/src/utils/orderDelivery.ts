/** Значение в списке «Сервис доставки» для самовывоза (не id из БД). */
export const ORDER_PICKUP_SERVICE_VALUE = 'pickup'

export const ORDER_PICKUP_SERVICE_LABEL = 'Заберёт в магазине'

export function isOrderPickupDelivery(serviceId: string): boolean {
  return serviceId === ORDER_PICKUP_SERVICE_VALUE
}
