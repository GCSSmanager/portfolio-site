import { useMemo } from 'react'
import { WarehouseBouquetStockRow } from '../../components/crm/cards/WarehouseBouquetStockRow'
import type { BouquetRow } from '../../components/crm/stock/types'
import { CrmButton } from '../../components/ui/CrmButton'
import { CrmPageToolbar } from '../../components/ui/CrmPageToolbar'
import { CatalogRowEditButton } from './CatalogRowEditButton'
import '../warehouse.css'
import '../storeFlowersPage.css'
import './warehouseFlowersCatalog.css'
import './stock/warehouse-stock-list.css'

type Props = {
  bouquets: BouquetRow[]
  warehouseMode?: string
  isOwner?: boolean
  onOpenCreateRecipe?: () => void
  onOpenEdit?: (row: BouquetRow) => void
  onOpenStockDiscard?: (row: BouquetRow) => void
}

export function WarehouseBouquetCatalog({
  bouquets,
  warehouseMode,
  isOwner = false,
  onOpenCreateRecipe,
  onOpenEdit,
  onOpenStockDiscard,
}: Props) {
  const sorted = useMemo(
    () =>
      [...bouquets].sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' })),
    [bouquets],
  )

  return (
    <div className="warehouse-flowers-catalog">
      <CrmPageToolbar
        layout="toolbar"
        density="section"
        actions={
          isOwner && onOpenCreateRecipe ? (
            <CrmButton variant="accent" onClick={onOpenCreateRecipe}>
              + Букет
            </CrmButton>
          ) : null
        }
      />

      {sorted.length === 0 ? (
        <p className="store-flowers__muted">
          Пока нет букетов.
          {isOwner && onOpenCreateRecipe ? (
            <>
              {' '}
              <CrmButton variant="link" onClick={onOpenCreateRecipe}>
                Добавить первый
              </CrmButton>
            </>
          ) : (
            ' Владелец магазина может добавить букеты здесь.'
          )}
        </p>
      ) : (
        <ul className="warehouse-stock-list">
          {sorted.map((row) => (
            <WarehouseBouquetStockRow
              key={row.id}
              row={row}
              warehouseMode={warehouseMode}
              ownerActions={isOwner && onOpenEdit ? <CatalogRowEditButton onClick={() => onOpenEdit(row)} /> : undefined}
              showStockDiscard={Boolean(isOwner && row.quantity > 0 && onOpenStockDiscard)}
              onRequestStockDiscard={
                isOwner && row.quantity > 0 && onOpenStockDiscard ? () => onOpenStockDiscard(row) : undefined
              }
            />
          ))}
        </ul>
      )}
    </div>
  )
}
