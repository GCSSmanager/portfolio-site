type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  busy?: boolean
  busyLabel?: string
}

/** Поле поиска/фильтра каталога (общая разметка и стили). */
export function CatalogFilter({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  busy,
  busyLabel = 'Поиск…',
}: Props) {
  return (
    <div className="flowers-catalog-filter">
      <label className="flowers-catalog-filter__lab" htmlFor={id}>
        {label}
      </label>
      <div className="flowers-catalog-filter__field">
        <input
          id={id}
          className="flowers-catalog-filter__input"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
        {busy ? (
          <span className="flowers-catalog-filter__busy" aria-live="polite">
            {busyLabel}
          </span>
        ) : null}
      </div>
      {hint ? <p className="flowers-catalog-filter__hint">{hint}</p> : null}
    </div>
  )
}
