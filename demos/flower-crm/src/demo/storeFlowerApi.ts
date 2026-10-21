import { resolveDemoPhotoUrl } from './demoArtCatalog'
import type { DemoCareRule, DemoDb, DemoStoreFlower, DemoUser } from './types'

const RANK_LABEL_RU: Record<string, string> = {
  family: 'Семейство',
  genus: 'Род',
  species: 'Вид',
  cultivar: 'Сорт',
}

const CARE_LABELS: Record<string, string> = {
  water_change_interval_days: 'Интервал смены воды',
  cut_interval_days: 'Интервал подрезки',
  stem_trim_per_water_change_cm: 'Подрезка за смену воды',
  vase_water_temp_celsius: 'Температура воды в вазе',
  storage_temp_celsius: 'Температура хранения',
  display_room_temp_celsius: 'Температура в зале',
  vase_life_days: 'Срок жизни в вазе',
  cut_angle_degrees: 'Угол среза',
  care_notes_ru: 'Заметки по уходу',
  warehouse_arrival_notes_ru: 'Приёмка на склад',
}

function taxonMeta(db: DemoDb, taxonId: number | null) {
  if (taxonId == null) return null
  const t = db.taxons.find((x) => x.id === taxonId)
  if (!t) return null
  const display = (t.name_ru || t.name).trim() || t.name
  return {
    id: t.id,
    display_name: display,
    latin_name: t.name,
    rank: t.rank,
    rank_label: RANK_LABEL_RU[t.rank] ?? t.rank,
  }
}

function displayParts(db: DemoDb, sf: DemoStoreFlower) {
  const override = sf.name_override.trim()
  if (override) {
    return { display_name: override, latin_name: null as string | null, name: override }
  }
  const meta = taxonMeta(db, sf.taxon_id)
  if (meta) {
    return { display_name: meta.display_name, latin_name: meta.latin_name, name: meta.display_name }
  }
  return { display_name: 'Цветок', latin_name: null, name: 'Цветок' }
}

export function serializeStoreFlowerRow(
  db: DemoDb,
  shopUid: number,
  sf: DemoStoreFlower,
) {
  const parts = displayParts(db, sf)
  const catalog = taxonMeta(db, sf.taxon_id)
  const price = db.prices.find((p) => p.user_id === shopUid && p.store_flower_id === sf.id)
  return {
    id: sf.id,
    name: parts.name,
    display_name: parts.display_name,
    photo_url: resolveDemoPhotoUrl('flower', sf.id, sf.photo_path),
    notes: sf.notes.trim() ? sf.notes.trim() : null,
    taxon_id: sf.taxon_id,
    catalog_linked: sf.taxon_id != null,
    latin_name: parts.latin_name,
    catalog_taxon: catalog
      ? {
          id: catalog.id,
          display_name: catalog.display_name,
          latin_name: catalog.latin_name,
          rank_label: catalog.rank_label,
        }
      : null,
    unit_price: price?.unit_price ?? null,
  }
}

function defaultCatalogCareRules(): Array<{
  key: string
  label: string
  kind: string
  integer_value: number | null
  decimal_value: string | null
  text_value: string | null
  structured_value: unknown
  source: string
}> {
  return [
    {
      key: 'water_change_interval_days',
      label: CARE_LABELS.water_change_interval_days!,
      kind: 'integer',
      integer_value: 2,
      decimal_value: null,
      text_value: null,
      structured_value: null,
      source: 'catalog',
    },
    {
      key: 'cut_interval_days',
      label: CARE_LABELS.cut_interval_days!,
      kind: 'integer',
      integer_value: 2,
      decimal_value: null,
      text_value: null,
      structured_value: null,
      source: 'catalog',
    },
    {
      key: 'vase_life_days',
      label: CARE_LABELS.vase_life_days!,
      kind: 'structured',
      integer_value: null,
      decimal_value: null,
      text_value: null,
      structured_value: [5, 8],
      source: 'catalog',
    },
    {
      key: 'storage_temp_celsius',
      label: CARE_LABELS.storage_temp_celsius!,
      kind: 'structured',
      integer_value: null,
      decimal_value: null,
      text_value: null,
      structured_value: [2, 4],
      source: 'catalog',
    },
  ]
}

export function serializeStoreFlowerCareDetail(
  db: DemoDb,
  shopUid: number,
  flowerId: number,
  sessionUser: DemoUser,
) {
  const sf = db.storeFlowers.find((s) => s.id === flowerId && s.user_id === shopUid)
  if (!sf) return null
  const parts = displayParts(db, sf)
  const catalog = taxonMeta(db, sf.taxon_id)
  const care_rules =
    sf.taxon_id != null ? defaultCatalogCareRules() : serializeCareRulesForApi(sf.care_rules)
  return {
    flower: {
      id: sf.id,
      name: parts.name,
      display_name: parts.display_name,
      photo_url: resolveDemoPhotoUrl('flower', sf.id, sf.photo_path),
      notes: sf.notes.trim() ? sf.notes.trim() : null,
      taxon_id: sf.taxon_id,
      catalog_linked: sf.taxon_id != null,
      latin_name: parts.latin_name,
    },
    catalog_taxon: catalog
      ? {
          display_name: catalog.display_name,
          latin_name: catalog.latin_name,
          rank_label: catalog.rank_label,
        }
      : null,
    care_rules,
    care_editable: sessionUser.role === 'owner' && sf.taxon_id == null,
  }
}

function parseCareRulesFromBody(body: Record<string, unknown>): DemoCareRule[] | { error: string } {
  const raw = body.care_rules
  if (raw == null) return []
  if (!Array.isArray(raw)) return { error: 'care_rules: ожидается массив.' }
  const out: DemoCareRule[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const key = String(o.key ?? '').trim()
    if (!key) continue
    out.push({
      key,
      kind: String(o.kind ?? 'text'),
      integer_value:
        o.integer_value != null && o.integer_value !== ''
          ? Number.parseInt(String(o.integer_value), 10)
          : null,
      decimal_value: o.decimal_value != null ? String(o.decimal_value) : null,
      text_value: String(o.text_value ?? ''),
      structured_value: o.structured_value ?? null,
    })
  }
  return out
}

function serializeCareRulesForApi(rules: DemoCareRule[]) {
  return rules.map((r) => ({
    key: r.key,
    label: CARE_LABELS[r.key] ?? r.key,
    kind: r.kind,
    integer_value: r.integer_value,
    decimal_value: r.decimal_value,
    text_value: r.text_value,
    structured_value: r.structured_value,
    source: 'shop',
  }))
}

export function patchStoreFlower(
  db: DemoDb,
  shopUid: number,
  flowerId: number,
  body: Record<string, unknown>,
): { error?: string; flower?: ReturnType<typeof serializeStoreFlowerRow> } {
  const sf = db.storeFlowers.find((s) => s.id === flowerId && s.user_id === shopUid)
  if (!sf) return { error: 'Цветок не найден.' }

  if ('taxon_id' in body) {
    const raw = body.taxon_id
    if (raw === null) {
      sf.taxon_id = null
    } else {
      const tid = Number.parseInt(String(raw), 10)
      if (!Number.isFinite(tid) || !db.taxons.some((t) => t.id === tid)) {
        return { error: 'Сорт не найден в каталоге.' }
      }
      sf.taxon_id = tid
      for (const b of db.batches.filter((b) => b.store_flower_id === sf.id)) {
        b.taxon_id = tid
      }
      const price = db.prices.find((p) => p.user_id === shopUid && p.store_flower_id === sf.id)
      if (price) price.taxon_id = tid
    }
  }
  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name) return { error: 'Название не может быть пустым.' }
    sf.name_override = name.slice(0, 200)
  }
  if (typeof body.notes === 'string') sf.notes = body.notes.trim().slice(0, 4000)
  if (sf.taxon_id == null && 'care_rules' in body) {
    const parsed = parseCareRulesFromBody(body)
    if (!Array.isArray(parsed)) return { error: parsed.error }
    sf.care_rules = parsed
  }
  if ('taxon_id' in body && sf.taxon_id != null) sf.care_rules = []
  return { flower: serializeStoreFlowerRow(db, shopUid, sf) }
}

export function searchStoreFlowers(
  db: DemoDb,
  shopUid: number,
  rawQuery: string,
  supplierId: number | null,
): { error?: string; status?: number; results?: unknown[] } {
  if (supplierId != null) {
    const supplier = db.suppliers.find((s) => s.id === supplierId && s.user_id === shopUid)
    if (!supplier) return { error: 'Поставщик не найден.', status: 404 }
  }
  const q = rawQuery.trim().toLowerCase()
  const words = q.length >= 2 ? q.split(/\s+/).filter(Boolean) : []
  let flowers = db.storeFlowers.filter((sf) => sf.user_id === shopUid)
  if (supplierId != null) {
    const allowed = new Set(
      db.supplierOffers.filter((o) => o.supplier_id === supplierId).map((o) => o.store_flower_id),
    )
    flowers = flowers.filter((sf) => allowed.has(sf.id))
  }
  if (words.length) {
    flowers = flowers.filter((sf) => {
      const t = db.taxons.find((x) => x.id === sf.taxon_id)
      const blob = `${sf.name_override} ${t?.name ?? ''} ${t?.name_ru ?? ''}`.toLowerCase()
      return words.every((w) => blob.includes(w))
    })
  }
  flowers = flowers.slice(0, 25)
  const offerPrice = (sfId: number) =>
    supplierId != null
      ? db.supplierOffers.find((o) => o.supplier_id === supplierId && o.store_flower_id === sfId)
          ?.unit_purchase_price ?? null
      : null
  const results = flowers.map((sf) => {
    const parts = displayParts(db, sf)
    const catalog = taxonMeta(db, sf.taxon_id)
    const price = offerPrice(sf.id)
    return {
      id: sf.id,
      store_flower_id: sf.id,
      name: parts.name,
      display_name: parts.display_name,
      latin_name: parts.latin_name,
      rank: catalog?.rank ?? '',
      rank_label: catalog?.rank_label ?? '',
      photo_url: resolveDemoPhotoUrl('flower', sf.id, sf.photo_path),
      catalog_linked: sf.taxon_id != null,
      taxon_id: sf.taxon_id,
      unit_purchase_price: price != null ? parseFloat(price) : null,
    }
  })
  return { results }
}

export function createStoreFlower(
  db: DemoDb,
  shopUid: number,
  body: Record<string, unknown>,
  nextId: () => number,
): { error?: string; status?: number; flower?: ReturnType<typeof serializeStoreFlowerRow> } {
  const name = String(body.name ?? '').trim()
  if (!name) return { error: 'Укажите название.' }
  let taxonId: number | null = null
  if (body.taxon_id != null && body.taxon_id !== '') {
    const tid = Number.parseInt(String(body.taxon_id), 10)
    if (!Number.isFinite(tid) || !db.taxons.some((t) => t.id === tid)) {
      return { error: 'Вид в каталоге не найден.', status: 404 }
    }
    if (db.storeFlowers.some((s) => s.user_id === shopUid && s.taxon_id === tid)) {
      return { error: 'Этот вид каталога уже привязан к другому цветку магазина.' }
    }
    taxonId = tid
  }
  const id = nextId()
  let care_rules: DemoCareRule[] = []
  if (taxonId == null && body.care_rules != null) {
    const parsed = parseCareRulesFromBody(body)
    if (!Array.isArray(parsed)) return { error: parsed.error }
    care_rules = parsed
  }
  const notes =
    typeof body.notes === 'string' ? body.notes.trim().slice(0, 4000) : ''
  const sf: DemoStoreFlower = {
    id,
    user_id: shopUid,
    taxon_id: taxonId,
    name_override: name.slice(0, 200),
    photo_path: null,
    notes,
    care_rules,
  }
  db.storeFlowers.push(sf)
  db.basicCare.push({
    id: nextId(),
    user_id: shopUid,
    store_flower_id: id,
    intake_pending: false,
    last_trim_at: null,
    last_water_change_at: null,
  })
  return { status: 201, flower: serializeStoreFlowerRow(db, shopUid, sf) }
}
