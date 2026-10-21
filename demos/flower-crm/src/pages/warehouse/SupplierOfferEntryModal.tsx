import { type FormEvent, useEffect, useState } from 'react'
import { apiFetch } from '../../api/apiFetch'
import { CrmButton } from '../../components/ui/CrmButton'
import { CrmModal } from '../../components/ui/CrmModal'
import { CrmMoneyField } from '../../components/form/CrmMoneyField'
import { CrmSearchField } from '../../components/form/CrmSearchField'
import { isRequiredMoneyReady, parseMoneyInput } from '../../utils/crmInput'
import { normalizeTaxonSearchQuery } from '../../utils/taxonSearchQuery'
import type { StoreFlowerSearchHit } from '../../utils/storeFlowerSearchQuery'
import { StoreFlowerThumb } from '../../components/ui/StoreFlowerThumb'

export type SupplierOfferEntryInitial = {
  taxon: StoreFlowerSearchHit | null
  priceStr: string
}

type Props = {
  open: boolean
  mode: 'add' | 'edit'
  supplierName: string
  initial: SupplierOfferEntryInitial
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (values: { storeFlowerId: number; price: number }) => void | Promise<void>
}

export function SupplierOfferEntryModal({
  open,
  mode,
  supplierName,
  initial,
  busy,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [flower, setFlower] = useState<StoreFlowerSearchHit | null>(initial.taxon)
  const [query, setQuery] = useState(initial.taxon?.display_name ?? '')
  const [results, setResults] = useState<StoreFlowerSearchHit[]>([])
  const [ddOpen, setDdOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [priceStr, setPriceStr] = useState(initial.priceStr)

  useEffect(() => {
    if (!open) return
    setFlower(initial.taxon)
    setQuery(initial.taxon?.display_name ?? '')
    setPriceStr(initial.priceStr)
    setResults([])
    setDdOpen(false)
  }, [open, initial])

  useEffect(() => {
    if (!open || mode !== 'add') return
    const q = normalizeTaxonSearchQuery(query)
    if (flower != null && query === flower.display_name) return
    if (q.length < 2) {
      setResults([])
      setDdOpen(false)
      return
    }
    const tmr = window.setTimeout(() => {
      setLoading(true)
      void apiFetch(`/api/me/flowers/search/?q=${encodeURIComponent(q)}`)
        .then((res) => {
          if (!res.ok) throw new Error()
          return res.json() as Promise<{ results: StoreFlowerSearchHit[] }>
        })
        .then((data) => {
          setResults(data.results)
          setDdOpen(data.results.length > 0)
        })
        .catch(() => {
          setResults([])
          setDdOpen(false)
        })
        .finally(() => setLoading(false))
    }, 300)
    return () => window.clearTimeout(tmr)
  }, [open, mode, query, flower])

  const formReady = (mode === 'edit' || flower != null) && isRequiredMoneyReady(priceStr)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!formReady || busy) return
    const fid =
      mode === 'edit'
        ? (initial.taxon?.store_flower_id ?? initial.taxon?.id)
        : (flower?.store_flower_id ?? flower?.id)
    if (fid == null) return
    const price = parseMoneyInput(priceStr.replace(/\s/g, ''))
    if (price === null || price === 'bad' || price < 0) return
    void onSubmit({ storeFlowerId: fid, price })
  }

  const title = mode === 'add' ? 'Добавить в прайс' : 'Изменить цену'

  return (
    <CrmModal open={open} onClose={onClose} title={title} width="md" busy={busy} onSubmit={submit}>
        {error ? (
          <p className="crm-field__error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="crm-field__hint crm-field__hint--tight">{supplierName}</p>
        {mode === 'edit' && flower != null ? (
          <p className="crm-field">
            <span className="crm-field__lab">Цветок</span>
            <span className="suppliers-page__offer-readonly">{flower.display_name}</span>
          </p>
        ) : (
          <CrmSearchField
            label="Цветок магазина"
            invalid={flower == null && query.trim().length > 0}
            open={ddOpen}
            onOpenChange={setDdOpen}
            value={query}
            placeholder="От 2 букв"
            onChange={(e) => {
              setQuery(e.target.value)
              setFlower(null)
            }}
          >
            {loading ? <span className="crm-taxon-search__busy">…</span> : null}
            {ddOpen && results.length > 0 ? (
              <ul className="crm-taxon-dd" role="listbox">
                {results.map((t) => (
                  <li key={t.id} role="presentation">
                    <CrmButton
                      variant="taxonDd"
                      role="option"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => {
                        setFlower(t)
                        setQuery(t.display_name)
                        setResults([])
                        setDdOpen(false)
                      }}
                    >
                      <StoreFlowerThumb url={t.photo_url} alt={t.display_name} size={36} className="crm-taxon-dd__thumb" />
                      <span className="crm-taxon-dd__text">
                        <span className="crm-taxon-dd__title">{t.display_name}</span>
                        <span className="crm-taxon-dd__meta">
                          {t.latin_name ?? t.name} · {t.rank_label}
                        </span>
                      </span>
                    </CrmButton>
                  </li>
                ))}
              </ul>
            ) : null}
          </CrmSearchField>
        )}
        <CrmMoneyField
          label="Закупка, ₽/шт"
          value={priceStr}
          onChange={(ev) => setPriceStr(ev.target.value)}
        />
        <CrmModal.Actions
          submitLabel="Сохранить"
          submitDisabled={!formReady}
          submitBusy={busy}
        />
    </CrmModal>
  )
}
