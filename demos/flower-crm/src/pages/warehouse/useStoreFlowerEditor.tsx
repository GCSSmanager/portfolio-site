import { useCallback, useRef, useState } from 'react'
import { apiFetch } from '../../api/apiFetch'
import { useCrmConfirm } from '../../hooks/useCrmConfirm'
import type { TaxonSearchHit } from '../../utils/taxonSearchQuery'
import { parseMoneyInput, parseStoredMoney } from '../../utils/crmInput'
import { formatUnitCostInput } from './TaxonPickQtyRow'
import {
  StoreFlowerModal,
  type StoreFlowerCareRuleDraft,
  type StoreFlowerEntryInitial,
} from './StoreFlowerModal'
import type { StoreFlowerRow } from './WarehouseFlowersCatalog'

function flowerUnitPriceDraft(unitPrice: string | null | undefined): string {
  const n = parseStoredMoney(unitPrice ?? null)
  if (n == null || n <= 0) return ''
  return formatUnitCostInput(n)
}

const emptyInitial = (): StoreFlowerEntryInitial => ({
  name: '',
  photoPreviewUrl: null,
  notes: '',
  catalogTaxon: null,
  careRules: [],
  unitPrice: '',
})

type Options = {
  isOwner: boolean
  onSaved: () => void | Promise<void>
}

export function useStoreFlowerEditor({ isOwner, onSaved }: Options) {
  const { ask, dialog: confirmDialog } = useCrmConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [initial, setInitial] = useState<StoreFlowerEntryInitial>(emptyInitial)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const prepareSeq = useRef(0)

  const openAdd = useCallback(() => {
    if (!isOwner) return
    prepareSeq.current += 1
    setModalMode('add')
    setEditingId(null)
    setEditingLabel('')
    setInitial(emptyInitial())
    setModalError(null)
    setModalOpen(true)
  }, [isOwner])

  const openEdit = useCallback(
    (f: StoreFlowerRow) => {
      if (!isOwner) return
      const seq = ++prepareSeq.current
      setModalError(null)
      const catalogTaxon: TaxonSearchHit | null = f.catalog_taxon
        ? {
            id: f.catalog_taxon.id,
            name: f.catalog_taxon.latin_name,
            name_ru: f.catalog_taxon.display_name,
            display_name: f.catalog_taxon.display_name,
            rank: '',
            rank_label: f.catalog_taxon.rank_label,
          }
        : null
      setModalMode('edit')
      setEditingId(f.id)
      setEditingLabel(f.display_name)
      setInitial({
        name: f.name,
        photoPreviewUrl: f.photo_url,
        notes: f.notes ?? '',
        catalogTaxon,
        careRules: [],
        unitPrice: flowerUnitPriceDraft(f.unit_price),
      })
      setModalOpen(true)

      if (!f.catalog_linked) {
        void (async () => {
          const res = await apiFetch(`/api/me/flowers/${f.id}/care/`)
          if (seq !== prepareSeq.current) return
          let careRules: StoreFlowerCareRuleDraft[] = []
          if (res.ok) {
            const j = (await res.json()) as {
              care_rules: Array<{
                key: string
                kind: string
                integer_value?: number
                decimal_value?: number
                structured_value?: [number, number]
                text_value?: string | null
              }>
            }
            careRules = j.care_rules.map((r) => ({
              key: r.key,
              kind: r.kind,
              integer_value: r.integer_value ?? undefined,
              decimal_value: r.decimal_value ?? undefined,
              structured_value: r.structured_value as [number, number] | undefined,
              text_value: r.text_value ?? undefined,
            }))
          }
          setInitial({
            name: f.name,
            photoPreviewUrl: f.photo_url,
            notes: f.notes ?? '',
            catalogTaxon,
            careRules,
            unitPrice: flowerUnitPriceDraft(f.unit_price),
          })
        })()
      }
    },
    [isOwner],
  )

  const saveFlowerUnitPrice = async (flowerId: number, unitPriceRaw: string) => {
    const priceParsed = parseMoneyInput(unitPriceRaw)
    if (priceParsed === 'bad') {
      setModalError('Некорректная цена продажи')
      return false
    }
    const res = await apiFetch('/api/me/stock/prices/', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_flower_id: flowerId, unit_price: priceParsed }),
    })
    const j = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      setModalError(j.error ?? `Цена не сохранена (${res.status})`)
      return false
    }
    return true
  }

  const handleSubmit = async (values: {
    name: string
    photoFile: File | null
    notes: string
    taxonId: number | null
    careRules: StoreFlowerCareRuleDraft[]
    unitPrice: string
  }) => {
    setSaving(true)
    setModalError(null)
    const body: Record<string, unknown> = {
      name: values.name,
      notes: values.notes || null,
      taxon_id: values.taxonId,
    }
    if (values.taxonId == null) {
      body.care_rules = values.careRules.map((r) => ({
        key: r.key,
        kind: r.kind,
        integer_value: r.integer_value ?? null,
        decimal_value: r.decimal_value ?? null,
        structured_value: r.structured_value ?? null,
        text_value: r.text_value ?? '',
      }))
    }
    try {
      const res = await apiFetch(
        modalMode === 'add' ? '/api/me/flowers/' : `/api/me/flowers/${editingId}/`,
        {
          method: modalMode === 'add' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      const j = (await res.json().catch(() => ({}))) as {
        flowers?: StoreFlowerRow[]
        flower?: StoreFlowerRow
        error?: string
      }
      if (!res.ok) {
        setModalError(j.error ?? `Ошибка ${res.status}`)
        return
      }
      const savedId =
        j.flower?.id ??
        (modalMode === 'edit' && editingId != null ? editingId : j.flowers?.[j.flowers.length - 1]?.id)
      if (values.photoFile && savedId != null) {
        const fd = new FormData()
        fd.append('photo', values.photoFile)
        const up = await apiFetch(`/api/me/flowers/${savedId}/photo/`, { method: 'POST', body: fd })
        if (!up.ok) {
          const uj = (await up.json().catch(() => ({}))) as { error?: string }
          setModalError(uj.error ?? `Фото не загружено (${up.status})`)
          return
        }
      }
      if (savedId != null) {
        const ok = await saveFlowerUnitPrice(savedId, values.unitPrice)
        if (!ok) return
      }
      await onSaved()
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const removeFlower = () => {
    if (editingId == null) return
    const id = editingId
    const label = editingLabel || 'цветок'
    ask({
      title: `Удалить «${label}»?`,
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        setSaving(true)
        setModalError(null)
        try {
          const res = await apiFetch(`/api/me/flowers/${id}/`, { method: 'DELETE' })
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          if (!res.ok) {
            setModalError(j.error ?? `Ошибка ${res.status}`)
            return
          }
          await onSaved()
          setModalOpen(false)
        } finally {
          setSaving(false)
        }
      },
    })
  }

  const modal = (
    <StoreFlowerModal
      open={modalOpen && isOwner}
      mode={modalMode}
      initial={initial}
      busy={saving}
      error={modalError}
      onClose={() => setModalOpen(false)}
      onSubmit={handleSubmit}
      onDelete={modalMode === 'edit' ? removeFlower : undefined}
    />
  )

  return { openAdd, openEdit, modal, confirmDialog }
}
