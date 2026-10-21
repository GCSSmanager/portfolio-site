import { useCallback, useEffect, useMemo, useState } from 'react'
import { WarehouseRetailStockRow } from '../../components/crm/cards'
import type { RetailProductRow } from '../../components/crm/stock/types'
import { apiFetch } from '../../api/apiFetch'
import { useAuth } from '../../auth/AuthContext'
import { isUpstreamErrorStatus } from '../../utils/networkError'
import { CrmButton } from '../../components/ui/CrmButton'
import { CrmPageStatus } from '../../components/ui/CrmPageStatus'
import { CrmPageToolbar } from '../../components/ui/CrmPageToolbar'
import { CatalogRowEditButton } from './CatalogRowEditButton'
import '../warehouse.css'
import '../storeFlowersPage.css'
import './stock/warehouse-stock-list.css'

type Props = {
  onOpenEdit?: (row: RetailProductRow) => void
  onOpenAdd?: () => void
  /** Увеличивается после сохранения карточки — перезагрузить список. */
  reloadToken?: number
  onOpenStockDiscard?: (row: RetailProductRow) => void
}

/** Товары без срока на складе: каталог всех позиций, в т.ч. с 0 шт (как цветы). */
export function WarehouseRetailCatalog({
  onOpenEdit,
  onOpenAdd,
  reloadToken = 0,
  onOpenStockDiscard,
}: Props) {
  const { isOwner } = useAuth()
  const [products, setProducts] = useState<RetailProductRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    return apiFetch('/api/me/stock/retail/')
      .then((res) => {
        if (res.status === 401) throw new Error('Сессия недействительна.')
        if (!res.ok && isUpstreamErrorStatus(res.status)) return null
        if (!res.ok) {
          return res.json().then(
            (j: { error?: string }) => {
              throw new Error(j.error ?? `Ошибка ${res.status}`)
            },
            () => {
              throw new Error(`Ошибка ${res.status}`)
            },
          )
        }
        return res.json() as Promise<{ products: RetailProductRow[] }>
      })
      .then((data) => {
        if (data) {
          setProducts(data.products)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить')
      })
  }, [])

  useEffect(() => {
    void load()
  }, [load, reloadToken])

  const sorted = useMemo(() => {
    if (!products?.length) return []
    return [...products].sort((a, b) =>
      a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }),
    )
  }, [products])

  const canEdit = isOwner && onOpenEdit != null
  const canAdd = isOwner && onOpenAdd != null

  return (
    <div className="warehouse-flowers-catalog">
      <CrmPageToolbar
        layout="toolbar"
        density="section"
        actions={
          canAdd ? (
            <CrmButton variant="accent" onClick={onOpenAdd}>
              + Товар
            </CrmButton>
          ) : null
        }
      />

      <CrmPageStatus error={error} loading={products === null && !error} variant="banner" />

      {products != null && sorted.length === 0 ? (
        <p className="store-flowers__muted">
          Пока нет товаров.
          {canAdd ? (
            <>
              {' '}
              <CrmButton variant="link" onClick={onOpenAdd}>
                Добавить первый
              </CrmButton>
            </>
          ) : (
            ' Владелец магазина может добавить позиции здесь.'
          )}
        </p>
      ) : null}

      {sorted.length > 0 ? (
        <ul className="warehouse-stock-list">
          {sorted.map((row) => (
            <WarehouseRetailStockRow
              key={row.id}
              row={row}
              showPricesLink={false}
              ownerActions={canEdit ? <CatalogRowEditButton onClick={() => onOpenEdit(row)} /> : undefined}
              showStockDiscard={Boolean(isOwner && row.quantity > 0 && onOpenStockDiscard)}
              onRequestStockDiscard={
                isOwner && row.quantity > 0 && onOpenStockDiscard
                  ? () => onOpenStockDiscard(row)
                  : undefined
              }
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}
