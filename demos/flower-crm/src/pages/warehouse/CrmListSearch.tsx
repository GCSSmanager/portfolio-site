import { useEffect, useMemo, useState } from 'react'
import { CrmButton } from '../../components/ui/CrmButton'
import { CrmSearchField } from '../../components/form/CrmSearchField'
import { textMatchesSearchQuery } from '../../utils/listSearchQuery'

export type CrmListSearchOption = {
  key: string
  title: string
  meta?: string
  /** Доп. строка для поиска (не показывается в списке). */
  searchText?: string
}

/** Локальный поиск по списку (поставщик, партия и т.п.). */
export function CrmListSearch({
  options,
  selectedKey,
  onSelect,
  placeholder,
  ariaLabel,
  invalid,
  disabled,
  emptyHint = 'Ничего не найдено',
  maxVisible,
  /** При фокусе показать весь список (даже при пустом запросе). */
  openListOnFocus = false,
  /** При пустом запросе — эти ключи всегда сверху; при вводе текста фильтруются как обычно. */
  pinWhenEmptyKeys = [],
}: {
  options: CrmListSearchOption[]
  selectedKey: string
  onSelect: (key: string) => void
  placeholder: string
  ariaLabel: string
  invalid?: boolean
  disabled?: boolean
  emptyHint?: string
  /** По умолчанию — весь отфильтрованный список; число — обрезка сверху. */
  maxVisible?: number
  openListOnFocus?: boolean
  pinWhenEmptyKeys?: string[]
}) {
  const selected = useMemo(
    () => (selectedKey ? options.find((o) => o.key === selectedKey) ?? null : null),
    [options, selectedKey],
  )
  const [query, setQuery] = useState(selected?.title ?? '')
  const [ddOpen, setDdOpen] = useState(false)

  useEffect(() => {
    setQuery(selected?.title ?? '')
  }, [selected?.title, selectedKey])

  const filtered = useMemo(() => {
    const matched = options.filter((o) =>
      textMatchesSearchQuery(query, o.title, o.meta ?? '', o.searchText ?? ''),
    )
    if (!query.trim() && pinWhenEmptyKeys.length > 0) {
      const pinned = pinWhenEmptyKeys
        .map((key) => matched.find((o) => o.key === key))
        .filter((o): o is CrmListSearchOption => o != null)
      const pinnedSet = new Set(pinWhenEmptyKeys)
      return [...pinned, ...matched.filter((o) => !pinnedSet.has(o.key))]
    }
    return matched
  }, [options, query, pinWhenEmptyKeys])

  const visible = useMemo(
    () => (maxVisible != null ? filtered.slice(0, maxVisible) : filtered),
    [filtered, maxVisible],
  )

  const pick = (key: string) => {
    const opt = options.find((o) => o.key === key)
    if (!opt) return
    onSelect(key)
    setQuery(opt.title)
    setDdOpen(false)
  }

  return (
    <CrmSearchField
      open={ddOpen}
      onOpenChange={setDdOpen}
      invalid={invalid}
      disabled={disabled}
      value={query}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      onFocus={() => {
        if (openListOnFocus) setDdOpen(true)
      }}
      onChange={(e) => {
        const v = e.target.value
        setQuery(v)
        setDdOpen(true)
        if (selected && v.trim() !== selected.title.trim()) {
          onSelect('')
        }
      }}
    >
      {!disabled && visible.length > 0 ? (
        <ul className="crm-taxon-dd" role="listbox">
          {visible.map((o) => (
            <li key={o.key} role="presentation">
              <CrmButton
                variant="taxonDd"
                role="option"
                aria-selected={o.key === selectedKey}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => pick(o.key)}
              >
                <span className="crm-taxon-dd__title">{o.title}</span>
                {o.meta ? <span className="crm-taxon-dd__meta">{o.meta}</span> : null}
              </CrmButton>
            </li>
          ))}
        </ul>
      ) : null}
      {!disabled && query.trim() && filtered.length === 0 ? (
        <p className="crm-field__hint crm-list-search__empty">{emptyHint}</p>
      ) : null}
    </CrmSearchField>
  )
}
