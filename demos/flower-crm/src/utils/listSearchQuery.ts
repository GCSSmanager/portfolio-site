import { normalizeTaxonSearchQuery, taxonSearchQueryWords } from './taxonSearchQuery'

/** Все токены запроса встречаются в объединённой строке полей. */
export function textMatchesSearchQuery(query: string, ...parts: string[]): boolean {
  const words = taxonSearchQueryWords(normalizeTaxonSearchQuery(query))
  if (!words.length) return true
  const hay = parts.join(' ').toLowerCase()
  return words.every((w) => hay.includes(w))
}
