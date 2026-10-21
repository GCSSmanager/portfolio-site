import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../api/apiFetch'
import { CrmButton } from '../../components/ui/CrmButton'
import { CrmModal } from '../../components/ui/CrmModal'
import { StoreFlowerThumb } from '../../components/ui/StoreFlowerThumb'
import {
  CrmField,
  CrmFileField,
  CrmInlineDecimalField,
  CrmInlineQtyField,
  CrmMoneyField,
  CrmSearchField,
} from './CrmField'
import { isMoneyInputBad, isRequiredQtyReady } from '../../utils/crmInput'
import { normalizeTaxonSearchQuery, type TaxonSearchHit } from '../../utils/taxonSearchQuery'

export type StoreFlowerCareRuleDraft = {
  key: string
  kind: string
  integer_value?: number
  decimal_value?: number
  structured_value?: [number, number]
  text_value?: string
}

function findRule(rules: StoreFlowerCareRuleDraft[], key: string) {
  return rules.find((r) => r.key === key)
}

function intervalDaysFromRule(r: StoreFlowerCareRuleDraft | undefined): string {
  if (!r || r.kind !== 'integer' || r.integer_value == null) return ''
  return String(r.integer_value)
}

function structuredSingleFromRule(r: StoreFlowerCareRuleDraft | undefined): string {
  if (!r?.structured_value) return ''
  const [a, b] = r.structured_value
  return String(a === b ? a : a)
}

const DEFAULT_CARE_FORM = {
  waterDays: '2',
  cutDays: '2',
  stemTrimCm: '',
  vaseWaterTemp: '',
  storageTemp: '',
  displayRoomTemp: '',
  vaseLifeDays: '7',
  cutAngle: '',
  careNotes: '',
  warehouseNotes: '',
}

export type StoreFlowerEntryInitial = {
  name: string
  photoPreviewUrl: string | null
  notes: string
  catalogTaxon: TaxonSearchHit | null
  careRules: StoreFlowerCareRuleDraft[]
  /** Цена продажи за шт., ₽ (пусто — не задана). */
  unitPrice: string
}

type CareFormState = typeof DEFAULT_CARE_FORM

function careFormFromRules(rules: StoreFlowerCareRuleDraft[]): CareFormState {
  const src = rules.length > 0 ? rules : []
  return {
    waterDays: intervalDaysFromRule(findRule(src, 'water_change_interval_days')) || DEFAULT_CARE_FORM.waterDays,
    cutDays: intervalDaysFromRule(findRule(src, 'cut_interval_days')) || DEFAULT_CARE_FORM.cutDays,
    stemTrimCm: structuredSingleFromRule(findRule(src, 'stem_trim_per_water_change_cm')),
    vaseWaterTemp: structuredSingleFromRule(findRule(src, 'vase_water_temp_celsius')),
    storageTemp: structuredSingleFromRule(findRule(src, 'storage_temp_celsius')),
    displayRoomTemp: structuredSingleFromRule(findRule(src, 'display_room_temp_celsius')),
    vaseLifeDays:
      structuredSingleFromRule(findRule(src, 'vase_life_days')) || DEFAULT_CARE_FORM.vaseLifeDays,
    cutAngle:
      findRule(src, 'cut_angle_degrees')?.integer_value != null
        ? String(findRule(src, 'cut_angle_degrees')!.integer_value)
        : '',
    careNotes: findRule(src, 'care_notes_ru')?.text_value ?? '',
    warehouseNotes: findRule(src, 'warehouse_arrival_notes_ru')?.text_value ?? '',
  }
}

function buildCareRulesFromForm(form: CareFormState): StoreFlowerCareRuleDraft[] {
  const rules: StoreFlowerCareRuleDraft[] = []
  const water = parseInt(form.waterDays, 10)
  const cut = parseInt(form.cutDays, 10)
  rules.push({
    key: 'water_change_interval_days',
    kind: 'integer',
    integer_value: Number.isFinite(water) && water > 0 ? water : 2,
  })
  rules.push({
    key: 'cut_interval_days',
    kind: 'integer',
    integer_value: Number.isFinite(cut) && cut > 0 ? cut : 2,
  })

  const addStructuredSingle = (key: string, raw: string) => {
    const n = parseFloat(raw.replace(',', '.'))
    if (!raw.trim() || !Number.isFinite(n)) return
    rules.push({ key, kind: 'structured', structured_value: [n, n] })
  }
  addStructuredSingle('stem_trim_per_water_change_cm', form.stemTrimCm)
  addStructuredSingle('vase_water_temp_celsius', form.vaseWaterTemp)
  addStructuredSingle('storage_temp_celsius', form.storageTemp)
  addStructuredSingle('display_room_temp_celsius', form.displayRoomTemp)
  addStructuredSingle('vase_life_days', form.vaseLifeDays)

  const angle = parseInt(form.cutAngle, 10)
  if (form.cutAngle.trim() && Number.isFinite(angle)) {
    rules.push({ key: 'cut_angle_degrees', kind: 'integer', integer_value: angle })
  }

  const careNote = form.careNotes.trim()
  if (careNote) rules.push({ key: 'care_notes_ru', kind: 'text', text_value: careNote })
  const whNote = form.warehouseNotes.trim()
  if (whNote) rules.push({ key: 'warehouse_arrival_notes_ru', kind: 'text', text_value: whNote })

  return rules
}

function optionalDecimalBad(raw: string): boolean {
  return raw.trim() !== '' && isMoneyInputBad(raw)
}

function careFormHasErrors(form: CareFormState): boolean {
  if (!isRequiredQtyReady(form.waterDays, 1)) return true
  if (!isRequiredQtyReady(form.cutDays, 1)) return true
  if (optionalDecimalBad(form.stemTrimCm)) return true
  if (optionalDecimalBad(form.vaseWaterTemp)) return true
  if (optionalDecimalBad(form.storageTemp)) return true
  if (optionalDecimalBad(form.displayRoomTemp)) return true
  if (form.vaseLifeDays.trim() && !isRequiredQtyReady(form.vaseLifeDays, 1)) return true
  if (form.cutAngle.trim() && !isRequiredQtyReady(form.cutAngle, 1)) return true
  return false
}

type Props = {
  open: boolean
  mode: 'add' | 'edit'
  initial: StoreFlowerEntryInitial
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (values: {
    name: string
    photoFile: File | null
    notes: string
    taxonId: number | null
    careRules: StoreFlowerCareRuleDraft[]
    unitPrice: string
  }) => void | Promise<void>
  /** Только в режиме edit: удалить карточку цветка. */
  onDelete?: () => void | Promise<void>
}

export function StoreFlowerModal({
  open,
  mode,
  initial,
  busy,
  error,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const [name, setName] = useState(initial.name)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(initial.photoPreviewUrl)
  const [notes, setNotes] = useState(initial.notes)
  const [catalogTaxon, setCatalogTaxon] = useState<TaxonSearchHit | null>(initial.catalogTaxon)
  const [catalogQuery, setCatalogQuery] = useState(initial.catalogTaxon?.display_name ?? '')
  const [catalogResults, setCatalogResults] = useState<TaxonSearchHit[]>([])
  const [catalogDd, setCatalogDd] = useState(false)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogEmpty, setCatalogEmpty] = useState(false)
  const [careForm, setCareForm] = useState<CareFormState>(DEFAULT_CARE_FORM)
  const [showCareErrors, setShowCareErrors] = useState(false)
  const [unitPrice, setUnitPrice] = useState(initial.unitPrice)

  const setCare = (patch: Partial<CareFormState>) => setCareForm((prev) => ({ ...prev, ...patch }))

  const localFilePreviewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile],
  )

  useEffect(() => {
    return () => {
      if (localFilePreviewUrl) URL.revokeObjectURL(localFilePreviewUrl)
    }
  }, [localFilePreviewUrl])

  useEffect(() => {
    if (!open) return
    setName(initial.name)
    setPhotoPreview(initial.photoPreviewUrl)
    setPhotoFile(null)
    setNotes(initial.notes)
    setCatalogTaxon(initial.catalogTaxon)
    setCatalogQuery(initial.catalogTaxon?.display_name ?? '')
    setCatalogResults([])
    setCatalogDd(false)
    setCatalogEmpty(false)
    setCatalogLoading(false)
    setCareForm(careFormFromRules(initial.careRules))
    setShowCareErrors(false)
    setUnitPrice(initial.unitPrice)
  }, [open, initial])

  const fetchCatalogResults = useCallback((rawQuery: string) => {
    const q = normalizeTaxonSearchQuery(rawQuery)
    setCatalogLoading(true)
    setCatalogEmpty(false)
    void apiFetch(`/api/taxons/search/?q=${encodeURIComponent(q)}`)
      .then((res) => res.json() as Promise<{ results: TaxonSearchHit[] }>)
      .then((data) => {
        const hits = data.results ?? []
        setCatalogResults(hits)
        setCatalogDd(hits.length > 0)
        setCatalogEmpty(hits.length === 0)
      })
      .catch(() => {
        setCatalogResults([])
        setCatalogDd(false)
        setCatalogEmpty(false)
      })
      .finally(() => setCatalogLoading(false))
  }, [])

  useEffect(() => {
    if (!open || catalogTaxon != null) return
    if (normalizeTaxonSearchQuery(catalogQuery).length < 1) return
    const tmr = window.setTimeout(() => fetchCatalogResults(catalogQuery), 300)
    return () => window.clearTimeout(tmr)
  }, [open, catalogQuery, catalogTaxon, fetchCatalogResults])

  const careInvalid = catalogTaxon == null && careFormHasErrors(careForm)

  const formReady = useMemo(() => {
    if (!name.trim()) return false
    if (unitPrice.trim() !== '' && isMoneyInputBad(unitPrice)) return false
    if (catalogTaxon == null && careFormHasErrors(careForm)) return false
    return true
  }, [name, unitPrice, catalogTaxon, careForm])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!formReady || busy) return
    if (catalogTaxon == null) setShowCareErrors(true)
    void onSubmit({
      name: name.trim(),
      photoFile,
      notes: notes.trim(),
      taxonId: catalogTaxon?.id ?? null,
      careRules: catalogTaxon == null ? buildCareRulesFromForm(careForm) : [],
      unitPrice: unitPrice.trim(),
    })
  }

  const handleDelete = () => {
    if (busy || mode !== 'edit' || onDelete == null) return
    void Promise.resolve(onDelete())
  }

  const title = mode === 'add' ? 'Добавить цветок' : 'Изменить цветок'

  return (
    <CrmModal open={open} onClose={onClose} title={title} width="xl" busy={busy} portal onSubmit={submit}>
        {error ? (
          <p className="crm-field__error" role="alert">
            {error}
          </p>
        ) : null}
        <CrmField label="Название в магазине" value={name} onChange={(ev) => setName(ev.target.value)} required />
        <CrmFileField
          label="Фото"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
          compressPhoto
          onFileSelected={setPhotoFile}
        />
        <div className="store-flowers__photo-preview">
          {localFilePreviewUrl ? (
            <img src={localFilePreviewUrl} alt="" />
          ) : (
            <StoreFlowerThumb url={photoPreview} alt="" size={120} variant="flower" />
          )}
        </div>
        <CrmSearchField
          label="Связь с каталогом (необязательно)"
          open={catalogDd}
          onOpenChange={setCatalogDd}
          busy={catalogLoading}
          value={catalogQuery}
          placeholder="Вид из каталога — клик для списка, от 1 буквы поиск"
          onChange={(e) => {
            setCatalogQuery(e.target.value)
            setCatalogTaxon(null)
          }}
          onFocus={() => {
            if (catalogTaxon != null && catalogQuery === catalogTaxon.display_name) return
            fetchCatalogResults(catalogQuery)
          }}
        >
          {catalogTaxon ? (
            <CrmButton
              variant="storeFlowersClearCatalog"
              onClick={() => {
                setCatalogTaxon(null)
                setCatalogQuery('')
              }}
            >
              Отвязать
            </CrmButton>
          ) : null}
          {catalogDd && catalogResults.length > 0 ? (
            <ul className="crm-taxon-dd" role="listbox">
              {catalogResults.map((t) => (
                <li key={t.id} role="presentation">
                  <CrmButton
                    variant="taxonDd"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => {
                      setCatalogTaxon(t)
                      setCatalogQuery(t.display_name)
                      setCatalogDd(false)
                    }}
                  >
                    <span className="crm-taxon-dd__title">{t.display_name}</span>
                    <span className="crm-taxon-dd__meta">
                      {t.name} · {t.rank_label}
                    </span>
                  </CrmButton>
                </li>
              ))}
            </ul>
          ) : null}
        </CrmSearchField>
        {catalogEmpty && catalogTaxon == null && !catalogLoading ? (
          <span className="crm-field__hint">Ничего не найдено</span>
        ) : null}
        {catalogTaxon == null ? (
          <fieldset className="store-flowers__care-fieldset">
            <legend className="crm-field__lab">Базовый уход (без каталога)</legend>
            <div className="store-flowers__care-grid">
              <label>
                <span className="store-flowers__care-lab">Смена воды, дн.</span>
                <CrmInlineQtyField
                  wrapperClass="store-flowers__care-inline"
                  min={1}
                  value={careForm.waterDays}
                  invalid={showCareErrors && !isRequiredQtyReady(careForm.waterDays, 1)}
                  onChange={(e) => setCare({ waterDays: e.target.value })}
                />
              </label>
              <label>
                <span className="store-flowers__care-lab">Подрезка, дн.</span>
                <CrmInlineQtyField
                  wrapperClass="store-flowers__care-inline"
                  min={1}
                  value={careForm.cutDays}
                  invalid={showCareErrors && !isRequiredQtyReady(careForm.cutDays, 1)}
                  onChange={(e) => setCare({ cutDays: e.target.value })}
                />
              </label>
              <label>
                <span className="store-flowers__care-lab">Подрезка, см</span>
                <CrmInlineDecimalField
                  wrapperClass="store-flowers__care-inline"
                  value={careForm.stemTrimCm}
                  onChange={(e) => setCare({ stemTrimCm: e.target.value })}
                />
              </label>
              <label>
                <span className="store-flowers__care-lab">Угол среза, °</span>
                <CrmInlineQtyField
                  wrapperClass="store-flowers__care-inline"
                  min={1}
                  placeholder=""
                  value={careForm.cutAngle}
                  invalid={
                    showCareErrors &&
                    careForm.cutAngle.trim() !== '' &&
                    !isRequiredQtyReady(careForm.cutAngle, 1)
                  }
                  onChange={(e) => setCare({ cutAngle: e.target.value })}
                />
              </label>
              <label>
                <span className="store-flowers__care-lab">Вода в вазе, °C</span>
                <CrmInlineDecimalField
                  wrapperClass="store-flowers__care-inline"
                  value={careForm.vaseWaterTemp}
                  onChange={(e) => setCare({ vaseWaterTemp: e.target.value })}
                />
              </label>
              <label>
                <span className="store-flowers__care-lab">Хранение, °C</span>
                <CrmInlineDecimalField
                  wrapperClass="store-flowers__care-inline"
                  value={careForm.storageTemp}
                  onChange={(e) => setCare({ storageTemp: e.target.value })}
                />
              </label>
              <label>
                <span className="store-flowers__care-lab">Помещение, °C</span>
                <CrmInlineDecimalField
                  wrapperClass="store-flowers__care-inline"
                  value={careForm.displayRoomTemp}
                  onChange={(e) => setCare({ displayRoomTemp: e.target.value })}
                />
              </label>
              <label>
                <span className="store-flowers__care-lab">В вазе, дн.</span>
                <CrmInlineQtyField
                  wrapperClass="store-flowers__care-inline"
                  min={1}
                  value={careForm.vaseLifeDays}
                  invalid={
                    showCareErrors &&
                    careForm.vaseLifeDays.trim() !== '' &&
                    !isRequiredQtyReady(careForm.vaseLifeDays, 1)
                  }
                  onChange={(e) => setCare({ vaseLifeDays: e.target.value })}
                />
              </label>
            </div>
            {showCareErrors && careInvalid ? (
              <p className="crm-field__error" role="alert">
                Проверьте поля ухода: нужны целые числа в обязательных ячейках.
              </p>
            ) : null}
            <label className="crm-field">
              <span className="crm-field__lab">Заметки по уходу</span>
              <textarea
                className="crm-field__input store-flowers__textarea"
                rows={2}
                value={careForm.careNotes}
                onChange={(e) => setCare({ careNotes: e.target.value })}
              />
            </label>
            <label className="crm-field">
              <span className="crm-field__lab">При поступлении на склад</span>
              <textarea
                className="crm-field__input store-flowers__textarea"
                rows={2}
                value={careForm.warehouseNotes}
                onChange={(e) => setCare({ warehouseNotes: e.target.value })}
              />
            </label>
          </fieldset>
        ) : (
          <p className="crm-field__hint">Уход берётся из каталога для «{catalogTaxon.display_name}».</p>
        )}
        <label className="crm-field">
          <span className="crm-field__lab">Заметки</span>
          <textarea
            className="crm-field__input store-flowers__textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <CrmMoneyField
          label="Цена продажи, ₽/шт"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          hint="Пусто — цена не задана (можно указать позже в «Ценах»)."
        />
        <CrmModal.Actions>
          {mode === 'edit' && onDelete != null ? (
            <CrmButton variant="danger" disabled={busy} onClick={handleDelete}>
              Удалить цветок
            </CrmButton>
          ) : null}
          <CrmButton variant="primary" type="submit" disabled={!formReady || busy}>
            {busy ? '…' : mode === 'add' ? 'Добавить' : 'Сохранить'}
          </CrmButton>
        </CrmModal.Actions>
    </CrmModal>
  )
}
