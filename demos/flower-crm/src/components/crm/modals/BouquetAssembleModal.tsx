import { type FormEvent, useEffect, useMemo } from 'react'
import { CrmButton } from '../../ui/CrmButton'
import { CrmModal } from '../../ui/CrmModal'
import { CrmQtyField, CrmListSearch } from '../../../pages/warehouse'
import { formatStoreFlowerStockHint } from '../../../utils/bouquetAssembleRealization'
import type {
  BouquetAssembleConsumableUsageRow,
  BouquetAssembleUsageRow,
} from '../../../utils/bouquetAssembleRealization'
import type { BouquetRow } from '../stock/types'

type Props = {
  open: boolean
  bouquets: BouquetRow[]
  bouquetId: number | ''
  bouquetQty: string
  bouquetCount: number
  bouquetQtyValid: boolean
  usageRows: BouquetAssembleUsageRow[]
  consumableUsageRows: BouquetAssembleConsumableUsageRow[]
  formError: string | null
  invalidField: 'bouquet' | 'qty' | 'lines' | null
  busy: boolean
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  onBouquetIdChange: (id: number | '') => void
  onBouquetQtyChange: (v: string) => void
}

function bouquetCountLabel(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} букет`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} букета`
  return `${n} букетов`
}

export function BouquetAssembleModal({
  open,
  bouquets,
  bouquetId,
  bouquetQty,
  bouquetCount,
  bouquetQtyValid,
  usageRows,
  consumableUsageRows,
  formError,
  invalidField,
  busy,
  onClose,
  onSubmit,
  onBouquetIdChange,
  onBouquetQtyChange,
}: Props) {
  const sortedBouquets = useMemo(
    () => [...bouquets].sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' })),
    [bouquets],
  )
  const selected = sortedBouquets.find((b) => b.id === bouquetId)

  const bouquetPickOptions = useMemo(
    () =>
      sortedBouquets.map((b) => ({
        key: String(b.id),
        title: b.name,
        searchText: b.name,
      })),
    [sortedBouquets],
  )

  const qtyInvalid = invalidField === 'qty' || Boolean(selected && !bouquetQtyValid)
  const hasShortage =
    usageRows.some((r) => r.shortage) || consumableUsageRows.some((r) => r.shortage)
  const linesInvalid = invalidField === 'lines' || hasShortage

  useEffect(() => {
    if (!open || bouquetId !== '' || sortedBouquets.length !== 1) return
    onBouquetIdChange(sortedBouquets[0]!.id)
  }, [open, bouquetId, sortedBouquets, onBouquetIdChange])

  const submitDisabled =
    busy || sortedBouquets.length === 0 || bouquetId === '' || !bouquetQtyValid || hasShortage

  return (
    <CrmModal open={open} onClose={onClose} title="Собрать букет" width="2xl" busy={busy} portal onSubmit={onSubmit}>
      {formError ? (
        <p className="crm-field__error" role="alert">
          {formError}
        </p>
      ) : null}
      <p className="crm-field__hint crm-field__hint--tight">
        Со склада спишутся цветы (вне реализации) и расходники по рецепту. Лента — в сантиметрах, упаковка — в
        штуках.
      </p>
      {sortedBouquets.length === 0 ? (
        <p className="crm-field__hint">Сначала создайте букет в разделе «Букеты» на складе.</p>
      ) : (
        <>
          <label
            className={`crm-field${invalidField === 'bouquet' && bouquetId === '' ? ' crm-field--invalid' : ''}`.trim()}
          >
            <span className="crm-field__lab">Букет</span>
            <CrmListSearch
              options={bouquetPickOptions}
              selectedKey={bouquetId === '' ? '' : String(bouquetId)}
              onSelect={(key) => onBouquetIdChange(key === '' ? '' : Number.parseInt(key, 10))}
              placeholder="Название букета…"
              ariaLabel="Выбор букета"
              invalid={invalidField === 'bouquet' && bouquetId === ''}
              disabled={busy}
              emptyHint="Нет подходящих букетов"
              openListOnFocus
            />
          </label>
          {selected &&
          selected.recipe_lines.length === 0 &&
          (selected.consumable_recipe_lines?.length ?? 0) === 0 ? (
            <p className="crm-field__error">У выбранного букета нет состава — отредактируйте карточку.</p>
          ) : null}
          <CrmQtyField
            label="Сколько букетов собрать"
            value={bouquetQty}
            onChange={(e) => onBouquetQtyChange(e.target.value)}
            invalid={qtyInvalid}
            min={1}
            disabled={!selected || busy}
          />
          {qtyInvalid && selected && bouquetQty.trim() !== '' ? (
            <p className="crm-field__error" role="status">
              Количество букетов — целое число не меньше 1.
            </p>
          ) : null}
          {usageRows.length > 0 || consumableUsageRows.length > 0 ? (
            <div className={`crm-field${linesInvalid ? ' crm-field--invalid' : ''}`.trim()}>
              <span className="crm-field__lab">Состав</span>
              <ul className="crm-delivery-lines crm-delivery-lines--grid-cards bouquet-assemble-usage">
                {usageRows.map((row) => (
                  <li
                    key={row.storeFlowerId}
                    className={`crm-delivery-lines__row bouquet-assemble-usage__row${
                      row.shortage ? ' bouquet-assemble-usage__row--shortage' : ''
                    }`.trim()}
                  >
                    <span className="crm-delivery-lines__label">{row.displayName}</span>
                    <p className="bouquet-assemble-usage__meta">
                      <span className="bouquet-assemble-usage__line">
                        В букете: <strong>{row.perBouquet}</strong> шт.
                      </span>
                      {row.needTotal != null ? (
                        <span className="bouquet-assemble-usage__line">
                          Будет использовано: <strong>{row.needTotal}</strong> шт. ({row.perBouquet} ×{' '}
                          {bouquetCountLabel(bouquetCount)})
                        </span>
                      ) : null}
                      <span className="bouquet-assemble-usage__line">
                        {formatStoreFlowerStockHint({
                          total: row.stockTotal,
                          realization: row.stockRealization,
                          available: row.stockAvailable,
                        })}
                      </span>
                      {row.shortage ? (
                        <span className="bouquet-assemble-usage__warn" role="status">
                          Недостаточно вне реализации (нужно {row.needTotal}, доступно {row.stockAvailable})
                        </span>
                      ) : null}
                    </p>
                  </li>
                ))}
                {consumableUsageRows.map((row) => (
                  <li
                    key={`c-${row.consumableId}`}
                    className={`crm-delivery-lines__row bouquet-assemble-usage__row${
                      row.shortage ? ' bouquet-assemble-usage__row--shortage' : ''
                    }`.trim()}
                  >
                    <span className="crm-delivery-lines__label">{row.displayName}</span>
                    <p className="bouquet-assemble-usage__meta">
                      <span className="bouquet-assemble-usage__line">
                        В букете: <strong>{row.perBouquet}</strong> {row.unitLabel}
                      </span>
                      {row.needTotal != null ? (
                        <span className="bouquet-assemble-usage__line">
                          Будет использовано: <strong>{row.needTotal}</strong> {row.unitLabel} ({row.perBouquet} ×{' '}
                          {bouquetCountLabel(bouquetCount)})
                        </span>
                      ) : null}
                      <span className="bouquet-assemble-usage__line">
                        На складе: <strong>{row.stockAvailable}</strong> {row.unitLabel}
                      </span>
                      {row.shortage ? (
                        <span className="bouquet-assemble-usage__warn" role="status">
                          Недостаточно (нужно {row.needTotal}, доступно {row.stockAvailable})
                        </span>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {hasShortage && bouquetQtyValid ? (
            <p className="crm-field__error" role="status">
              Не хватает цветов или расходников — уменьшите число букетов или пополните остаток.
            </p>
          ) : null}
        </>
      )}
      <CrmModal.Actions>
        <CrmButton variant="primary" type="submit" disabled={submitDisabled}>
          {busy ? '…' : 'Собрать'}
        </CrmButton>
      </CrmModal.Actions>
    </CrmModal>
  )
}
