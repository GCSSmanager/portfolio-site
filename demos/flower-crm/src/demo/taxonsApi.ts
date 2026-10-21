import type { DemoDb, DemoTaxon } from './types'

const RANK_LABEL_RU: Record<string, string> = {
  family: 'Семейство',
  genus: 'Род',
  species: 'Вид',
  cultivar: 'Сорт',
}

const RANK_ORDER: Record<string, number> = {
  family: 0,
  genus: 1,
  species: 2,
  cultivar: 3,
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

function serializeTaxonNode(t: DemoTaxon) {
  const name_ru = (t.name_ru || '').trim()
  return {
    id: t.id,
    name: t.name,
    name_ru,
    display_name: name_ru || t.name,
    rank: t.rank,
    rank_label: RANK_LABEL_RU[t.rank] ?? t.rank,
  }
}

function demoCatalogCareRules() {
  return [
    {
      key: 'water_change_interval_days',
      label: CARE_LABELS.water_change_interval_days!,
      kind: 'integer',
      integer_value: 2,
      decimal_value: null,
      text_value: null,
      structured_value: null,
    },
    {
      key: 'cut_interval_days',
      label: CARE_LABELS.cut_interval_days!,
      kind: 'integer',
      integer_value: 2,
      decimal_value: null,
      text_value: null,
      structured_value: null,
    },
    {
      key: 'vase_life_days',
      label: CARE_LABELS.vase_life_days!,
      kind: 'structured',
      integer_value: null,
      decimal_value: null,
      text_value: null,
      structured_value: [5, 8],
    },
    {
      key: 'storage_temp_celsius',
      label: CARE_LABELS.storage_temp_celsius!,
      kind: 'structured',
      integer_value: null,
      decimal_value: null,
      text_value: null,
      structured_value: [2, 4],
    },
  ]
}

export function taxonCareDetailPayload(db: DemoDb, taxonId: number) {
  const taxon = db.taxons.find((x) => x.id === taxonId)
  if (!taxon) return null

  const lineage: ReturnType<typeof serializeTaxonNode>[] = []
  let cur: DemoTaxon | undefined = taxon
  while (cur) {
    lineage.push(serializeTaxonNode(cur))
    cur =
      cur.parent_id != null
        ? db.taxons.find((x) => x.id === cur!.parent_id)
        : undefined
  }
  lineage.reverse()

  return {
    taxon: serializeTaxonNode(taxon),
    lineage,
    care_rules: demoCatalogCareRules(),
  }
}

function taxonLineageBlob(
  taxonId: number,
  byId: Map<number, DemoTaxon>,
  memo: Map<number, string>,
): string {
  const cached = memo.get(taxonId)
  if (cached != null) return cached
  const t = byId.get(taxonId)
  if (!t) {
    memo.set(taxonId, '')
    return ''
  }
  const self = `${t.name} ${t.name_ru}`.toLowerCase()
  const blob =
    t.parent_id != null
      ? `${taxonLineageBlob(t.parent_id, byId, memo)} ${self}`.trim()
      : self
  memo.set(taxonId, blob)
  return blob
}

export function taxonSearchResults(db: DemoDb, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase()
  const byId = new Map(db.taxons.map((t) => [t.id, t]))
  const memo = new Map<number, string>()

  let matchingIds: number[]
  if (!q) {
    matchingIds = db.taxons.map((t) => t.id)
  } else {
    const words = q.split(/\s+/).filter(Boolean)
    matchingIds = []
    for (const t of db.taxons) {
      const blob = taxonLineageBlob(t.id, byId, memo)
      if (words.every((w) => blob.includes(w))) matchingIds.push(t.id)
    }
  }

  const hits = matchingIds
    .map((id) => byId.get(id)!)
    .filter(Boolean)
    .sort((a, b) => {
      const ra = RANK_ORDER[a.rank] ?? 99
      const rb = RANK_ORDER[b.rank] ?? 99
      if (ra !== rb) return ra - rb
      const la = ((a.name_ru || a.name).trim() || a.name).toLowerCase()
      const lb = ((b.name_ru || b.name).trim() || b.name).toLowerCase()
      return la.localeCompare(lb, 'ru')
    })
    .slice(0, 25)
    .map((t) => serializeTaxonNode(t))

  return { results: hits }
}
