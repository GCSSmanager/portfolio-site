/** Совпадает с нормализацией поиска таксонов в backend api/views.py (taxon_search). */
const TAXON_SEARCH_QUOTES = /["'`«»„“”‚‘’‹›`]/g

export function normalizeTaxonSearchQuery(raw: string): string {
  let s = raw.replace(TAXON_SEARCH_QUOTES, '')
  s = s.replace(/[,;]/g, ' ')
  return s.trim().replace(/\s+/g, ' ')
}

/** Ответ GET /api/taxons/search/?q=… (при supplier_id — закупка из SupplierOffer). */
export type TaxonSearchHit = {
  id: number
  name: string
  name_ru: string
  display_name: string
  rank: string
  rank_label: string
  unit_purchase_price?: number | null
}

/** Токены запроса в нижнем регистре — как `_taxon_search_words` на бэкенде. */
export function taxonSearchQueryWords(normalizedQuery: string): string[] {
  return normalizedQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

export type TaxonSearchTextSegment = { text: string; hit: boolean }

function mergeIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length === 0) return []
  const sorted = [...intervals].sort((a, b) => a[0] - b[0])
  const out: [number, number][] = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const [as, ae] = sorted[i]
    const last = out[out.length - 1]
    if (as <= last[1]) {
      last[1] = Math.max(last[1], ae)
    } else {
      out.push([as, ae])
    }
  }
  return out
}

function findSubstringRanges(text: string, needleLower: string): [number, number][] {
  if (!needleLower) return []
  const t = text.toLowerCase()
  const n = needleLower
  const out: [number, number][] = []
  let pos = 0
  while (pos <= t.length - n.length) {
    const idx = t.indexOf(n, pos)
    if (idx === -1) break
    out.push([idx, idx + n.length])
    pos = idx + 1
  }
  return out
}

/** Разбивает строку для подсветки подстрок из запроса (без учёта регистра). */
export function segmentsWithHits(text: string, queryWordsLower: string[]): TaxonSearchTextSegment[] {
  const ranges: [number, number][] = []
  for (const w of queryWordsLower) {
    if (!w) continue
    ranges.push(...findSubstringRanges(text, w))
  }
  const merged = mergeIntervals(ranges)
  if (merged.length === 0) return [{ text, hit: false }]
  const segments: TaxonSearchTextSegment[] = []
  let last = 0
  for (const [a, b] of merged) {
    if (a > last) segments.push({ text: text.slice(last, a), hit: false })
    segments.push({ text: text.slice(a, b), hit: true })
    last = b
  }
  if (last < text.length) segments.push({ text: text.slice(last), hit: false })
  return segments
}
