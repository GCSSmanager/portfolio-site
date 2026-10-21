import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../api/apiFetch'
import { CrmButton } from '../components/ui/CrmButton'
import { useCrmConfirm } from '../hooks/useCrmConfirm'
import { CrmPageStatus } from '../components/ui/CrmPageStatus'
import { CrmPageToolbar } from '../components/ui/CrmPageToolbar'
import { CrmRowActions } from '../components/ui/CrmRowActions'
import { formatRubNumber, parseAmount } from '../utils/formatMoney'
import { isUpstreamErrorStatus } from '../utils/networkError'
import {
  DeliveryServiceEntryModal,
  type DeliveryServiceEntryInitial,
} from './warehouse/DeliveryServiceEntryModal'
import './flowersCatalog.css'
import './warehouse.css'
import './warehouse/stock/modal-shell-taxons.css'
import './suppliersPage.css'
import './deliveryServicesPage.css'

type DeliveryServiceRow = {
  id: number
  name: string
  description: string | null
  contacts: string | null
  city_delivery_price: string | null
  created_at: string | null
}

const emptyEntry = (): DeliveryServiceEntryInitial => ({
  name: '',
  description: '',
  contacts: '',
  cityDeliveryPrice: '',
})

function rowToEntry(row: DeliveryServiceRow): DeliveryServiceEntryInitial {
  const price = row.city_delivery_price
  return {
    name: row.name,
    description: row.description ?? '',
    contacts: row.contacts ?? '',
    cityDeliveryPrice:
      price != null && price !== '' ? String(parseAmount(price)).replace('.', ',') : '',
  }
}

function formatCityPrice(price: string | null): string {
  if (price == null || price === '') return '—'
  return formatRubNumber(parseAmount(price))
}

export function DeliveryServicesPage() {
  const [services, setServices] = useState<DeliveryServiceRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [entryOpen, setEntryOpen] = useState(false)
  const [entryMode, setEntryMode] = useState<'add' | 'edit'>('add')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [entryInitial, setEntryInitial] = useState<DeliveryServiceEntryInitial>(emptyEntry)
  const [entryError, setEntryError] = useState<string | null>(null)
  const [entrySaving, setEntrySaving] = useState(false)

  const { ask, dialog: confirmDialog } = useCrmConfirm()

  const applyServices = useCallback((rows: DeliveryServiceRow[]) => {
    setServices(rows)
    setError(null)
  }, [])

  const load = useCallback(() => {
    setError(null)
    return apiFetch('/api/me/delivery-services/')
      .then((res) => {
        if (res.status === 401) throw new Error('Сессия недействительна. Войдите снова.')
        if (!res.ok && isUpstreamErrorStatus(res.status)) return null
        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        return res.json() as Promise<{ delivery_services: DeliveryServiceRow[] }>
      })
      .then((data) => {
        if (data === null) return
        applyServices(data.delivery_services)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить сервисы доставки')
      })
  }, [applyServices])

  useEffect(() => {
    void load()
  }, [load])

  const openAdd = () => {
    setEntryMode('add')
    setEditingId(null)
    setEntryInitial(emptyEntry())
    setEntryError(null)
    setEntryOpen(true)
  }

  const openEdit = (row: DeliveryServiceRow) => {
    setEntryMode('edit')
    setEditingId(row.id)
    setEntryInitial(rowToEntry(row))
    setEntryError(null)
    setEntryOpen(true)
  }

  const closeEntry = () => {
    setEntryOpen(false)
    setEntrySaving(false)
  }

  const handleEntrySubmit = async (values: DeliveryServiceEntryInitial) => {
    setEntrySaving(true)
    setEntryError(null)
    const body = {
      name: values.name,
      description: values.description || null,
      contacts: values.contacts || null,
      city_delivery_price: values.cityDeliveryPrice.replace(/\s/g, '').replace(',', '.') || null,
    }
    try {
      const res = await apiFetch(
        entryMode === 'add' ? '/api/me/delivery-services/' : `/api/me/delivery-services/${editingId}/`,
        {
          method: entryMode === 'add' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      const j = (await res.json().catch(() => ({}))) as {
        delivery_services?: DeliveryServiceRow[]
        error?: string
      }
      if (!res.ok) {
        setEntryError(j.error ?? `Ошибка ${res.status}`)
        return
      }
      if (j.delivery_services) applyServices(j.delivery_services)
      else await load()
      closeEntry()
    } finally {
      setEntrySaving(false)
    }
  }

  const requestDeleteService = (row: DeliveryServiceRow) => {
    ask({
      title: `Удалить сервис «${row.name}»?`,
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        setError(null)
        const res = await apiFetch(`/api/me/delivery-services/${row.id}/`, { method: 'DELETE' })
        const j = (await res.json().catch(() => ({}))) as {
          delivery_services?: DeliveryServiceRow[]
          error?: string
        }
        if (!res.ok) {
          setError(j.error ?? `Ошибка ${res.status}`)
          return
        }
        if (j.delivery_services) applyServices(j.delivery_services)
        else await load()
      },
    })
  }

  return (
    <div className="flowers-page flowers-page--suppliers flowers-page--delivery-services">
      <CrmPageToolbar
        layout="toolbar"
        title="Сервисы доставки"
        leadCompact
        lead="Справочник доставщиков магазина и цена доставки по городу."
        actions={
          <CrmButton variant="accent" onClick={openAdd}>
            + Сервис
          </CrmButton>
        }
      />

      <DeliveryServiceEntryModal
        open={entryOpen}
        mode={entryMode}
        initial={entryInitial}
        busy={entrySaving}
        error={entryError}
        onClose={closeEntry}
        onSubmit={handleEntrySubmit}
      />

      {confirmDialog}

      <CrmPageStatus error={error} loading={services === null && !error} variant="banner" />

      {services && services.length === 0 ? (
        <p className="suppliers-page__empty">
          Сервисов пока нет.{' '}
          <CrmButton variant="link" onClick={openAdd}>
            Добавить первый
          </CrmButton>
        </p>
      ) : null}

      {services && services.length > 0
        ? services.map((row) => (
            <section key={row.id} className="suppliers-page__card delivery-service-card">
              <div className="delivery-service-card__head">
                <div className="delivery-service-card__main">
                  <h2 className="delivery-service-card__name">{row.name}</h2>
                  <span className="delivery-service-card__price">
                    <span className="delivery-service-card__price-lab">По городу</span>
                    {formatCityPrice(row.city_delivery_price)}
                  </span>
                </div>
                <CrmRowActions onEdit={() => openEdit(row)} onDelete={() => requestDeleteService(row)} />
              </div>
              {row.description || row.contacts ? (
                <div className="delivery-service-card__details">
                  {row.description ? <p>{row.description}</p> : null}
                  {row.contacts ? <p className="delivery-service-card__contacts">{row.contacts}</p> : null}
                </div>
              ) : null}
            </section>
          ))
        : null}
    </div>
  )
}
