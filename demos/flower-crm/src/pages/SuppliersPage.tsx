import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/apiFetch'
import { useCrmConfirm } from '../hooks/useCrmConfirm'
import { catalogNavState } from '../utils/catalogNav'
import { isUpstreamErrorStatus } from '../utils/networkError'
import type { StoreFlowerSearchHit } from '../utils/storeFlowerSearchQuery'
import {
  SupplierEntryModal,
  type SupplierEntryInitial,
} from './warehouse/SupplierEntryModal'
import {
  SupplierOfferEntryModal,
  type SupplierOfferEntryInitial,
} from './warehouse/SupplierOfferEntryModal'
import { CrmButton } from '../components/ui/CrmButton'
import { CrmPageStatus } from '../components/ui/CrmPageStatus'
import { CrmPageToolbar } from '../components/ui/CrmPageToolbar'
import { CrmRowActions } from '../components/ui/CrmRowActions'
import { SupplierDeliveryModal } from './warehouse/SupplierDeliveryModal'
import './flowersCatalog.css'
import './warehouse.css'
import './warehouse/stock/modal-shell-taxons.css'
import './pricesPage.css'
import './suppliersPage.css'

type SupplierOfferRow = {
  store_flower_id: number
  taxon_id?: number | null
  display_name: string
  latin_name: string | null
  rank_label: string
  unit_purchase_price: string
}

type SupplierRow = {
  id: number
  name: string
  legal_name: string | null
  legal_info: string | null
  address: string | null
  contacts: string | null
  notes: string | null
  created_at: string | null
  offers: SupplierOfferRow[]
}

const emptySupplierEntry = (): SupplierEntryInitial => ({
  name: '',
  legalName: '',
  legalInfo: '',
  address: '',
  contacts: '',
  notes: '',
})

function supplierToEntry(s: SupplierRow): SupplierEntryInitial {
  return {
    name: s.name,
    legalName: s.legal_name ?? '',
    legalInfo: s.legal_info ?? '',
    address: s.address ?? '',
    contacts: s.contacts ?? '',
    notes: s.notes ?? '',
  }
}

function offerToStoreFlowerHit(o: SupplierOfferRow): StoreFlowerSearchHit {
  return {
    id: o.store_flower_id,
    store_flower_id: o.store_flower_id,
    name: o.display_name,
    display_name: o.display_name,
    latin_name: o.latin_name,
    rank: '',
    rank_label: o.rank_label,
    taxon_id: o.taxon_id ?? null,
  }
}

const catalogFromSuppliers = catalogNavState('/suppliers')

export function SuppliersPage() {
  const { ask, dialog: confirmDialog } = useCrmConfirm()
  const [suppliers, setSuppliers] = useState<SupplierRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [deliverySupplierId, setDeliverySupplierId] = useState<number | null>(null)

  const [entryOpen, setEntryOpen] = useState(false)
  const [entryMode, setEntryMode] = useState<'add' | 'edit'>('add')
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null)
  const [entryInitial, setEntryInitial] = useState<SupplierEntryInitial>(emptySupplierEntry)
  const [entryError, setEntryError] = useState<string | null>(null)
  const [entrySaving, setEntrySaving] = useState(false)

  const [offerOpen, setOfferOpen] = useState(false)
  const [offerMode, setOfferMode] = useState<'add' | 'edit'>('add')
  const [offerSupplier, setOfferSupplier] = useState<SupplierRow | null>(null)
  const [offerInitial, setOfferInitial] = useState<SupplierOfferEntryInitial>({ taxon: null, priceStr: '' })
  const [offerError, setOfferError] = useState<string | null>(null)
  const [offerSaving, setOfferSaving] = useState(false)

  const applySuppliers = useCallback((rows: SupplierRow[]) => {
    setSuppliers(rows)
    setError(null)
  }, [])

  const load = useCallback(() => {
    setError(null)
    return apiFetch('/api/me/suppliers/')
      .then((res) => {
        if (res.status === 401) throw new Error('Сессия недействительна. Войдите снова.')
        if (!res.ok && isUpstreamErrorStatus(res.status)) return null
        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        return res.json() as Promise<{ suppliers: SupplierRow[] }>
      })
      .then((data) => {
        if (data === null) return
        applySuppliers(data.suppliers)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить поставщиков')
      })
  }, [applySuppliers])

  useEffect(() => {
    void load()
  }, [load])

  const openAddSupplier = () => {
    setEntryMode('add')
    setEditingSupplierId(null)
    setEntryInitial(emptySupplierEntry())
    setEntryError(null)
    setEntryOpen(true)
  }

  const openEditSupplier = (s: SupplierRow) => {
    setEntryMode('edit')
    setEditingSupplierId(s.id)
    setEntryInitial(supplierToEntry(s))
    setEntryError(null)
    setEntryOpen(true)
  }

  const closeEntry = () => {
    setEntryOpen(false)
    setEntrySaving(false)
  }

  const handleEntrySubmit = async (values: SupplierEntryInitial) => {
    setEntrySaving(true)
    setEntryError(null)
    const body = {
      name: values.name,
      legal_name: values.legalName || null,
      legal_info: values.legalInfo || null,
      address: values.address || null,
      contacts: values.contacts || null,
      notes: values.notes || null,
    }
    try {
      const res = await apiFetch(
        entryMode === 'add' ? '/api/me/suppliers/' : `/api/me/suppliers/${editingSupplierId}/`,
        {
          method: entryMode === 'add' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      const j = (await res.json().catch(() => ({}))) as { suppliers?: SupplierRow[]; error?: string }
      if (!res.ok) {
        setEntryError(j.error ?? `Ошибка ${res.status}`)
        return
      }
      if (j.suppliers) applySuppliers(j.suppliers)
      else await load()
      closeEntry()
    } finally {
      setEntrySaving(false)
    }
  }

  const removeSupplier = (s: SupplierRow) => {
    ask({
      title: `Удалить поставщика «${s.name}»?`,
      message:
        'Прайс и история поставок будут удалены. Запланированные поставки нужно сначала принять или отменить.',
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        const res = await apiFetch(`/api/me/suppliers/${s.id}/`, { method: 'DELETE' })
        const j = (await res.json().catch(() => ({}))) as { suppliers?: SupplierRow[]; error?: string }
        if (!res.ok) {
          setError(j.error ?? `Ошибка ${res.status}`)
          return
        }
        if (j.suppliers) applySuppliers(j.suppliers)
        else await load()
      },
    })
  }

  const openAddOffer = (s: SupplierRow) => {
    setOfferMode('add')
    setOfferSupplier(s)
    setOfferInitial({ taxon: null, priceStr: '' })
    setOfferError(null)
    setOfferOpen(true)
  }

  const openEditOffer = (s: SupplierRow, o: SupplierOfferRow) => {
    setOfferMode('edit')
    setOfferSupplier(s)
    setOfferInitial({
      taxon: offerToStoreFlowerHit(o),
      priceStr: o.unit_purchase_price.replace('.', ','),
    })
    setOfferError(null)
    setOfferOpen(true)
  }

  const closeOffer = () => {
    setOfferOpen(false)
    setOfferSaving(false)
  }

  const handleOfferSubmit = async ({ storeFlowerId, price }: { storeFlowerId: number; price: number }) => {
    if (offerSupplier == null) return
    setOfferSaving(true)
    setOfferError(null)
    try {
      const url =
        offerMode === 'add'
          ? `/api/me/suppliers/${offerSupplier.id}/offers/`
          : `/api/me/suppliers/${offerSupplier.id}/offers/${storeFlowerId}/`
      const res = await apiFetch(url, {
        method: offerMode === 'add' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          offerMode === 'add'
            ? { store_flower_id: storeFlowerId, unit_purchase_price: price }
            : { unit_purchase_price: price },
        ),
      })
      const j = (await res.json().catch(() => ({}))) as { suppliers?: SupplierRow[]; error?: string }
      if (!res.ok) {
        setOfferError(j.error ?? `Ошибка ${res.status}`)
        return
      }
      if (j.suppliers) applySuppliers(j.suppliers)
      else await load()
      closeOffer()
    } finally {
      setOfferSaving(false)
    }
  }

  const removeOffer = (s: SupplierRow, o: SupplierOfferRow) => {
    ask({
      title: `Убрать «${o.display_name}» из прайса?`,
      message: `Позиция будет удалена из прайса поставщика «${s.name}».`,
      confirmLabel: 'Убрать',
      onConfirm: async () => {
        const res = await apiFetch(`/api/me/suppliers/${s.id}/offers/${o.store_flower_id}/`, {
          method: 'DELETE',
        })
        const j = (await res.json().catch(() => ({}))) as { suppliers?: SupplierRow[]; error?: string }
        if (!res.ok) {
          setError(j.error ?? `Ошибка ${res.status}`)
          return
        }
        if (j.suppliers) applySuppliers(j.suppliers)
        else await load()
      },
    })
  }

  return (
    <div className="flowers-page flowers-page--suppliers">
      <CrmPageToolbar
        layout="toolbar"
        title="Поставщики"
        leadCompact
        actions={
          <>
            <CrmButton variant="accent" onClick={openAddSupplier}>
              + Поставщик
            </CrmButton>
            <CrmButton
              variant="suppliersPlan"
              onClick={() => {
                setDeliverySupplierId(null)
                setDeliveryOpen(true)
              }}
            >
              Сделать поставку
            </CrmButton>
          </>
        }
      />

      <SupplierEntryModal
        open={entryOpen}
        mode={entryMode}
        initial={entryInitial}
        busy={entrySaving}
        error={entryError}
        onClose={closeEntry}
        onSubmit={handleEntrySubmit}
      />

      <SupplierOfferEntryModal
        open={offerOpen}
        mode={offerMode}
        supplierName={offerSupplier?.name ?? ''}
        initial={offerInitial}
        busy={offerSaving}
        error={offerError}
        onClose={closeOffer}
        onSubmit={handleOfferSubmit}
      />

      <SupplierDeliveryModal
        open={deliveryOpen}
        onClose={() => setDeliveryOpen(false)}
        defaultSupplierId={deliverySupplierId}
        onCreated={() => void load()}
      />

      <CrmPageStatus error={error} loading={suppliers === null && !error} variant="banner" />

      {suppliers && suppliers.length === 0 ? (
        <p className="suppliers-page__empty">
          Поставщиков пока нет.{' '}
          <CrmButton variant="link" onClick={openAddSupplier}>
            Добавить первого
          </CrmButton>
        </p>
      ) : null}

      {suppliers && suppliers.length > 0
        ? suppliers.map((s) => (
            <section key={s.id} className="suppliers-page__card prices-page__section">
              <div className="suppliers-page__card-head">
                <h2 className="prices-page__section-title suppliers-page__name">{s.name}</h2>
                <div className="suppliers-page__card-actions">
                  <CrmRowActions
                    onEdit={() => openEditSupplier(s)}
                    onDelete={() => void removeSupplier(s)}
                  />
                  <CrmButton
                    variant="suppliersCardPlan"
                    onClick={() => {
                      setDeliverySupplierId(s.id)
                      setDeliveryOpen(true)
                    }}
                  >
                    Сделать поставку
                  </CrmButton>
                </div>
              </div>
              {s.legal_name ? <p className="suppliers-page__line suppliers-page__line--strong">{s.legal_name}</p> : null}
              {s.legal_info ? (
                <p className="suppliers-page__line suppliers-page__mono">{s.legal_info}</p>
              ) : null}
              {s.address ? <p className="suppliers-page__line">{s.address}</p> : null}
              {s.contacts ? <p className="suppliers-page__line suppliers-page__contacts">{s.contacts}</p> : null}
              {s.notes ? <p className="suppliers-page__notes">{s.notes}</p> : null}

              <div className="suppliers-page__offers-head">
                <h3 className="suppliers-page__subhead">Прайс (автозаполнение закупки)</h3>
                <CrmButton variant="suppliersOfferAdd" onClick={() => openAddOffer(s)}>
                  + Позиция
                </CrmButton>
              </div>
              {s.offers.length === 0 ? (
                <p className="suppliers-page__muted">Позиций нет — добавьте виды с закупочной ценой.</p>
              ) : (
                <>
                  <ul className="suppliers-page__offer-cards" aria-label={`Прайс: ${s.name}`}>
                    {s.offers.map((o) => (
                      <li key={`${s.id}-${o.store_flower_id}-card`} className="suppliers-page__offer-card">
                        <p className="suppliers-page__offer-card-title">{o.display_name}</p>
                        {o.latin_name ? (
                          <p className="suppliers-page__latin">{o.latin_name}</p>
                        ) : null}
                        <div className="suppliers-page__offer-card-row">
                          <span className="suppliers-page__offer-card-label">Ранг</span>
                          <span className="suppliers-page__offer-card-value">{o.rank_label}</span>
                        </div>
                        <div className="suppliers-page__offer-card-row">
                          <span className="suppliers-page__offer-card-label">Закупка</span>
                          <span className="suppliers-page__offer-card-value">
                            {o.unit_purchase_price} ₽/шт
                          </span>
                        </div>
                        <div className="suppliers-page__offer-card-actions">
                          <CrmRowActions
                            onEdit={() => openEditOffer(s, o)}
                            onDelete={() => void removeOffer(s, o)}
                          />
                          <Link
                            to={`/warehouse/flowers/${o.store_flower_id}`}
                            state={catalogFromSuppliers}
                            className="prices-page__flower-link suppliers-page__catalog-link"
                          >
                            Карточка
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="suppliers-page__table-wrap suppliers-page__table-wrap--desktop">
                    <table className="suppliers-page__table">
                  <thead>
                    <tr>
                      <th scope="col">Вид</th>
                      <th scope="col">Латинское название</th>
                      <th scope="col">Ранг</th>
                      <th scope="col" className="suppliers-page__th-num">
                        Закупка ₽/шт
                      </th>
                      <th scope="col" className="suppliers-page__th-actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {s.offers.map((o) => (
                      <tr key={`${s.id}-${o.store_flower_id}`}>
                        <td>{o.display_name}</td>
                        <td className="suppliers-page__latin">{o.latin_name ?? '—'}</td>
                        <td>{o.rank_label}</td>
                        <td className="suppliers-page__td-num">{o.unit_purchase_price}</td>
                        <td className="suppliers-page__td-actions">
                          <CrmRowActions
                            onEdit={() => openEditOffer(s, o)}
                            onDelete={() => void removeOffer(s, o)}
                          />
                          <Link
                            to={`/warehouse/flowers/${o.store_flower_id}`}
                            state={catalogFromSuppliers}
                            className="prices-page__flower-link suppliers-page__catalog-link"
                          >
                            Карточка
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  </div>
                </>
              )}
            </section>
          ))
        : null}

      {confirmDialog}
    </div>
  )
}
