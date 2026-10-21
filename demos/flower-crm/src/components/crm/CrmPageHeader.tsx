import {
  HomeSalesTripleDisplay,
  IconCart,
  IconDeliveryTruck,
  IconBouquet,
  IconSprout,
  IconWaste,
} from '.'
import { CrmButton } from '../ui/CrmButton'
import type { HomeSalesDayApi, StockCrmSurface } from './stock/types'

type Props = {
  surface: StockCrmSurface
  batchesLoaded: boolean
  /** Владелец: продажи за сегодня (выручка и прибыль). */
  showHomeSalesStats?: boolean
  homeSalesDay: HomeSalesDayApi | null
  hasSaleStock: boolean
  /** Заказ: без «букета на заказ»; по умолчанию как hasSaleStock. */
  hasOrderStock?: boolean
  /** Есть ли что списать: партии цветов и/или товары без срока с остатком. */
  hasDiscardableStock: boolean
  /** Владелец: кнопка «Сделать поставку» и связанные действия. */
  showSupplierDelivery?: boolean
  /** Владелец: новый приход и новый товар без срока (на главной и на складе). */
  showStockReceivingActions?: boolean
  /** На складе товар создают в разделе «Товары без срока» — кнопку в шапке можно скрыть. */
  showHeaderRetailProduct?: boolean
  onOpenSupplierDelivery: () => void
  onOpenIntake: () => void
  onOpenRetailProduct: () => void
  onOpenBouquetAssemble?: () => void
  onOpenSale: () => void
  onOpenOrder: () => void
  onOpenWaste: () => void
}

export function CrmPageHeader({
  surface,
  batchesLoaded,
  showHomeSalesStats = false,
  homeSalesDay,
  hasSaleStock,
  hasOrderStock = hasSaleStock,
  hasDiscardableStock,
  showSupplierDelivery = true,
  showStockReceivingActions = true,
  showHeaderRetailProduct = true,
  onOpenSupplierDelivery,
  onOpenIntake,
  onOpenRetailProduct,
  onOpenBouquetAssemble,
  onOpenSale,
  onOpenOrder,
  onOpenWaste,
}: Props) {
  return (
    <header
      className={`crm-page-head${
        surface === 'home' ? ' crm-page-head--home' : surface === 'warehouse' ? ' crm-page-head--warehouse' : ''
      }`.trim()}
    >
      <div className="crm-page-head__top">
        <h1 className="crm-page-head__title">{surface === 'warehouse' ? 'Склад' : 'Главная'}</h1>
        {batchesLoaded && surface === 'warehouse' ? (
          <div className="crm-page-head__warehouse-bar">
            <div className="crm-page-head__actions" role="toolbar" aria-label="Действия склада">
              {showSupplierDelivery ? (
                <CrmButton variant="add" onClick={onOpenSupplierDelivery}>
                  Сделать поставку
                </CrmButton>
              ) : null}
              {showStockReceivingActions ? (
                <>
                  <CrmButton variant="add" onClick={onOpenIntake}>
                    Новый приход
                  </CrmButton>
                  {showHeaderRetailProduct ? (
                    <CrmButton variant="add" onClick={onOpenRetailProduct}>
                      Новый товар
                    </CrmButton>
                  ) : null}
                  {onOpenBouquetAssemble ? (
                    <CrmButton variant="add" onClick={onOpenBouquetAssemble}>
                      Собрать букет
                    </CrmButton>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {batchesLoaded && surface === 'home' ? (
        <div className="crm-home-headboard" aria-label="Главная">
          {showHomeSalesStats ? (
            <p className="crm-home-headboard__sales-line" aria-label="Продажи за сегодня">
              <HomeSalesTripleDisplay
                qty={homeSalesDay?.total_quantity ?? null}
                revenueStr={homeSalesDay?.total_amount}
                profitStr={homeSalesDay?.total_profit}
                loaded={homeSalesDay != null}
                bare
              />
            </p>
          ) : null}
          <div className="crm-home-headboard__actions" role="toolbar" aria-label="Быстрые действия">
            {showSupplierDelivery ? (
              <CrmButton
                variant="homeHead"
                homeAction="delivery"
                icon={<IconDeliveryTruck size={22} />}
                onClick={onOpenSupplierDelivery}
                title="Запланировать привоз"
              >
                Поставка
              </CrmButton>
            ) : null}
            {showStockReceivingActions ? (
              <>
                <CrmButton
                  variant="homeHead"
                  homeAction="intake"
                  icon={<IconSprout size={22} />}
                  onClick={onOpenIntake}
                  title="Новый приход"
                >
                  Приход
                </CrmButton>
                {onOpenBouquetAssemble ? (
                  <CrmButton
                    variant="homeHead"
                    homeAction="bouquet"
                    icon={<IconBouquet size={22} />}
                    onClick={onOpenBouquetAssemble}
                    title="Собрать букет со склада"
                  >
                    Букет
                  </CrmButton>
                ) : null}
              </>
            ) : null}
            <CrmButton
              variant="homeHead"
              homeAction="sale"
              icon={<IconCart size={22} />}
              disabled={!hasSaleStock}
              title={!hasSaleStock ? 'Нет остатков' : 'Продажа'}
              onClick={onOpenSale}
            >
              Продажа
            </CrmButton>
            <CrmButton
              variant="homeHead"
              homeAction="order"
              icon={<IconDeliveryTruck size={22} />}
              disabled={!hasOrderStock}
              title={!hasOrderStock ? 'Нет остатков' : 'Заказ с доставкой'}
              onClick={onOpenOrder}
            >
              Заказ
            </CrmButton>
            <CrmButton
              variant="homeHead"
              homeAction="waste"
              icon={<IconWaste size={22} />}
              disabled={!hasDiscardableStock}
              title={!hasDiscardableStock ? 'Нет остатков для списания' : 'Списание'}
              onClick={onOpenWaste}
            >
              Списание
            </CrmButton>
          </div>
        </div>
      ) : null}
    </header>
  )
}
