import { type Dispatch, type FormEvent, type SetStateAction, useMemo } from 'react'
import { CrmButton } from '../../ui/CrmButton'
import { CrmModal } from '../../ui/CrmModal'
import { StoreFlowerThumb } from '../../ui/StoreFlowerThumb'
import { isConsumableStockHit, isFlowerStockHit } from '../../../utils/stockSearchQuery'
import { TaxonPickQtyRow, type TaxonQtyLineRow } from '../../../pages/warehouse'
import { CrmField, CrmFileField, CrmMoneyField } from '../../../pages/warehouse'
import { formatStoreFlowerStockHint, type StoreFlowerStockBreakdown } from '../../../utils/bouquetAssembleRealization'
import {
  newBouquetConsumableRecipeLine,
  newBouquetRecipeLine,
  bouquetRecipeLineIsUnfilled,
} from './bouquetRecipeForm'

type Props = {
  open: boolean
  mode: 'add' | 'edit'
  name: string
  unitPrice: string
  photoPreviewUrl: string | null
  flowerLines: TaxonQtyLineRow[]
  consumableLines: TaxonQtyLineRow[]
  /** На складе уже есть собранные букеты — рецепт всё равно можно менять (для следующих сборок). */
  recipeHasAssembledStock?: boolean
  formError: string | null
  invalidField: 'name' | 'lines' | 'price' | null
  busy: boolean
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  onDelete?: () => void
  onNameChange: (v: string) => void
  onUnitPriceChange: (v: string) => void
  onPhotoChange: (file: File | null) => void
  onSetFlowerLines: Dispatch<SetStateAction<TaxonQtyLineRow[]>>
  onSetConsumableLines: Dispatch<SetStateAction<TaxonQtyLineRow[]>>
  onSetFlowerLineTaxon: (key: number, taxon: TaxonQtyLineRow['taxon']) => void
  onSetFlowerLineQty: (key: number, qty: string) => void
  onSetConsumableLineTaxon: (key: number, taxon: TaxonQtyLineRow['taxon']) => void
  onSetConsumableLineQty: (key: number, qty: string) => void
  storeFlowerStockBySf?: Map<number, StoreFlowerStockBreakdown>
}

export {
  newBouquetRecipeLine,
  newBouquetConsumableRecipeLine,
} from './bouquetRecipeForm'

export function BouquetRecipeModal({
  open,
  mode,
  name,
  unitPrice,
  photoPreviewUrl,
  flowerLines,
  consumableLines,
  formError,
  invalidField,
  busy,
  onClose,
  onSubmit,
  onDelete,
  onNameChange,
  onUnitPriceChange,
  onPhotoChange,
  onSetFlowerLines,
  onSetConsumableLines,
  onSetFlowerLineTaxon,
  onSetFlowerLineQty,
  onSetConsumableLineTaxon,
  onSetConsumableLineQty,
  storeFlowerStockBySf,
}: Props) {
  const showLineErrors = invalidField === 'lines'

  const handleDelete = () => {
    if (busy || mode !== 'edit' || onDelete == null) return
    void Promise.resolve(onDelete())
  }

  const lockedFlowerLines = useMemo(
    () => flowerLines.filter((ln) => !ln.taxon || isFlowerStockHit(ln.taxon)),
    [flowerLines],
  )
  const lockedConsumableLines = useMemo(
    () => consumableLines.filter((ln) => !ln.taxon || isConsumableStockHit(ln.taxon)),
    [consumableLines],
  )

  const hasUnfilledFlowerLine = lockedFlowerLines.some(bouquetRecipeLineIsUnfilled)
  const hasUnfilledConsumableLine = lockedConsumableLines.some(bouquetRecipeLineIsUnfilled)
  const hasAnyComposition =
    lockedFlowerLines.some((ln) => ln.taxon && isFlowerStockHit(ln.taxon)) ||
    lockedConsumableLines.some((ln) => ln.taxon && isConsumableStockHit(ln.taxon))
  const canSubmit =
    Boolean(name.trim()) &&
    !busy &&
    !hasUnfilledFlowerLine &&
    !hasUnfilledConsumableLine &&
    hasAnyComposition

  return (
    <CrmModal
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Новый букет' : 'Изменить букет'}
      width="2xl"
      busy={busy}
      portal
      onSubmit={onSubmit}
    >
      {formError ? (
        <p className="crm-field__error" role="alert">
          {formError}
        </p>
      ) : null}
      <CrmField
        label="Название"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Например: Букет из 15 роз"
        invalid={invalidField === 'name'}
      />
      <CrmFileField
        label="Фото"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
        compressPhoto
        onFileSelected={onPhotoChange}
      />
      <div className="store-flowers__photo-preview">
        {photoPreviewUrl?.startsWith('blob:') ? (
          <img src={photoPreviewUrl} alt="" />
        ) : (
          <StoreFlowerThumb url={photoPreviewUrl} alt="" size={120} variant="bouquet" />
        )}
      </div>
      <CrmMoneyField
        label="Цена продажи, ₽/шт"
        value={unitPrice}
        onChange={(e) => onUnitPriceChange(e.target.value)}
        hint="Пусто — цена не задана."
        invalid={invalidField === 'price'}
      />
      <div className={`crm-field${showLineErrors ? ' crm-field--invalid' : ''}`.trim()}>
        <span className="crm-field__lab">Цветы (на один букет)</span>
        <>
          <ul
            className={`crm-delivery-lines crm-delivery-lines--grid-cards crm-delivery-lines--intake${
              showLineErrors ? ' crm-delivery-lines--invalid' : ''
            }`.trim()}
          >
            {lockedFlowerLines.map((ln) => (
              <li key={ln.key} className="crm-delivery-lines__row crm-delivery-lines__row--stacked">
                <TaxonPickQtyRow
                  lineKey={ln.key}
                  taxon={ln.taxon}
                  qty={ln.qty}
                  quantityMin={1}
                  showLineErrors={showLineErrors}
                  openListOnFocus
                  useStockSearch
                  stockKindFilter="flower"
                  onQtyChange={onSetFlowerLineQty}
                  onTaxonChange={onSetFlowerLineTaxon}
                />
                {ln.taxon && isFlowerStockHit(ln.taxon) && storeFlowerStockBySf ? (
                  <p className="crm-field__hint crm-field__hint--tight bouquet-recipe-line-stock">
                    {formatStoreFlowerStockHint(
                      storeFlowerStockBySf.get(ln.taxon.store_flower_id ?? ln.taxon.id) ?? {
                        total: 0,
                        realization: 0,
                        available: 0,
                      },
                    )}
                  </p>
                ) : null}
                <CrmButton
                  variant="deliveryLineRemove"
                  title="Убрать цветок"
                  aria-label="Убрать цветок"
                  disabled={
                    lockedFlowerLines.filter((r) => r.taxon && isFlowerStockHit(r.taxon)).length < 2 &&
                    consumableLines.filter((r) => r.taxon && isConsumableStockHit(r.taxon)).length === 0
                  }
                  onClick={() => onSetFlowerLines((prev) => prev.filter((r) => r.key !== ln.key))}
                >
                  ×
                </CrmButton>
              </li>
            ))}
          </ul>
          <CrmButton
            variant="deliveryLineAdd"
            disabled={hasUnfilledFlowerLine}
            onClick={() => onSetFlowerLines((prev) => [...prev, newBouquetRecipeLine()])}
          >
            + цветок
          </CrmButton>
        </>
      </div>
      <div className={`crm-field${showLineErrors ? ' crm-field--invalid' : ''}`.trim()}>
        <span className="crm-field__lab">Расходники (на один букет)</span>
        <p className="crm-field__hint crm-field__hint--tight">
          Лента и плёнка — в сантиметрах, упаковка и оазис — в штуках.
        </p>
        <>
          <ul
            className={`crm-delivery-lines crm-delivery-lines--grid-cards crm-delivery-lines--intake${
              showLineErrors ? ' crm-delivery-lines--invalid' : ''
            }`.trim()}
          >
            {lockedConsumableLines.map((ln) => (
              <li key={ln.key} className="crm-delivery-lines__row crm-delivery-lines__row--stacked">
                <TaxonPickQtyRow
                  lineKey={ln.key}
                  taxon={ln.taxon}
                  qty={ln.qty}
                  quantityMin={0}
                  showLineErrors={showLineErrors}
                  openListOnFocus
                  useStockSearch
                  stockKindFilter="consumable"
                  bouquetConsumableQty
                  onQtyChange={onSetConsumableLineQty}
                  onTaxonChange={onSetConsumableLineTaxon}
                />
                <CrmButton
                  variant="deliveryLineRemove"
                  title="Убрать расходник"
                  aria-label="Убрать расходник"
                  onClick={() => onSetConsumableLines((prev) => prev.filter((r) => r.key !== ln.key))}
                >
                  ×
                </CrmButton>
              </li>
            ))}
          </ul>
          <CrmButton
            variant="deliveryLineAdd"
            disabled={hasUnfilledConsumableLine}
            onClick={() => onSetConsumableLines((prev) => [...prev, newBouquetConsumableRecipeLine()])}
          >
            + расходник
          </CrmButton>
        </>
      </div>
      <CrmModal.Actions>
        {mode === 'edit' && onDelete != null ? (
          <CrmButton variant="danger" disabled={busy} onClick={handleDelete}>
            Удалить букет
          </CrmButton>
        ) : null}
        <CrmButton variant="primary" type="submit" disabled={!canSubmit}>
          {busy ? '…' : 'Сохранить'}
        </CrmButton>
      </CrmModal.Actions>
    </CrmModal>
  )
}
