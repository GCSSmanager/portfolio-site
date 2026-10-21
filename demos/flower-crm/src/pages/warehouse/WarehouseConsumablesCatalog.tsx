import { useCallback, useEffect, useMemo, useState } from 'react'
import { WarehouseConsumableStockRow } from '../../components/crm/cards/WarehouseConsumableStockRow'
import type { ConsumableRow } from '../../components/crm/stock/types'
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
  items?: ConsumableRow[] | null
  onOpenEdit?: (row: ConsumableRow) => void
  onOpenAdd?: () => void
  reloadToken?: number
  onOpenIntake?: (row: ConsumableRow) => void
  onOpenStockDiscard?: (row: ConsumableRow) => void
}

export function WarehouseConsumablesCatalog({
  items: itemsProp,
  onOpenEdit,
  onOpenAdd,
  reloadToken = 0,
  onOpenIntake,
  onOpenStockDiscard,
}: Props) {
  const { isOwner } = useAuth()
  const [fetched, setFetched] = useState<ConsumableRow[] | null>(itemsProp ?? null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (itemsProp != null) {
      setFetched(itemsProp)
      setError(null)
      return Promise.resolve()
    }
    return apiFetch('/api/me/stock/consumables/')
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
        return res.json() as Promise<{ consumables: ConsumableRow[] }>
      })
      .then((data) => {
        if (data) {
          setFetched(data.consumables)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить')
      })
  }, [itemsProp])

  useEffect(() => {
    void load()
  }, [load, reloadToken, itemsProp])

  const sorted = useMemo(() => {
    const list = itemsProp ?? fetched
    if (!list?.length) return []
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }))
  }, [itemsProp, fetched])

  const products = itemsProp ?? fetched
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
              + Расходник
            </CrmButton>
          ) : null
        }
      />

      <CrmPageStatus error={error} loading={products === null && !error} variant="banner" />

      {products != null && sorted.length === 0 ? (
        <p className="store-flowers__muted">
          Пока нет расходников.
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
            <WarehouseConsumableStockRow
              key={row.id}
              row={row}
              ownerActions={canEdit ? <CatalogRowEditButton onClick={() => onOpenEdit(row)} /> : undefined}
              onRequestIntake={isOwner && onOpenIntake ? () => onOpenIntake(row) : undefined}
              showStockDiscard={Boolean(isOwner && onOpenStockDiscard)}
              onRequestStockDiscard={
                isOwner && onOpenStockDiscard ? () => onOpenStockDiscard(row) : undefined
              }
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}
