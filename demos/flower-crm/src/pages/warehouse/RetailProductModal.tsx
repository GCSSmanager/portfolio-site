import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { CrmButton } from '../../components/ui/CrmButton'
import { CrmModal } from '../../components/ui/CrmModal'
import { parseStoredMoney } from '../../utils/crmInput'
import { formatUnitCostInput } from './TaxonPickQtyRow'
import { StoreFlowerThumb } from '../../components/ui/StoreFlowerThumb'
import { CrmField, CrmFileField, CrmMoneyField } from './CrmField'

export type RetailProductEntryInitial = {
  name: string
  photoPreviewUrl: string | null
  unitPrice: string
}

type Props = {
  open: boolean
  mode: 'add' | 'edit'
  initial: RetailProductEntryInitial
  productId?: number | null
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (values: { name: string; photoFile: File | null; unitPrice: string }) => void | Promise<void>
  onDelete?: () => void | Promise<void>
}

export function RetailProductModal({
  open,
  mode,
  initial,
  busy = false,
  error = null,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const [name, setName] = useState(initial.name)
  const [unitPrice, setUnitPrice] = useState(initial.unitPrice)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const photoPreviewUrl = useMemo(() => {
    if (photoFile) return URL.createObjectURL(photoFile)
    return initial.photoPreviewUrl
  }, [photoFile, initial.photoPreviewUrl])

  useEffect(() => {
    return () => {
      if (photoFile && photoPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl)
      }
    }
  }, [photoFile, photoPreviewUrl])

  useEffect(() => {
    if (!open) return
    setName(initial.name)
    setUnitPrice(initial.unitPrice)
    setPhotoFile(null)
  }, [open, initial])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    void Promise.resolve(
      onSubmit({
        name: name.trim(),
        photoFile,
        unitPrice: unitPrice.trim(),
      }),
    )
  }

  const handleDelete = () => {
    if (busy || mode !== 'edit' || onDelete == null) return
    void Promise.resolve(onDelete())
  }

  return (
    <CrmModal
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Новый товар' : 'Изменить товар'}
      width="md"
      busy={busy}
      portal
      onSubmit={submit}
    >
      {error ? (
        <p className="crm-field__error" role="alert">
          {error}
        </p>
      ) : null}

      <CrmField
        label="Название"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Например: Открытка «Спасибо»"
      />
      <CrmFileField
        label="Фото"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
        compressPhoto
        onFileSelected={setPhotoFile}
      />
      <div className="store-flowers__photo-preview">
        {photoPreviewUrl?.startsWith('blob:') ? (
          <img src={photoPreviewUrl} alt="" />
        ) : (
          <StoreFlowerThumb url={photoPreviewUrl} alt="" size={120} variant="retail" />
        )}
      </div>
      <CrmMoneyField
        label="Цена продажи, ₽/шт"
        value={unitPrice}
        onChange={(e) => setUnitPrice(e.target.value)}
        hint="Пусто — цена не задана."
      />
      <CrmModal.Actions>
        {mode === 'edit' && onDelete != null ? (
          <CrmButton variant="danger" disabled={busy} onClick={handleDelete}>
            Удалить товар
          </CrmButton>
        ) : null}
        <CrmButton variant="primary" type="submit" disabled={!name.trim() || busy}>
          {busy ? '…' : mode === 'add' ? 'Добавить' : 'Сохранить'}
        </CrmButton>
      </CrmModal.Actions>
    </CrmModal>
  )
}

export function retailProductUnitPriceDraft(unitPrice: string | null | undefined): string {
  const n = parseStoredMoney(unitPrice ?? null)
  if (n == null || n <= 0) return ''
  return formatUnitCostInput(n)
}
