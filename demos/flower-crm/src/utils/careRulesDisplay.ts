/**
 * Правила API → факты по разрешённым ключам (см. backend catalog/allowed_care_keys.py).
 * Диапазоны: kind=structured, значение [min, max].
 */

export type CareRuleRow = {
  key: string
  label: string
  kind: string
  integer_value: number | null
  decimal_value: number | null
  text_value: string | null
  structured_value: unknown
}

export type CareDisplayItem = {
  id: string
  text: string
}

export type CareDisplaySectionId =
  | 'water_trim'
  | 'temperature'
  | 'vase_life'
  | 'warehouse'
  | 'extra'

export type CareDisplaySection = {
  id: CareDisplaySectionId
  title: string
  items: CareDisplayItem[]
}

const ALLOWED_KEYS = new Set([
  'water_change_interval_days',
  'cut_interval_days',
  'stem_trim_per_water_change_cm',
  'vase_water_temp_celsius',
  'storage_temp_celsius',
  'display_room_temp_celsius',
  'vase_life_days',
  'cut_angle_degrees',
  'care_notes_ru',
  'warehouse_arrival_notes_ru',
])

const SECTION_ORDER: CareDisplaySectionId[] = [
  'water_trim',
  'temperature',
  'vase_life',
  'warehouse',
  'extra',
]

const SECTION_TITLE: Record<CareDisplaySectionId, string> = {
  water_trim: 'Вода и подрезка',
  temperature: 'Температура хранения и помещения',
  vase_life: 'Срок в вазе при хороших условиях',
  warehouse: 'При поступлении на склад',
  extra: 'Дополнительно',
}

function numRu(n: number, decimals = false): string {
  if (!decimals) return String(Math.round(n))
  return n
    .toFixed(2)
    .replace(/\.?0+$/, '')
    .replace('.', ',')
}

function getNum(row: CareRuleRow): number | null {
  if (row.kind === 'integer' && row.integer_value != null) return row.integer_value
  if (row.kind === 'decimal' && row.decimal_value != null) return row.decimal_value
  return null
}

function getText(row: CareRuleRow): string {
  return (row.text_value ?? '').trim()
}

/** Диапазон [min, max] из structured (массив из двух чисел). */
function parsePair(val: unknown): [number, number] | null {
  if (!Array.isArray(val) || val.length !== 2) return null
  const a = Number(val[0])
  const b = Number(val[1])
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return [a, b]
}

export function buildCareDisplaySections(rules: CareRuleRow[]): CareDisplaySection[] {
  const filtered = rules.filter((r) => ALLOWED_KEYS.has(r.key))
  const byKey = new Map(filtered.map((r) => [r.key, r]))

  const buckets: Record<CareDisplaySectionId, CareDisplayItem[]> = {
    water_trim: [],
    temperature: [],
    vase_life: [],
    warehouse: [],
    extra: [],
  }

  const push = (section: CareDisplaySectionId, item: CareDisplayItem) => {
    buckets[section].push(item)
  }

  const water = byKey.get('water_change_interval_days')
  if (water?.kind === 'integer') {
    const days = getNum(water)
    if (days != null) {
      push('water_trim', {
        id: 'water_change_interval_days',
        text: `Смена воды — раз в ${numRu(days)} суток.`,
      })
    }
  }

  const cut = byKey.get('cut_interval_days')
  if (cut?.kind === 'integer') {
    const days = getNum(cut)
    if (days != null) {
      push('water_trim', {
        id: 'cut_interval_days',
        text: `Подрезка стебля при смене воды — раз в ${numRu(days)} суток.`,
      })
    }
  }

  const stem = byKey.get('stem_trim_per_water_change_cm')
  if (stem?.kind === 'structured') {
    const p = parsePair(stem.structured_value)
    if (p) {
      const [a, b] = p
      const text =
        a === b
          ? `При смене воды подрезать стебель примерно на ${numRu(a, true)} см.`
          : `При смене воды подрезать стебель на ${numRu(a, true)}–${numRu(b, true)} см.`
      push('water_trim', { id: 'stem_trim_per_water_change_cm', text })
    }
  }

  const vaseWater = byKey.get('vase_water_temp_celsius')
  if (vaseWater?.kind === 'structured') {
    const p = parsePair(vaseWater.structured_value)
    if (p) {
      const [a, b] = p
      const text =
        a === b
          ? `Температура воды при смене — около ${numRu(a, true)} °C.`
          : `Температура воды при смене — ${numRu(a, true)}–${numRu(b, true)} °C.`
      push('water_trim', { id: 'vase_water_temp_celsius', text })
    }
  }

  const storage = byKey.get('storage_temp_celsius')
  if (storage?.kind === 'structured') {
    const p = parsePair(storage.structured_value)
    if (p) {
      const [a, b] = p
      const text =
        a === b
          ? `Температура хранения (склад): ${numRu(a, true)} °C.`
          : `Температура хранения (склад): ${numRu(a, true)}–${numRu(b, true)} °C.`
      push('temperature', { id: 'storage_temp_celsius', text })
    }
  }

  const room = byKey.get('display_room_temp_celsius')
  if (room?.kind === 'structured') {
    const p = parsePair(room.structured_value)
    if (p) {
      const [a, b] = p
      const text =
        a === b
          ? `Температура помещения для показа — примерно ${numRu(a)} °C.`
          : `Температура помещения для показа — примерно ${numRu(a)}–${numRu(b)} °C.`
      push('temperature', { id: 'display_room_temp_celsius', text })
    }
  }

  const vase = byKey.get('vase_life_days')
  if (vase?.kind === 'structured') {
    const p = parsePair(vase.structured_value)
    if (p) {
      const [a, b] = p
      const text =
        a === b
          ? `Ориентировочно ${numRu(a)} дней в вазе при соблюдении режима.`
          : `Ориентировочно ${numRu(a)}–${numRu(b)} дней в вазе при соблюдении режима.`
      push('vase_life', { id: 'vase_life_days', text })
    }
  }

  const angle = byKey.get('cut_angle_degrees')
  if (angle && (angle.kind === 'integer' || angle.kind === 'decimal')) {
    const n = getNum(angle)
    if (n != null) {
      push('water_trim', { id: 'cut_angle_degrees', text: `Угол среза стебля — ${numRu(n)}°.` })
    }
  }

  const careNotes = byKey.get('care_notes_ru')
  if (careNotes?.kind === 'text') {
    const t = getText(careNotes)
    if (t) push('extra', { id: 'care_notes_ru', text: t })
  }

  const wh = byKey.get('warehouse_arrival_notes_ru')
  if (wh?.kind === 'text') {
    const t = getText(wh)
    if (t) push('warehouse', { id: 'warehouse_arrival_notes_ru', text: t })
  }

  return SECTION_ORDER.map((id) => ({
    id,
    title: SECTION_TITLE[id],
    items: buckets[id],
  })).filter((s) => s.items.length > 0)
}

export function buildCareDisplayItems(rules: CareRuleRow[]): CareDisplayItem[] {
  return buildCareDisplaySections(rules).flatMap((s) => s.items)
}
