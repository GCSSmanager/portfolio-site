import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { CrmButton } from '../../components/ui/CrmButton'
import { CrmModal } from '../../components/ui/CrmModal'
import { StoreFlowerThumb } from '../../components/ui/StoreFlowerThumb'
import type { ConsumableUnitKind } from '../../components/crm/stock/types'
import { CrmField, CrmFileField } from './CrmField'
import { ConsumableUnitKindPick } from './ConsumableUnitKindPick'

export type ConsumableEntryInitial = {
  name: string
  unitKind: ConsumableUnitKind
  photoPreviewUrl: string | null
}

type Props = {
  open: boolean
  mode: 'add' | 'edit'
  initial: ConsumableEntryInitial
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (values: { name: string; unitKind: ConsumableUnitKind; photoFile: File | null }) => void | Promise<void>
  onDelete?: () => void | Promise<void>
}

export function ConsumableModal({
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
  const [unitKind, setUnitKind] = useState<ConsumableUnitKind>(initial.unitKind)
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
    setUnitKind(initial.unitKind)
    setPhotoFile(null)
  }, [open, initial])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || busy) return
    void Promise.resolve(
      onSubmit({
        name: name.trim(),
        unitKind,
        photoFile,
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
      title={mode === 'add' ? 'Новый расходник' : 'Изменить расходник'}
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
        placeholder="Например: Держатель для открытки"
      />
      <ConsumableUnitKindPick value={unitKind} onChange={setUnitKind} disabled={busy} />
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
          <StoreFlowerThumb url={photoPreviewUrl} alt="" size={120} variant="consumable" />
        )}
      </div>
      <CrmModal.Actions>
        {mode === 'edit' && onDelete != null ? (
          <CrmButton type="button" variant="danger" disabled={busy} onClick={handleDelete}>
            Удалить
          </CrmButton>
        ) : null}
        <CrmButton type="submit" variant="primary" disabled={busy || !name.trim()}>
          {busy ? '…' : mode === 'add' ? 'Добавить' : 'Сохранить'}
        </CrmButton>
      </CrmModal.Actions>
    </CrmModal>
  )
}
