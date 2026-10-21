import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  BatchGridCardItem,
  CollapsibleCardsBlock,
  CrmEmpty,
  CrmPageHeader,
  CrmSkeleton,
  HomeTaskBlock,
  stockActionKey,
  UNDO_FADE_MS,
} from '../components/crm'
import {
  BatchMiniCard,
  BouquetMiniCard,
  buildWarehouseFlowerLines,
  HomeBatchSetPriceTaskCard,
  HomeCustomTaskCard,
  HomeExpensePaymentTaskCard,
  HomeRetailSetPriceTaskCard,
  CustomerOrderCareCard,
  SupplierDeliveryCareCard,
  InventoryCareCard,
} from '../components/crm/cards'
import {
  BouquetAssembleModal,
  BouquetRecipeModal,
  IntakeBatchModal,
  bouquetUnitPriceDraft,
  consumableRecipeLinesToTaxonRows,
  newBouquetRecipeLine,
  recipeLinesToTaxonRows,
  validateBouquetRecipeLines,
  OrderModal,
  SaleModal,
  newSaleModalLine,
  type SaleModalLineRow,
  buildStockLineApiBody,
  areAllSaleModalLinesComplete,
  WasteModal,
  type WasteAggregateTarget,
} from '../components/crm/modals'
import type {
  BatchRow,
  BatchesResponse,
  FlowerStockDiscardTarget,
  HomeMergedItem,
  HomeMoreItem,
  HomeSectionView,
  HomeTaskGates,
  HomeSalesDayApi,
  BouquetRow,
  ConsumableRow,
  RetailProductRow,
  StockCrmSurface,
  CustomerOrderCareRow,
  SupplierDeliveryCareRow,
  WarehouseSectionKey,
} from '../components/crm'
import { apiFetch } from '../api/apiFetch'
import { useCrmConfirm } from '../hooks/useCrmConfirm'

const EMPTY_HOME_SALES_DAY: HomeSalesDayApi = {
  date: '',
  total_quantity: 0,
  total_amount: '0.00',
  total_cost: '0.00',
  total_profit: '0.00',
  sales_count: 0,
}

import { useAuth } from '../auth/AuthContext'
import { digitsFromPhoneInput } from '../auth/phoneInput'
import { isOrderPickupDelivery } from '../utils/orderDelivery'
import { catalogNavState } from '../utils/catalogNav'
import {
  batchNeedsCareOnly,
  batchNeedsIntake,
  bouquetNeedsCareOnly,
  bouquetNeedsIntake,
} from '../utils/homeBatchCare'
import { isUpstreamErrorStatus } from '../utils/networkError'
import {
  combineLocalDateTime,
  combineLocalDateTimeDefaultToday,
  isReceivedAtInputBad,
  localDateTimeToIso,
  receivedAtInputBadMessage,
  validateReceivedAtInput,
  validateScheduledAtInput,
} from '../utils/receivedAtRuInput'
import {
  isConsumableStockHit,
  isFlowerStockHit,
  isRetailStockHit,
  type StockSearchHit,
} from '../utils/stockSearchQuery'
import {
  parseMoneyInput,
  parseStoredMoney,
} from '../utils/crmInput'
import { DEFAULT_PAYMENT_TYPE } from '../utils/paymentType'
import { mediaUrl } from '../utils/mediaUrl'
import {
  consumablePackCountRequiredError,
  consumablePackVolumeRequiredError,
  consumablePriceRequiredError,
  formatConsumableQuantity,
  parseConsumableMeters,
} from '../utils/consumableMeters'
import {
  buildAssembleConsumableUsage,
  buildAssembleRecipeUsage,
  storeFlowerQuantityStock,
  storeFlowerRealizationStock,
  storeFlowerStockBreakdown,
} from '../utils/bouquetAssembleRealization'
import { validateDiscardRealizationQty } from '../utils/discardRealizationQty'
import {
  formatUnitCostInput,
  newTaxonQtyLine,
  RetailProductModal,
  retailProductUnitPriceDraft,
  type RetailProductEntryInitial,
  SupplierDeliveryModal,
  SupplierDeliveryReceiveModal,
  type SupplierDeliveryReceiveLinePayload,
  useCrmDialogScrollLock,
  WarehouseBouquetCatalog,
  WarehouseFlowersCatalog,
  WarehouseRetailCatalog,
  WarehouseConsumablesCatalog,
  ConsumableModal,
  ConsumableIntakeModal,
  type ConsumableEntryInitial,
  useStoreFlowerEditor,
  realizationPayloadFromLine,
  validateRealizationLine,
  buildSaleStockOptions,
  type TaxonQtyLineRow,
} from './warehouse'
import './warehouse.css'
import './storeFlowersPage.css'
import './warehouse/warehouseFlowersCatalog.css'
import './warehouse/stock/warehouse-stock-list.css'

export type { StockCrmSurface }

export function StockCrm({ surface = 'warehouse' }: { surface?: StockCrmSurface }) {
  useCrmDialogScrollLock()
  const { isOwner } = useAuth()
  const [saleOpen, setSaleOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [wasteOpen, setWasteOpen] = useState(false)
  const [wasteBouquetCapQty, setWasteBouquetCapQty] = useState<number | null>(null)
  const [batches, setBatches] = useState<BatchRow[] | null>(null)
  const [retailProducts, setRetailProducts] = useState<RetailProductRow[]>([])
  const [consumables, setConsumables] = useState<ConsumableRow[]>([])
  const [bouquets, setBouquets] = useState<BouquetRow[]>([])
  const [bouquetCareUnits, setBouquetCareUnits] = useState<BouquetRow[]>([])
  const [bouquetRecipeOpen, setBouquetRecipeOpen] = useState(false)
  const [bouquetRecipeMode, setBouquetRecipeMode] = useState<'add' | 'edit'>('add')
  const [bouquetRecipeEditingId, setBouquetRecipeEditingId] = useState<number | null>(null)
  const [bouquetRecipeStockQty, setBouquetRecipeStockQty] = useState(0)
  const [bouquetRecipeName, setBouquetRecipeName] = useState('')
  const [bouquetRecipePrice, setBouquetRecipePrice] = useState('')
  const [bouquetRecipePhoto, setBouquetRecipePhoto] = useState<File | null>(null)
  const [bouquetRecipePhotoUrl, setBouquetRecipePhotoUrl] = useState<string | null>(null)
  const [bouquetRecipeLines, setBouquetRecipeLines] = useState(() => [newBouquetRecipeLine()])
  const [bouquetConsumableLines, setBouquetConsumableLines] = useState<TaxonQtyLineRow[]>([])
  const [bouquetRecipeError, setBouquetRecipeError] = useState<string | null>(null)
  const [bouquetRecipeInvalid, setBouquetRecipeInvalid] = useState<'name' | 'lines' | 'price' | null>(null)
  const [bouquetRecipeBusy, setBouquetRecipeBusy] = useState(false)
  const [bouquetAssembleOpen, setBouquetAssembleOpen] = useState(false)
  const [bouquetAssembleId, setBouquetAssembleId] = useState<number | ''>('')
  const [bouquetAssembleQty, setBouquetAssembleQty] = useState('1')
  const [bouquetAssembleError, setBouquetAssembleError] = useState<string | null>(null)
  const [bouquetAssembleInvalid, setBouquetAssembleInvalid] = useState<'bouquet' | 'qty' | 'lines' | null>(null)
  const [bouquetAssembleBusy, setBouquetAssembleBusy] = useState(false)
  const [supplierDeliveryCare, setSupplierDeliveryCare] = useState<SupplierDeliveryCareRow[]>([])
  const [customerOrdersCare, setCustomerOrdersCare] = useState<CustomerOrderCareRow[]>([])
  const [supplierDeliveryOpen, setSupplierDeliveryOpen] = useState(false)
  const [receiveDeliveryRow, setReceiveDeliveryRow] = useState<SupplierDeliveryCareRow | null>(null)
  const [retailModalOpen, setRetailModalOpen] = useState(false)
  const [retailModalMode, setRetailModalMode] = useState<'add' | 'edit'>('add')
  const [retailEditingId, setRetailEditingId] = useState<number | null>(null)
  const [retailModalInitial, setRetailModalInitial] = useState<RetailProductEntryInitial>({
    name: '',
    photoPreviewUrl: null,
    unitPrice: '',
  })
  const [retailModalError, setRetailModalError] = useState<string | null>(null)
  const [retailModalBusy, setRetailModalBusy] = useState(false)
  const [retailCatalogReload, setRetailCatalogReload] = useState(0)
  const [consumableModalOpen, setConsumableModalOpen] = useState(false)
  const [consumableModalMode, setConsumableModalMode] = useState<'add' | 'edit'>('add')
  const [consumableEditingId, setConsumableEditingId] = useState<number | null>(null)
  const [consumableModalInitial, setConsumableModalInitial] = useState<ConsumableEntryInitial>({
    name: '',
    unitKind: 'meter',
    photoPreviewUrl: null,
  })
  const [consumableModalError, setConsumableModalError] = useState<string | null>(null)
  const [consumableModalBusy, setConsumableModalBusy] = useState(false)
  const [consumableIntakeOpen, setConsumableIntakeOpen] = useState(false)
  const [consumableIntakeRow, setConsumableIntakeRow] = useState<ConsumableRow | null>(null)
  const [consumableIntakeError, setConsumableIntakeError] = useState<string | null>(null)
  const [consumableIntakeBusy, setConsumableIntakeBusy] = useState(false)
  const [consumablesCatalogReload, setConsumablesCatalogReload] = useState(0)
  const [intakeOpen, setIntakeOpen] = useState(false)
  const [homeSalesDay, setHomeSalesDay] = useState<HomeSalesDayApi | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [intakeFormError, setIntakeFormError] = useState<string | null>(null)
  const [intakeInvalidField, setIntakeInvalidField] = useState<'lines' | 'received' | null>(null)
  const [saleFormError, setSaleFormError] = useState<string | null>(null)
  const [saleInvalidField, setSaleInvalidField] = useState<'lines' | 'payment' | null>(null)
  const [salePaymentType, setSalePaymentType] = useState<string>(DEFAULT_PAYMENT_TYPE)
  const [orderFormError, setOrderFormError] = useState<string | null>(null)
  const [orderInvalidField, setOrderInvalidField] = useState<
    'lines' | 'payment' | 'service' | 'phone' | 'address' | 'scheduled' | null
  >(null)
  const [orderPaymentType, setOrderPaymentType] = useState<string>(DEFAULT_PAYMENT_TYPE)
  const [saleLines, setSaleLines] = useState<SaleModalLineRow[]>(() => [newSaleModalLine()])
  const [orderLines, setOrderLines] = useState<SaleModalLineRow[]>(() => [newSaleModalLine()])
  const [busyStockKey, setBusyStockKey] = useState<string | null>(null)
  const [busyDeliveryId, setBusyDeliveryId] = useState<number | null>(null)
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null)
  const [busyCustomTaskId, setBusyCustomTaskId] = useState<number | null>(null)
  const [saleBusy, setSaleBusy] = useState(false)
  const [orderBusy, setOrderBusy] = useState(false)
  const [orderDeliveryServiceId, setOrderDeliveryServiceId] = useState('')
  const [orderCustomerPhone, setOrderCustomerPhone] = useState('')
  const [orderDeliveryAddress, setOrderDeliveryAddress] = useState('')
  const [orderScheduledDate, setOrderScheduledDate] = useState('')
  const [orderScheduledTime, setOrderScheduledTime] = useState('')
  const [wasteSelectedKey, setWasteSelectedKey] = useState('')
  const [wasteAggregate, setWasteAggregate] = useState<WasteAggregateTarget | null>(null)
  const [wasteQty, setWasteQty] = useState('1')
  const [wasteRealizationQty, setWasteRealizationQty] = useState('0')
  const [wasteMeters, setWasteMeters] = useState('')
  const [wasteExtraBusy, setWasteExtraBusy] = useState(false)
  const [batchLines, setBatchLines] = useState<TaxonQtyLineRow[]>(() => [newTaxonQtyLine('50', '')])
  const [receivedDate, setReceivedDate] = useState('')
  const [receivedTime, setReceivedTime] = useState('')
  const [creating, setCreating] = useState(false)
  const [expensePaymentTasks, setExpensePaymentTasks] = useState<
    NonNullable<BatchesResponse['expense_payment_tasks']>
  >([])
  const [homeTaskGates, setHomeTaskGates] = useState<HomeTaskGates>({})
  const [homeSections, setHomeSections] = useState<HomeSectionView[]>([])
  const [stockMeta, setStockMeta] = useState<{
    warehouse_mode?: string
    basic_shop_periodic_due: boolean
    basic_next_care_date?: string | null
    inventory_periodic_due: boolean
    inventory_interval_days: number
  }>({
    basic_shop_periodic_due: false,
    basic_next_care_date: null,
    inventory_periodic_due: false,
    inventory_interval_days: 14,
  })
  const [homeSectionsOpen, setHomeSectionsOpen] = useState<Record<string, boolean>>({})
  const [warehouseSectionsOpen, setWarehouseSectionsOpen] = useState<
    Record<WarehouseSectionKey, boolean>
  >({
    deliveries: false,
    flowers: false,
    bouquets: false,
    retail: false,
    consumables: false,
  })

  /** Снимок списка «Дела» с прошлого рендера — для короткой анимации исчезнувших карточек. */
  const prevCareSnapshotRef = useRef<BatchRow[]>([])
  const syncDroppedLatestRef = useRef<Map<string, BatchRow>>(new Map())
  const leavingScheduledRef = useRef<Set<string>>(new Set())
  const [leavingCareRows, setLeavingCareRows] = useState<Map<string, BatchRow>>(new Map())
  const resetBatchForm = () => {
    setBatchLines([newTaxonQtyLine('50', '')])
    setReceivedDate('')
    setReceivedTime('')
  }

  const openModal = () => {
    if (!isOwner) return
    setPageError(null)
    setIntakeFormError(null)
    setIntakeInvalidField(null)
    resetBatchForm()
    setIntakeOpen(true)
  }

  const closeModal = () => {
    setIntakeOpen(false)
  }

  const handleIntakeDialogClose = () => {
    resetBatchForm()
    setIntakeFormError(null)
    setIntakeInvalidField(null)
    setIntakeOpen(false)
  }

  const setBatchLineTaxon = (key: number, t: StockSearchHit | null) => {
    setBatchLines((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row
        if (t == null) return { ...row, taxon: null, unitCost: '' }
        const nextPrice =
          isFlowerStockHit(t) &&
          t.unit_purchase_price != null &&
          Number.isFinite(t.unit_purchase_price)
            ? formatUnitCostInput(t.unit_purchase_price)
            : row.unitCost
        return { ...row, taxon: t, unitCost: nextPrice }
      }),
    )
  }

  const setBatchLineQty = (key: number, qty: string) => {
    setBatchLines((prev) => prev.map((row) => (row.key === key ? { ...row, qty } : row)))
  }

  const setBatchLineUnitCost = (key: number, unitCost: string) => {
    setBatchLines((prev) => prev.map((row) => (row.key === key ? { ...row, unitCost } : row)))
  }
  const setBatchLineRealizationQty = (key: number, v: string) => {
    setBatchLines((prev) => prev.map((row) => (row.key === key ? { ...row, realizationQty: v } : row)))
  }
  const setBatchLineSaleTermsFixedPrice = (key: number, v: string) => {
    setBatchLines((prev) => prev.map((row) => (row.key === key ? { ...row, saleTermsFixedPrice: v } : row)))
  }
  const setBatchLinePackSize = (key: number, v: string) => {
    setBatchLines((prev) => prev.map((row) => (row.key === key ? { ...row, packSize: v } : row)))
  }
  const setBatchLineRollsCount = (key: number, v: string) => {
    setBatchLines((prev) => prev.map((row) => (row.key === key ? { ...row, rollsCount: v } : row)))
  }
  const load = useCallback(() => {
    setPageError(null)
    return apiFetch('/api/me/stock/')
      .then((res) => {
        if (res.status === 401) throw new Error('Сессия недействительна. Войдите снова.')
        if (!res.ok && isUpstreamErrorStatus(res.status)) {
          return null
        }
        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        return res.json() as Promise<BatchesResponse>
      })
      .then((data) => {
        if (data === null) return
        setBatches(data.batches)
        setStockMeta({
          warehouse_mode: data.warehouse_mode,
          basic_shop_periodic_due: Boolean(data.basic_shop_periodic_due),
          basic_next_care_date: data.basic_next_care_date ?? null,
          inventory_periodic_due: Boolean(data.inventory_periodic_due),
          inventory_interval_days: data.inventory_interval_days ?? 14,
        })
        setRetailProducts(data.retail_products ?? [])
        setConsumables(data.consumables ?? [])
        const mapBouquet = (b: BouquetRow) => ({
          ...b,
          recipe_lines: b.recipe_lines ?? [],
          consumable_recipe_lines: b.consumable_recipe_lines ?? [],
          components: b.components ?? [],
        })
        setBouquets((data.bouquets ?? []).map(mapBouquet))
        setBouquetCareUnits((data.bouquet_care_units ?? data.bouquets ?? []).map(mapBouquet))
        setSupplierDeliveryCare(data.supplier_deliveries_care ?? [])
        setCustomerOrdersCare(data.customer_orders_care ?? [])
        setExpensePaymentTasks(data.expense_payment_tasks ?? [])
        setHomeTaskGates(data.home_task_gates ?? {})
        const sections = data.home_sections ?? []
        setHomeSections(sections)
        setHomeSectionsOpen((prev) => {
          const next = { ...prev }
          for (const s of sections) {
            const key = String(s.id)
            if (next[key] === undefined) next[key] = false
          }
          return next
        })
      })
      .catch((e: unknown) => {
        setPageError(e instanceof Error ? e.message : 'Не удалось загрузить склад')
      })
  }, [])

  const [flowersCatalogReload, setFlowersCatalogReload] = useState(0)
  const [storeFlowerCatalog, setStoreFlowerCatalog] = useState<{ id: number }[] | null>(null)
  const onFlowerEditorSaved = useCallback(async () => {
    setFlowersCatalogReload((n) => n + 1)
    await load()
  }, [load])
  const flowerEditor = useStoreFlowerEditor({ isOwner, onSaved: onFlowerEditorSaved })
  const { ask: askDeleteConfirm, dialog: deleteConfirmDialog } = useCrmConfirm()

  const fetchHomeSalesStats = useCallback(() => {
    return apiFetch('/api/me/stock/sales/stats/')
      .then(async (res) => {
        if (!res.ok && isUpstreamErrorStatus(res.status)) return
        if (!res.ok) {
          setHomeSalesDay(EMPTY_HOME_SALES_DAY)
          return
        }
        const day = (await res.json()) as HomeSalesDayApi
        setHomeSalesDay(day)
      })
      .catch(() => {
        setHomeSalesDay(EMPTY_HOME_SALES_DAY)
      })
  }, [])

  useEffect(() => {
    if (!isOwner || surface !== 'home' || batches === null) return
    void fetchHomeSalesStats()
  }, [surface, batches, fetchHomeSalesStats, isOwner])

  useEffect(() => {
    setBatches(null)
    void load()
  }, [load])

  const batchCareTasks = useMemo(() => {
    if (!batches?.length) return []
    return batches.filter(
      (b) =>
        b.intake_pending ||
        (Boolean(b.has_intake_batches) && b.basic_batch_scope === 'intake_pending') ||
        b.care_needs_trim ||
        b.care_needs_water,
    )
  }, [batches])

  const bouquetCareTasks = useMemo(() => bouquetCareUnits, [bouquetCareUnits])

  const bouquetActionKey = (row: BouquetRow) =>
    row.assembly_id != null ? `bouquet:${row.id}:a${row.assembly_id}` : `bouquet:${row.id}`

  const syncDroppedRows = (() => {
    const prev = prevCareSnapshotRef.current
    const curr = batchCareTasks
    const currKeys = new Set(curr.map((c) => stockActionKey(c)))
    const dropped = new Map<string, BatchRow>()
    for (const row of prev) {
      const k = stockActionKey(row)
      if (!currKeys.has(k)) {
        dropped.set(k, row)
      }
    }
    prevCareSnapshotRef.current = curr
    return dropped
  })()

  const droppedIdsKey = [...syncDroppedRows.keys()].sort().join(',')
  syncDroppedLatestRef.current = syncDroppedRows

  useLayoutEffect(() => {
    const dropped = syncDroppedLatestRef.current
    if (dropped.size === 0) return
    for (const [k, row] of dropped) {
      if (!leavingScheduledRef.current.has(k)) {
        leavingScheduledRef.current.add(k)
        setLeavingCareRows((m) => new Map(m).set(k, row))
        window.setTimeout(() => {
          leavingScheduledRef.current.delete(k)
          setLeavingCareRows((m) => {
            const n = new Map(m)
            n.delete(k)
            return n
          })
        }, UNDO_FADE_MS)
      }
    }
  }, [droppedIdsKey])

  const gate = useCallback(
    (key: keyof HomeTaskGates, fallback: boolean) => homeTaskGates[key] ?? fallback,
    [homeTaskGates],
  )

  const batchIntakeHomeRows = useMemo(() => {
    const taskByKey = new Map(batchCareTasks.filter(batchNeedsIntake).map((r) => [stockActionKey(r), r]))
    const out: BatchRow[] = []
    if (batches?.length) {
      for (const b of batches) {
        const row = taskByKey.get(stockActionKey(b))
        if (row) out.push(row)
      }
    }
    const seen = new Set(out.map((r) => stockActionKey(r)))
    for (const [k, row] of leavingCareRows) {
      if (!seen.has(k) && batchNeedsIntake(row)) {
        out.push(row)
        seen.add(k)
      }
    }
    for (const [k, row] of syncDroppedRows) {
      if (!seen.has(k) && batchNeedsIntake(row)) {
        out.push(row)
        seen.add(k)
      }
    }
    return out
  }, [batches, batchCareTasks, leavingCareRows, syncDroppedRows])

  const batchCareOnlyHomeRows = useMemo(() => {
    const taskByKey = new Map(
      batchCareTasks.filter(batchNeedsCareOnly).map((r) => [stockActionKey(r), r]),
    )
    const out: BatchRow[] = []
    if (batches?.length) {
      for (const b of batches) {
        const row = taskByKey.get(stockActionKey(b))
        if (row) out.push(row)
      }
    }
    const seen = new Set(out.map((r) => stockActionKey(r)))
    for (const [k, row] of leavingCareRows) {
      if (!seen.has(k) && batchNeedsCareOnly(row)) {
        out.push(row)
        seen.add(k)
      }
    }
    for (const [k, row] of syncDroppedRows) {
      if (!seen.has(k) && batchNeedsCareOnly(row)) {
        out.push(row)
        seen.add(k)
      }
    }
    return out
  }, [batches, batchCareTasks, leavingCareRows, syncDroppedRows])

  const bouquetIntakeHomeRows = useMemo(
    () => bouquetCareTasks.filter(bouquetNeedsIntake),
    [bouquetCareTasks],
  )

  const bouquetCareOnlyHomeRows = useMemo(
    () => bouquetCareTasks.filter(bouquetNeedsCareOnly),
    [bouquetCareTasks],
  )

  const deliveryHomeItems = useMemo((): HomeMergedItem[] => {
    if (!gate('supplier_deliveries', isOwner)) return []
    return supplierDeliveryCare.map((row) => ({ kind: 'delivery', row }))
  }, [supplierDeliveryCare, gate, isOwner])

  const intakeHomeItems = useMemo((): HomeMergedItem[] => {
    if (!gate('flower_care', true)) return []
    return [
      ...batchIntakeHomeRows.map((row) => ({ kind: 'batch' as const, row })),
      ...bouquetIntakeHomeRows.map((row) => ({ kind: 'bouquet' as const, row })),
    ]
  }, [batchIntakeHomeRows, bouquetIntakeHomeRows, gate])

  const careOnlyHomeItems = useMemo((): HomeMergedItem[] => {
    if (!gate('flower_care', true)) return []
    return [
      ...batchCareOnlyHomeRows.map((row) => ({ kind: 'batch' as const, row })),
      ...bouquetCareOnlyHomeRows.map((row) => ({ kind: 'bouquet' as const, row })),
    ]
  }, [batchCareOnlyHomeRows, bouquetCareOnlyHomeRows, gate])

  const batchesInStock = useMemo(
    () => (batches ?? []).filter((b) => b.quantity > 0),
    [batches],
  )

  const retailForSale = useMemo(
    () => retailProducts.filter((p) => p.quantity > 0),
    [retailProducts],
  )

  const bouquetsForSale = useMemo(
    () => bouquets.filter((b) => b.quantity > 0),
    [bouquets],
  )

  const bouquetsForDiscard = useMemo(
    () => bouquets.filter((b) => b.quantity > 0),
    [bouquets],
  )

  const consumablesForDiscard = useMemo(
    () => consumables.filter((c) => (parseConsumableMeters(c.meters_balance) ?? 0) > 0),
    [consumables],
  )

  const wasteSearchOptions = useMemo(
    () => [
      ...bouquetsForDiscard.map((b) => ({
        key: `bouquet:${b.id}`,
        title: `${b.name} · букет · ${b.quantity} шт.`,
        meta: 'букет',
        searchText: `${b.name} букет`,
      })),
      ...batchesInStock.map((b) => ({
        key: stockActionKey(b),
        title:
          b.line_kind === 'basic'
            ? `${b.display_name} · базовый склад · ${b.quantity} шт.`
            : `#${b.id} · ${b.display_name}`,
        meta: `${b.quantity} шт.`,
      })),
      ...retailForSale.map((p) => ({
        key: `retail:${p.id}`,
        title: `${p.name} · товар без срока · ${p.quantity} шт.`,
        meta: `${p.quantity} шт.`,
        searchText: `${p.name} товар`,
      })),
      ...consumablesForDiscard.map((c) => {
        const m = formatConsumableQuantity(c.meters_balance)
        const u = c.unit_label || (c.unit_kind === 'piece' ? 'шт' : 'м')
        return {
          key: `consumable:${c.id}`,
          title: `${c.name} · расходник · ${m} ${u}`,
          meta: `${m} ${u}`,
          searchText: `${c.name} расходник`,
        }
      }),
    ],
    [batchesInStock, retailForSale, bouquetsForDiscard, consumablesForDiscard],
  )

  const wasteSelectedRetailProduct = useMemo(() => {
    if (!wasteSelectedKey.startsWith('retail:')) return null
    const id = Number.parseInt(wasteSelectedKey.slice('retail:'.length), 10)
    if (!Number.isFinite(id)) return null
    return retailProducts.find((p) => p.id === id && p.quantity > 0) ?? null
  }, [wasteSelectedKey, retailProducts])

  const wasteSelectedBouquet = useMemo(() => {
    if (!wasteSelectedKey.startsWith('bouquet:')) return null
    const id = Number.parseInt(wasteSelectedKey.slice('bouquet:'.length), 10)
    if (!Number.isFinite(id)) return null
    return bouquets.find((b) => b.id === id && b.quantity > 0) ?? null
  }, [wasteSelectedKey, bouquets])

  const wasteSelectedConsumable = useMemo(() => {
    if (!wasteSelectedKey.startsWith('consumable:')) return null
    const id = Number.parseInt(wasteSelectedKey.slice('consumable:'.length), 10)
    if (!Number.isFinite(id)) return null
    return consumablesForDiscard.find((c) => c.id === id) ?? null
  }, [wasteSelectedKey, consumablesForDiscard])

  const openFlowerStockDiscard = useCallback(
    (target: FlowerStockDiscardTarget) => {
      if (!isOwner) return
      setPageError(null)
      setWasteQty('1')
      if (target.kind === 'aggregate') {
        setWasteAggregate({
          storeFlowerId: target.storeFlowerId,
          label: target.label,
          maxQty: target.maxQty,
          maxRealizationQty: target.maxRealizationQty,
        })
        setWasteSelectedKey('')
        setWasteOpen(true)
        return
      }
      const row = batchesInStock.find((b) => b.id === target.batchId)
      if (row) {
        setWasteAggregate(null)
        setWasteSelectedKey(stockActionKey(row))
        setWasteOpen(true)
      }
    },
    [batchesInStock, isOwner],
  )

  const openRetailStockDiscard = useCallback(
    (row: RetailProductRow) => {
      if (!isOwner || row.quantity < 1) return
      setPageError(null)
      setWasteAggregate(null)
      setWasteSelectedKey(`retail:${row.id}`)
      setWasteQty('1')
      setWasteOpen(true)
    },
    [isOwner],
  )

  const openConsumableStockDiscard = useCallback(
    (row: ConsumableRow) => {
      if (!isOwner || (parseConsumableMeters(row.meters_balance) ?? 0) <= 0) return
      setPageError(null)
      setWasteAggregate(null)
      setWasteSelectedKey(`consumable:${row.id}`)
      setWasteMeters('')
      setWasteQty('1')
      setWasteOpen(true)
    },
    [isOwner],
  )

  const saleStockOptions = useMemo(
    () => buildSaleStockOptions(batchesInStock, retailForSale, bouquetsForSale),
    [batchesInStock, retailForSale, bouquetsForSale],
  )

  /** В заказе нет «букета на заказ» — только готовые позиции склада (как в проде). */
  const orderStockOptions = useMemo(
    () => saleStockOptions.filter((o) => o.kind !== 'custom_bouquet'),
    [saleStockOptions],
  )

  const hasSaleStock = saleStockOptions.length > 0
  const hasOrderStock = orderStockOptions.length > 0

  const storeFlowerRealizationBySf = useMemo(
    () => storeFlowerRealizationStock(batchesInStock),
    [batchesInStock],
  )

  const storeFlowerQtyBySf = useMemo(() => storeFlowerQuantityStock(batchesInStock), [batchesInStock])

  const storeFlowerStockBySf = useMemo(
    () => storeFlowerStockBreakdown(storeFlowerQtyBySf, storeFlowerRealizationBySf),
    [storeFlowerQtyBySf, storeFlowerRealizationBySf],
  )

  const bouquetAssembleSelected = useMemo(() => {
    if (bouquetAssembleId === '') return null
    return bouquets.find((x) => x.id === bouquetAssembleId) ?? null
  }, [bouquetAssembleId, bouquets])

  const bouquetAssembleCount = useMemo(() => {
    const n = Number.parseInt(bouquetAssembleQty.trim(), 10)
    return Number.isFinite(n) && n >= 1 ? n : 0
  }, [bouquetAssembleQty])

  const bouquetAssembleQtyValid = bouquetAssembleCount >= 1

  const consumableStockById = useMemo(() => {
    const m = new Map<number, number>()
    for (const c of consumables) {
      m.set(c.id, parseConsumableMeters(c.meters_balance) ?? 0)
    }
    return m
  }, [consumables])

  const bouquetAssembleUsageRows = useMemo(() => {
    if (!bouquetAssembleSelected?.recipe_lines.length) return []
    return buildAssembleRecipeUsage(
      bouquetAssembleSelected.recipe_lines,
      bouquetAssembleCount,
      storeFlowerStockBySf,
    )
  }, [bouquetAssembleSelected, bouquetAssembleCount, storeFlowerStockBySf])

  const bouquetAssembleConsumableUsageRows = useMemo(() => {
    if (!bouquetAssembleSelected?.consumable_recipe_lines?.length) return []
    return buildAssembleConsumableUsage(
      bouquetAssembleSelected.consumable_recipe_lines,
      bouquetAssembleCount,
      consumableStockById,
    )
  }, [bouquetAssembleSelected, bouquetAssembleCount, consumableStockById])

  const batchesMissingSalePrice = useMemo(() => {
    if (!batches?.length) return []
    return batches.filter((b) => b.quantity > 0 && parseStoredMoney(b.unit_price) == null)
  }, [batches])

  const retailMissingSalePrice = useMemo(
    () => retailProducts.filter((p) => p.quantity > 0 && parseStoredMoney(p.unit_price) == null),
    [retailProducts],
  )

  const homeMoreItems = useMemo((): HomeMoreItem[] => {
    const batchItems = batchesMissingSalePrice.map((row) => ({ kind: 'batch' as const, row }))
    const retailItems = retailMissingSalePrice.map((row) => ({ kind: 'retail' as const, row }))
    return [...batchItems, ...retailItems]
  }, [batchesMissingSalePrice, retailMissingSalePrice])

  const inventoryDue = stockMeta.inventory_periodic_due

  const orderHomeItems = useMemo(() => customerOrdersCare, [customerOrdersCare])

  const homeSectionVariant = (feeds: HomeSectionView['feeds']) => {
    if (feeds.supplier_deliveries || feeds.intake) return 'delivery' as const
    if (feeds.flower_care) return 'care' as const
    if (feeds.customer_orders) return 'orders' as const
    return 'more' as const
  }

  const homeSectionTaskCount = useCallback(
    (section: HomeSectionView): number => {
      const f = section.feeds ?? {}
      let n = section.custom_tasks?.length ?? 0
      if (f.supplier_deliveries) n += deliveryHomeItems.length
      if (f.intake) n += intakeHomeItems.length
      if (f.flower_care) n += careOnlyHomeItems.length
      if (f.customer_orders) n += orderHomeItems.length
      if (f.inventory && inventoryDue) n += 1
      if (f.expense_payments) n += expensePaymentTasks.length
      if (f.missing_sale_price) n += homeMoreItems.length
      return n
    },
    [
      deliveryHomeItems,
      intakeHomeItems,
      careOnlyHomeItems,
      orderHomeItems,
      inventoryDue,
      expensePaymentTasks,
      homeMoreItems,
    ],
  )

  const toggleHomeSection = (sectionId: number) => {
    const key = String(sectionId)
    setHomeSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleWarehouseSection = (key: WarehouseSectionKey) => {
    setWarehouseSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const hasUnderlyingHomeTasks = homeSections.length > 0

  const showWarehousePage = batches !== null && surface === 'warehouse'

  useEffect(() => {
    if (!showWarehousePage) return
    let cancelled = false
    void apiFetch('/api/me/flowers/')
      .then(async (res) => {
        if (!res.ok) return null
        return res.json() as Promise<{ flowers: { id: number }[] }>
      })
      .then((data) => {
        if (!cancelled) setStoreFlowerCatalog(data?.flowers ?? [])
      })
      .catch(() => {
        if (!cancelled) setStoreFlowerCatalog(null)
      })
    return () => {
      cancelled = true
    }
  }, [showWarehousePage, flowersCatalogReload])

  const warehouseFlowerLines = useMemo(
    () => buildWarehouseFlowerLines(batchesInStock),
    [batchesInStock],
  )

  const warehouseFlowerPositionCount = useMemo(() => {
    const lines = warehouseFlowerLines
    if (storeFlowerCatalog == null) return lines.length
    const catalogIds = new Set(storeFlowerCatalog.map((f) => f.id))
    const orphans = lines.filter(
      (line) => line.store_flower_id == null || !catalogIds.has(line.store_flower_id),
    )
    return storeFlowerCatalog.length + orphans.length
  }, [storeFlowerCatalog, warehouseFlowerLines])

  const wasteSelectedRow = useMemo(() => {
    if (!wasteSelectedKey) return null
    return batchesInStock.find((b) => stockActionKey(b) === wasteSelectedKey) ?? null
  }, [batchesInStock, wasteSelectedKey])

  const realizationByStoreFlower = useMemo(
    () => storeFlowerRealizationStock(batchesInStock),
    [batchesInStock],
  )

  const wasteMaxRealization = useMemo(() => {
    if (wasteAggregate?.maxRealizationQty != null && wasteAggregate.maxRealizationQty > 0) {
      return wasteAggregate.maxRealizationQty
    }
    if (wasteSelectedRetailProduct != null) {
      return wasteSelectedRetailProduct.realization_quantity ?? 0
    }
    if (wasteSelectedRow != null) {
      const direct = wasteSelectedRow.realization_quantity ?? 0
      if (direct > 0) return direct
      if (wasteSelectedRow.store_flower_id != null) {
        return realizationByStoreFlower.get(wasteSelectedRow.store_flower_id) ?? 0
      }
    }
    return 0
  }, [wasteAggregate, wasteSelectedRetailProduct, wasteSelectedRow, realizationByStoreFlower])

  const wasteDiscardBusy = Boolean(
    busyStockKey != null && wasteSelectedRow != null && busyStockKey === stockActionKey(wasteSelectedRow),
  )

  const wasteModalBusy = wasteDiscardBusy || wasteExtraBusy

  useEffect(() => {
    if (!wasteOpen) return
    setWasteQty('1')
    setWasteRealizationQty('0')
    if (wasteSelectedKey.startsWith('consumable:')) {
      setWasteMeters('')
    }
  }, [wasteOpen, wasteSelectedKey, wasteAggregate?.storeFlowerId])

  const receivedAtBad = useMemo(
    () => isReceivedAtInputBad(receivedDate, receivedTime),
    [receivedDate, receivedTime],
  )
  const receivedAtError = useMemo(
    () => receivedAtInputBadMessage(receivedDate, receivedTime),
    [receivedDate, receivedTime],
  )

  const closeSaleModal = () => {
    setSaleOpen(false)
    setSaleLines([newSaleModalLine()])
    setSaleFormError(null)
    setSaleInvalidField(null)
    setSalePaymentType(DEFAULT_PAYMENT_TYPE)
  }

  const openSaleModal = () => {
    setPageError(null)
    setSaleFormError(null)
    setSaleInvalidField(null)
    setSaleLines([newSaleModalLine()])
    setSalePaymentType(DEFAULT_PAYMENT_TYPE)
    setSaleOpen(true)
  }

  useEffect(() => {
    setOrderFormError(null)
    setOrderInvalidField(null)
  }, [
    orderLines,
    orderDeliveryServiceId,
    orderCustomerPhone,
    orderDeliveryAddress,
    orderScheduledDate,
    orderScheduledTime,
    orderPaymentType,
  ])

  const closeOrderModal = () => {
    setOrderOpen(false)
    setOrderLines([newSaleModalLine()])
    setOrderDeliveryServiceId('')
    setOrderCustomerPhone('')
    setOrderDeliveryAddress('')
    setOrderScheduledDate('')
    setOrderScheduledTime('')
    setOrderFormError(null)
    setOrderInvalidField(null)
    setOrderPaymentType(DEFAULT_PAYMENT_TYPE)
  }

  const openOrderModal = () => {
    setPageError(null)
    setOrderFormError(null)
    setOrderInvalidField(null)
    setOrderLines([newSaleModalLine()])
    setOrderDeliveryServiceId('')
    setOrderCustomerPhone('')
    setOrderDeliveryAddress('')
    setOrderScheduledDate('')
    setOrderScheduledTime('')
    setOrderPaymentType(DEFAULT_PAYMENT_TYPE)
    setOrderOpen(true)
  }

  const submitOrder = (e: FormEvent) => {
    e.preventDefault()
    if (!orderDeliveryServiceId) {
      setOrderFormError('Выберите сервис доставки.')
      setOrderInvalidField('service')
      return
    }
    const phoneDigits = digitsFromPhoneInput(orderCustomerPhone)
    if (phoneDigits.length < 11) {
      setOrderFormError('Укажите телефон клиента (11 цифр).')
      setOrderInvalidField('phone')
      return
    }
    const pickup = isOrderPickupDelivery(orderDeliveryServiceId)
    if (!pickup && !orderDeliveryAddress.trim()) {
      setOrderFormError('Укажите адрес доставки.')
      setOrderInvalidField('address')
      return
    }
    const scheduledCheck = validateScheduledAtInput(orderScheduledDate, orderScheduledTime)
    if (scheduledCheck.ok === false) {
      setOrderFormError(scheduledCheck.message)
      setOrderInvalidField('scheduled')
      return
    }
    const scheduledAt = combineLocalDateTimeDefaultToday(orderScheduledDate, orderScheduledTime)
    if (!scheduledAt) {
      setOrderFormError('Некорректная дата или время доставки.')
      setOrderInvalidField('scheduled')
      return
    }
    if (!orderPaymentType) {
      setOrderFormError('Выберите тип оплаты.')
      setOrderInvalidField('payment')
      return
    }
    if (!areAllSaleModalLinesComplete(orderLines, orderStockOptions, storeFlowerStockBySf)) {
      setOrderFormError('Заполните все позиции заказа.')
      setOrderInvalidField('lines')
      return
    }

    const apiLines: Record<string, unknown>[] = []
    for (let i = 0; i < orderLines.length; i++) {
      const row = orderLines[i]
      const line = orderStockOptions.find((o) => o.key === row.lineKey)
      if (!line) {
        setOrderFormError(`Строка ${i + 1}: выберите позицию.`)
        setOrderInvalidField('lines')
        return
      }
      const built = buildStockLineApiBody(line, row, storeFlowerStockBySf)
      if ('error' in built) {
        setOrderFormError(`Строка ${i + 1}: ${built.error}`)
        setOrderInvalidField('lines')
        return
      }
      apiLines.push(built)
    }

    setOrderBusy(true)
    setOrderFormError(null)
    setOrderInvalidField(null)
    void apiFetch('/api/me/stock/orders/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: apiLines,
        payment_type: orderPaymentType,
        ...(pickup
          ? { pickup_at_store: true }
          : {
              delivery_service_id: Number.parseInt(orderDeliveryServiceId, 10),
              delivery_address: orderDeliveryAddress.trim(),
            }),
        customer_phone: phoneDigits,
        scheduled_at: localDateTimeToIso(scheduledAt),
      }),
    })
      .then((res) => {
        if (!res.ok && isUpstreamErrorStatus(res.status)) return
        if (!res.ok) {
          return res.json().then(
            (j: { error?: string }) => {
              throw new Error(j.error ?? `Ошибка ${res.status}`)
            },
            () => {
              throw new Error(`Ошибка ${res.status}`)
            },
          )
        }
        return res.json()
      })
      .then((data) => {
        if (!data) return
        closeOrderModal()
        return load()
      })
      .catch((err: unknown) => {
        setOrderFormError(err instanceof Error ? err.message : 'Заказ не создан')
      })
      .finally(() => setOrderBusy(false))
  }

  const handoffOrder = async (orderId: number) => {
    setBusyOrderId(orderId)
    setPageError(null)
    try {
      const res = await apiFetch(`/api/me/stock/orders/${orderId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'handoff' }),
      })
      if (!res.ok && isUpstreamErrorStatus(res.status)) return
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `Ошибка ${res.status}`)
      }
      await load()
      if (isOwner && surface === 'home') {
        void fetchHomeSalesStats()
      }
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Передача курьеру не выполнена')
    } finally {
      setBusyOrderId(null)
    }
  }

  const completeHomeCustomTask = async (taskId: number) => {
    setBusyCustomTaskId(taskId)
    setPageError(null)
    try {
      const res = await apiFetch(`/api/me/home-tasks/custom/${taskId}/complete/`, { method: 'POST' })
      if (!res.ok && isUpstreamErrorStatus(res.status)) return
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? `Ошибка ${res.status}`)
      }
      const j = (await res.json()) as { home_sections?: HomeSectionView[] }
      if (j.home_sections) {
        setHomeSections(j.home_sections)
      }
      await load()
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : 'Не удалось отметить задачу')
    } finally {
      setBusyCustomTaskId(null)
    }
  }

  const closeWasteModal = () => {
    setWasteOpen(false)
    setWasteSelectedKey('')
    setWasteAggregate(null)
    setWasteBouquetCapQty(null)
    setWasteQty('1')
    setWasteRealizationQty('0')
    setWasteMeters('')
  }

  const openWasteModal = () => {
    setPageError(null)
    setWasteSelectedKey('')
    setWasteAggregate(null)
    setWasteQty('1')
    setWasteRealizationQty('0')
    setWasteMeters('')
    setWasteOpen(true)
  }

  const submitSale = async (e: FormEvent) => {
    e.preventDefault()
    if (!salePaymentType) {
      setSaleFormError('Выберите тип оплаты.')
      setSaleInvalidField('payment')
      return
    }
    const payloads: Record<string, unknown>[] = []
    for (let i = 0; i < saleLines.length; i++) {
      const row = saleLines[i]
      const line = saleStockOptions.find((o) => o.key === row.lineKey)
      const n = i + 1
      if (!line) {
        setSaleFormError(`Строка ${n}: выберите позицию.`)
        setSaleInvalidField('lines')
        return
      }
      if (line.kind !== 'custom_bouquet' && line.qty < 1) {
        setSaleFormError(`Строка ${n}: нет остатка.`)
        setSaleInvalidField('lines')
        return
      }
      const built = buildStockLineApiBody(line, row, storeFlowerStockBySf)
      if ('error' in built) {
        setSaleFormError(`Строка ${n}: ${built.error}`)
        setSaleInvalidField('lines')
        return
      }
      payloads.push({ ...built, payment_type: salePaymentType })
    }
    const withProduct = payloads.filter((p) => {
      return (
        p.batch_id != null ||
        p.store_flower_id != null ||
        p.bouquet_id != null ||
        p.retail_product_id != null ||
        Array.isArray(p.composition)
      )
    })
    if (withProduct.length < 1) {
      setSaleFormError('Добавьте хотя бы одну позицию с товаром.')
      setSaleInvalidField('lines')
      return
    }
    setSaleBusy(true)
    setSaleFormError(null)
    setSaleInvalidField(null)
    try {
      for (let i = 0; i < withProduct.length; i++) {
        const res = await apiFetch('/api/me/stock/sales/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withProduct[i]),
        })
        if (!res.ok && isUpstreamErrorStatus(res.status)) return
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? `Ошибка ${res.status}`)
        }
      }
      closeSaleModal()
      await load()
    } catch (err: unknown) {
      setSaleFormError(err instanceof Error ? err.message : 'Продажа не записана')
    } finally {
      setSaleBusy(false)
    }
  }

  const patchStockRow = (row: BatchRow, body: Record<string, unknown>) => {
    const key = stockActionKey(row)
    setBusyStockKey(key)
    setPageError(null)
    const url =
      row.line_kind === 'basic'
        ? `/api/me/stock/basic-care/${row.basic_care_id ?? row.id}/`
        : `/api/me/stock/batches/${row.id}/`
    return (async () => {
      try {
        const payload =
          row.line_kind === 'basic' && row.basic_batch_scope != null
            ? { ...body, basic_batch_scope: row.basic_batch_scope }
            : body
        const res = await apiFetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok && isUpstreamErrorStatus(res.status)) {
          return
        }
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? `Ошибка ${res.status}`)
        }
        await load()
      } catch (e: unknown) {
        setPageError(e instanceof Error ? e.message : 'Запрос не выполнен')
      } finally {
        setBusyStockKey(null)
      }
    })()
  }

  const patchBouquetRow = (row: BouquetRow, body: Record<string, unknown>) => {
    const key = bouquetActionKey(row)
    setBusyStockKey(key)
    setPageError(null)
    return (async () => {
      try {
        const res = await apiFetch(`/api/me/stock/bouquets/${row.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok && isUpstreamErrorStatus(res.status)) return
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? `Ошибка ${res.status}`)
        }
        await load()
      } catch (e: unknown) {
        setPageError(e instanceof Error ? e.message : 'Запрос не выполнен')
      } finally {
        setBusyStockKey(null)
      }
    })()
  }

  const openBouquetRecipe = () => {
    if (!isOwner) return
    setBouquetRecipeMode('add')
    setBouquetRecipeEditingId(null)
    setBouquetRecipeStockQty(0)
    setBouquetRecipeName('')
    setBouquetRecipePrice('')
    setBouquetRecipePhoto(null)
    setBouquetRecipePhotoUrl(null)
    setBouquetRecipeLines([newBouquetRecipeLine()])
    setBouquetConsumableLines([])
    setBouquetRecipeError(null)
    setBouquetRecipeInvalid(null)
    setBouquetRecipeOpen(true)
  }

  const openRetailAdd = () => {
    if (!isOwner) return
    setRetailModalMode('add')
    setRetailEditingId(null)
    setRetailModalInitial({ name: '', photoPreviewUrl: null, unitPrice: '' })
    setRetailModalError(null)
    setRetailModalOpen(true)
  }

  const openRetailEdit = (row: RetailProductRow) => {
    if (!isOwner) return
    setRetailModalMode('edit')
    setRetailEditingId(row.id)
    setRetailModalInitial({
      name: row.name,
      photoPreviewUrl: row.photo_url ? mediaUrl(row.photo_url) : null,
      unitPrice: retailProductUnitPriceDraft(row.unit_price),
    })
    setRetailModalError(null)
    setRetailModalOpen(true)
  }

  const submitRetailModal = async (values: {
    name: string
    photoFile: File | null
    unitPrice: string
  }) => {
    const priceParsed = parseMoneyInput(values.unitPrice)
    if (priceParsed === 'bad') {
      setRetailModalError('Некорректная цена продажи')
      return
    }

    setRetailModalBusy(true)
    setRetailModalError(null)
    try {
      if (retailModalMode === 'add') {
        const res = await apiFetch('/api/me/stock/retail/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values.name }),
        })
        if (!res.ok && isUpstreamErrorStatus(res.status)) {
          setRetailModalError('Сервис временно недоступен.')
          return
        }
        const j = (await res.json().catch(() => ({}))) as { product?: { id?: number }; error?: string }
        if (!res.ok) {
          setRetailModalError(j.error ?? `Ошибка ${res.status}`)
          return
        }
        const productId = j.product?.id
        if (values.photoFile && productId != null) {
          const fd = new FormData()
          fd.append('photo', values.photoFile)
          const up = await apiFetch(`/api/me/stock/retail/${productId}/photo/`, { method: 'POST', body: fd })
          if (!up.ok) {
            const uj = (await up.json().catch(() => ({}))) as { error?: string }
            setRetailModalError(uj.error ?? `Фото не загружено (${up.status})`)
            return
          }
        }
        if (productId != null && priceParsed != null) {
          const pr = await apiFetch('/api/me/stock/prices/', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ retail_product_id: productId, unit_price: priceParsed }),
          })
          const pj = (await pr.json().catch(() => ({}))) as { error?: string }
          if (!pr.ok) {
            setRetailModalError(pj.error ?? `Цена не сохранена (${pr.status})`)
            return
          }
        }
      } else if (retailEditingId != null) {
        const res = await apiFetch(`/api/me/stock/retail/${retailEditingId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: values.name,
            unit_price: priceParsed,
          }),
        })
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          setRetailModalError(j.error ?? `Ошибка ${res.status}`)
          return
        }
        if (values.photoFile) {
          const fd = new FormData()
          fd.append('photo', values.photoFile)
          const up = await apiFetch(`/api/me/stock/retail/${retailEditingId}/photo/`, { method: 'POST', body: fd })
          if (!up.ok) {
            const uj = (await up.json().catch(() => ({}))) as { error?: string }
            setRetailModalError(uj.error ?? `Фото не загружено (${up.status})`)
            return
          }
        }
      }
      setRetailCatalogReload((n) => n + 1)
      await load()
      setRetailModalOpen(false)
    } catch (err: unknown) {
      setRetailModalError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setRetailModalBusy(false)
    }
  }

  const removeRetailProduct = () => {
    if (retailEditingId == null) return
    const id = retailEditingId
    const row = retailProducts.find((p) => p.id === id)
    const label = row?.name ?? 'товар'
    askDeleteConfirm({
      title: `Удалить «${label}»?`,
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        setRetailModalBusy(true)
        setRetailModalError(null)
        try {
          const res = await apiFetch(`/api/me/stock/retail/${id}/`, { method: 'DELETE' })
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          if (!res.ok) {
            setRetailModalError(j.error ?? `Ошибка ${res.status}`)
            return
          }
          setRetailCatalogReload((n) => n + 1)
          await load()
          setRetailModalOpen(false)
        } finally {
          setRetailModalBusy(false)
        }
      },
    })
  }

  const openConsumableAdd = () => {
    if (!isOwner) return
    setConsumableModalMode('add')
    setConsumableEditingId(null)
    setConsumableModalInitial({ name: '', unitKind: 'meter', photoPreviewUrl: null })
    setConsumableModalError(null)
    setConsumableModalOpen(true)
  }

  const openConsumableEdit = (row: ConsumableRow) => {
    if (!isOwner) return
    setConsumableModalMode('edit')
    setConsumableEditingId(row.id)
    setConsumableModalInitial({
      name: row.name,
      unitKind: row.unit_kind,
      photoPreviewUrl: row.photo_url ? mediaUrl(row.photo_url) : null,
    })
    setConsumableModalError(null)
    setConsumableModalOpen(true)
  }

  const openConsumableIntake = (row: ConsumableRow) => {
    if (!isOwner) return
    setConsumableIntakeRow(row)
    setConsumableIntakeError(null)
    setConsumableIntakeOpen(true)
  }

  const submitConsumableModal = async (values: {
    name: string
    unitKind: ConsumableEntryInitial['unitKind']
    photoFile: File | null
  }) => {
    setConsumableModalBusy(true)
    setConsumableModalError(null)
    const payload = {
      name: values.name,
      unit_kind: values.unitKind,
    }
    try {
      if (consumableModalMode === 'add') {
        const res = await apiFetch('/api/me/stock/consumables/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const j = (await res.json().catch(() => ({}))) as {
          consumable?: { id?: number }
          error?: string
        }
        if (!res.ok) {
          setConsumableModalError(j.error ?? `Ошибка ${res.status}`)
          return
        }
        const id = j.consumable?.id
        if (values.photoFile && id != null) {
          const fd = new FormData()
          fd.append('photo', values.photoFile)
          const up = await apiFetch(`/api/me/stock/consumables/${id}/photo/`, { method: 'POST', body: fd })
          if (!up.ok) {
            const uj = (await up.json().catch(() => ({}))) as { error?: string }
            setConsumableModalError(uj.error ?? `Фото не загружено (${up.status})`)
            return
          }
        }
      } else if (consumableEditingId != null) {
        const res = await apiFetch(`/api/me/stock/consumables/${consumableEditingId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) {
          setConsumableModalError(j.error ?? `Ошибка ${res.status}`)
          return
        }
        if (values.photoFile) {
          const fd = new FormData()
          fd.append('photo', values.photoFile)
          const up = await apiFetch(`/api/me/stock/consumables/${consumableEditingId}/photo/`, {
            method: 'POST',
            body: fd,
          })
          if (!up.ok) {
            const uj = (await up.json().catch(() => ({}))) as { error?: string }
            setConsumableModalError(uj.error ?? `Фото не загружено (${up.status})`)
            return
          }
        }
      }
      setConsumablesCatalogReload((n) => n + 1)
      await load()
      setConsumableModalOpen(false)
    } catch (err: unknown) {
      setConsumableModalError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setConsumableModalBusy(false)
    }
  }

  const removeConsumable = () => {
    if (consumableEditingId == null) return
    const id = consumableEditingId
    const row = consumables.find((c) => c.id === id)
    const label = row?.name ?? 'расходник'
    askDeleteConfirm({
      title: `Удалить «${label}»?`,
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        setConsumableModalBusy(true)
        setConsumableModalError(null)
        try {
          const res = await apiFetch(`/api/me/stock/consumables/${id}/`, { method: 'DELETE' })
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          if (!res.ok) {
            setConsumableModalError(j.error ?? `Ошибка ${res.status}`)
            return
          }
          setConsumablesCatalogReload((n) => n + 1)
          await load()
          setConsumableModalOpen(false)
        } finally {
          setConsumableModalBusy(false)
        }
      },
    })
  }

  const submitConsumableIntake = async (values: {
    packSize: string
    rollsCount: string
    unitCost: string
  }) => {
    if (consumableIntakeRow == null) return
    const packNum = Number.parseFloat(values.packSize.replace(',', '.'))
    if (!Number.isFinite(packNum) || packNum <= 0) {
      setConsumableIntakeError(consumablePackVolumeRequiredError(consumableIntakeRow.unit_kind))
      return
    }
    const rolls = Number.parseInt(values.rollsCount.trim(), 10)
    if (!Number.isFinite(rolls) || rolls < 1) {
      setConsumableIntakeError(consumablePackCountRequiredError(consumableIntakeRow.unit_kind))
      return
    }
    const unitCost = parseMoneyInput(values.unitCost)
    if (unitCost === 'bad' || unitCost == null) {
      setConsumableIntakeError(consumablePriceRequiredError(consumableIntakeRow.unit_kind))
      return
    }

    setConsumableIntakeBusy(true)
    setConsumableIntakeError(null)
    try {
      const res = await apiFetch(`/api/me/stock/consumables/${consumableIntakeRow.id}/intake/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pack_size: String(packNum),
          rolls_count: rolls,
          unit_cost: String(unitCost),
        }),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setConsumableIntakeError(j.error ?? `Ошибка ${res.status}`)
        return
      }
      setConsumablesCatalogReload((n) => n + 1)
      await load()
      setConsumableIntakeOpen(false)
    } catch (err: unknown) {
      setConsumableIntakeError(err instanceof Error ? err.message : 'Приход не выполнен')
    } finally {
      setConsumableIntakeBusy(false)
    }
  }

  const openBouquetEdit = (row: BouquetRow) => {
    if (!isOwner) return
    setBouquetRecipeMode('edit')
    setBouquetRecipeEditingId(row.id)
    setBouquetRecipeStockQty(row.quantity)
    setBouquetRecipeName(row.name)
    setBouquetRecipePrice(bouquetUnitPriceDraft(row.unit_price))
    setBouquetRecipePhoto(null)
    setBouquetRecipePhotoUrl(row.photo_url ? mediaUrl(row.photo_url) : null)
    const flowerRows = recipeLinesToTaxonRows(row.recipe_lines)
    const consumableRows = consumableRecipeLinesToTaxonRows(row.consumable_recipe_lines ?? [])
    setBouquetRecipeLines(
      flowerRows.length > 0 ? flowerRows : consumableRows.length === 0 ? [newBouquetRecipeLine()] : [],
    )
    setBouquetConsumableLines(consumableRows)
    setBouquetRecipeError(null)
    setBouquetRecipeInvalid(null)
    setBouquetRecipeOpen(true)
  }

  const openBouquetDiscard = (row: BouquetRow) => {
    if (!isOwner || row.quantity < 1) return
    setPageError(null)
    setWasteAggregate(null)
    setWasteSelectedKey(`bouquet:${row.id}`)
    setWasteBouquetCapQty(row.quantity)
    setWasteQty('1')
    setWasteOpen(true)
  }

  const submitBouquetRecipe = (e: FormEvent) => {
    e.preventDefault()
    const name = bouquetRecipeName.trim()
    if (!name) {
      setBouquetRecipeError('Укажите название букета.')
      setBouquetRecipeInvalid('name')
      return
    }
    const priceParsed = parseMoneyInput(bouquetRecipePrice)
    if (priceParsed === 'bad') {
      setBouquetRecipeError('Некорректная цена продажи.')
      setBouquetRecipeInvalid('price')
      return
    }
    const body: Record<string, unknown> = { name }
    if (bouquetRecipeMode === 'add' || bouquetRecipeMode === 'edit') {
      const validated = validateBouquetRecipeLines(bouquetRecipeLines, bouquetConsumableLines)
      if (!validated.ok) {
        setBouquetRecipeError(validated.error)
        setBouquetRecipeInvalid('lines')
        return
      }
      body.lines = validated.flowerLines
      body.consumable_lines = validated.consumableLines
    }
    if (priceParsed != null && priceParsed > 0) {
      body.unit_price = priceParsed
    } else if (bouquetRecipeMode === 'edit') {
      body.unit_price = 0
    }

    setBouquetRecipeBusy(true)
    setBouquetRecipeError(null)
    setBouquetRecipeInvalid(null)
    const url =
      bouquetRecipeMode === 'edit' && bouquetRecipeEditingId != null
        ? `/api/me/stock/bouquets/${bouquetRecipeEditingId}/`
        : '/api/me/stock/bouquets/'
    const method = bouquetRecipeMode === 'edit' ? 'PATCH' : 'POST'
    void apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok && isUpstreamErrorStatus(res.status)) return
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? `Ошибка ${res.status}`)
        }
        const data = (await res.json()) as { bouquet?: { id: number } }
        const bouquetId = bouquetRecipeMode === 'edit' ? bouquetRecipeEditingId : data.bouquet?.id
        if (bouquetRecipePhoto && bouquetId) {
          const fd = new FormData()
          fd.append('photo', bouquetRecipePhoto)
          await apiFetch(`/api/me/stock/bouquets/${bouquetId}/photo/`, { method: 'POST', body: fd })
        }
        setBouquetRecipeOpen(false)
        await load()
      })
      .catch((err: unknown) => {
        setBouquetRecipeError(err instanceof Error ? err.message : 'Не удалось сохранить букет')
      })
      .finally(() => setBouquetRecipeBusy(false))
  }

  const removeBouquetRecipe = () => {
    if (bouquetRecipeEditingId == null) return
    const id = bouquetRecipeEditingId
    const row = bouquets.find((b) => b.id === id)
    const label = row?.name ?? 'букет'
    askDeleteConfirm({
      title: `Удалить «${label}»?`,
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        setBouquetRecipeBusy(true)
        setBouquetRecipeError(null)
        try {
          const res = await apiFetch(`/api/me/stock/bouquets/${id}/`, { method: 'DELETE' })
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          if (!res.ok) {
            setBouquetRecipeError(j.error ?? `Ошибка ${res.status}`)
            return
          }
          setBouquetRecipeOpen(false)
          await load()
        } catch (err: unknown) {
          setBouquetRecipeError(err instanceof Error ? err.message : 'Не удалось удалить букет')
        } finally {
          setBouquetRecipeBusy(false)
        }
      },
    })
  }

  const openBouquetAssemble = () => {
    if (!isOwner) return
    setBouquetAssembleId('')
    setBouquetAssembleQty('1')
    setBouquetAssembleError(null)
    setBouquetAssembleInvalid(null)
    setBouquetAssembleOpen(true)
  }

  const submitBouquetAssemble = (e: FormEvent) => {
    e.preventDefault()
    if (bouquetAssembleId === '') {
      setBouquetAssembleError('Выберите букет.')
      setBouquetAssembleInvalid('bouquet')
      return
    }
    const selected = bouquets.find((b) => b.id === bouquetAssembleId)
    if (
      !selected ||
      (selected.recipe_lines.length === 0 && (selected.consumable_recipe_lines?.length ?? 0) === 0)
    ) {
      setBouquetAssembleError('У букета нет состава.')
      setBouquetAssembleInvalid('bouquet')
      return
    }
    const bouquetCount = bouquetAssembleCount
    if (bouquetCount < 1) {
      setBouquetAssembleError('Количество букетов — целое число не меньше 1.')
      setBouquetAssembleInvalid('qty')
      return
    }
    for (const rl of selected.recipe_lines) {
      const needTotal = rl.quantity * bouquetCount
      const stock = storeFlowerStockBySf.get(rl.store_flower_id)
      const available = stock?.available ?? 0
      if (needTotal > available) {
        const total = stock?.total ?? 0
        const onReal = stock?.realization ?? 0
        setBouquetAssembleError(
          `«${rl.display_name}»: нужно ${needTotal} шт., доступно ${available} шт. (на складе ${total}, на реализации ${onReal}).`,
        )
        setBouquetAssembleInvalid('lines')
        return
      }
    }
    for (const rl of selected.consumable_recipe_lines ?? []) {
      const per = parseConsumableMeters(rl.quantity) ?? 0
      const needTotal = per * bouquetCount
      const available = consumableStockById.get(rl.consumable_id) ?? 0
      if (needTotal > available) {
        setBouquetAssembleError(
          `«${rl.display_name}»: нужно ${needTotal} ${rl.unit_label}, на складе ${available} ${rl.unit_label}.`,
        )
        setBouquetAssembleInvalid('lines')
        return
      }
    }

    const body: Record<string, unknown> = {
      bouquet_id: bouquetAssembleId,
      quantity: bouquetCount,
    }

    setBouquetAssembleBusy(true)
    setBouquetAssembleError(null)
    setBouquetAssembleInvalid(null)
    void apiFetch('/api/me/stock/bouquets/assemble/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok && isUpstreamErrorStatus(res.status)) return
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? `Ошибка ${res.status}`)
        }
        setBouquetAssembleOpen(false)
        await load()
      })
      .catch((err: unknown) => {
        setBouquetAssembleError(err instanceof Error ? err.message : 'Не удалось собрать букет')
      })
      .finally(() => setBouquetAssembleBusy(false))
  }

  useEffect(() => {
    if (!bouquetRecipePhoto) {
      setBouquetRecipePhotoUrl(null)
      return
    }
    const url = URL.createObjectURL(bouquetRecipePhoto)
    setBouquetRecipePhotoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [bouquetRecipePhoto])

  useEffect(() => {
    setBouquetAssembleError(null)
    setBouquetAssembleInvalid(null)
  }, [bouquetAssembleId, bouquetAssembleQty])

  const confirmWasteDiscard = () => {
    if (wasteSelectedConsumable != null) {
      const metersNum = Number.parseFloat(wasteMeters.replace(',', '.'))
      const maxM = parseConsumableMeters(wasteSelectedConsumable.meters_balance) ?? 0
      if (!Number.isFinite(metersNum) || metersNum <= 0 || metersNum > maxM || maxM <= 0) return
      setWasteExtraBusy(true)
      setPageError(null)
      void apiFetch(`/api/me/stock/consumables/${wasteSelectedConsumable.id}/discard/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meters: String(metersNum) }),
      })
        .then(async (res) => {
          if (!res.ok && isUpstreamErrorStatus(res.status)) return
          if (!res.ok) {
            const j = (await res.json().catch(() => ({}))) as { error?: string }
            throw new Error(j.error ?? `Ошибка ${res.status}`)
          }
          closeWasteModal()
          return load()
        })
        .catch((e: unknown) => {
          setPageError(e instanceof Error ? e.message : 'Списание не выполнено')
        })
        .finally(() => setWasteExtraBusy(false))
      return
    }
    const qty = Number.parseInt(wasteQty.trim(), 10)
    const max =
      wasteAggregate?.maxQty ??
      wasteBouquetCapQty ??
      wasteSelectedBouquet?.quantity ??
      wasteSelectedRetailProduct?.quantity ??
      wasteSelectedRow?.quantity ??
      0
    if (!Number.isFinite(qty) || qty < 1 || qty > max || max < 1) return
    const maxRealization = wasteMaxRealization
    const rqTrim = wasteRealizationQty.trim()
    const rq = rqTrim === '' ? 0 : Number.parseInt(rqTrim, 10)
    if (maxRealization > 0) {
      const rqErr = validateDiscardRealizationQty(qty, rq, maxRealization, max)
      if (rqErr) {
        setPageError(rqErr)
        return
      }
    }
    const realizationBody =
      maxRealization > 0 ? { realization_quantity: rq } : {}
    if (wasteAggregate != null) {
      setWasteExtraBusy(true)
      setPageError(null)
      void apiFetch(`/api/me/stock/store-flowers/${wasteAggregate.storeFlowerId}/discard/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty, ...realizationBody }),
      })
        .then(async (res) => {
          if (!res.ok && isUpstreamErrorStatus(res.status)) return
          if (!res.ok) {
            const j = (await res.json().catch(() => ({}))) as { error?: string }
            throw new Error(j.error ?? `Ошибка ${res.status}`)
          }
          closeWasteModal()
          return load()
        })
        .catch((e: unknown) => {
          setPageError(e instanceof Error ? e.message : 'Списание не выполнено')
        })
        .finally(() => setWasteExtraBusy(false))
      return
    }
    if (wasteSelectedBouquet != null) {
      setWasteExtraBusy(true)
      setPageError(null)
      void apiFetch(`/api/me/stock/bouquets/${wasteSelectedBouquet.id}/discard/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty }),
      })
        .then(async (res) => {
          if (!res.ok && isUpstreamErrorStatus(res.status)) return
          if (!res.ok) {
            const j = (await res.json().catch(() => ({}))) as { error?: string }
            throw new Error(j.error ?? `Ошибка ${res.status}`)
          }
          closeWasteModal()
          return load()
        })
        .catch((e: unknown) => {
          setPageError(e instanceof Error ? e.message : 'Списание не выполнено')
        })
        .finally(() => setWasteExtraBusy(false))
      return
    }
    if (wasteSelectedRetailProduct != null) {
      setWasteExtraBusy(true)
      setPageError(null)
      void apiFetch(`/api/me/stock/retail/${wasteSelectedRetailProduct.id}/discard/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty, ...realizationBody }),
      })
        .then(async (res) => {
          if (!res.ok && isUpstreamErrorStatus(res.status)) return
          if (!res.ok) {
            const j = (await res.json().catch(() => ({}))) as { error?: string }
            throw new Error(j.error ?? `Ошибка ${res.status}`)
          }
          closeWasteModal()
          return load()
        })
        .catch((e: unknown) => {
          setPageError(e instanceof Error ? e.message : 'Списание не выполнено')
        })
        .finally(() => setWasteExtraBusy(false))
      return
    }
    if (wasteSelectedRow == null) return
    void patchStockRow(wasteSelectedRow, {
      action: 'discard_batch',
      discard_quantity: qty,
      ...realizationBody,
    }).finally(() => {
      closeWasteModal()
    })
  }

  const patchSupplierDelivery = (
    deliveryId: number,
    body: Record<string, unknown>,
    opts?: { pageError?: boolean },
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    setBusyDeliveryId(deliveryId)
    if (opts?.pageError !== false) setPageError(null)
    return (async (): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const res = await apiFetch(`/api/me/stock/supplier-deliveries/${deliveryId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok && isUpstreamErrorStatus(res.status)) {
          const fail = { ok: false as const, error: 'Сервис временно недоступен.' }
          if (opts?.pageError !== false) setPageError(fail.error)
          return fail
        }
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          const fail = { ok: false as const, error: j.error ?? `Ошибка ${res.status}` }
          if (opts?.pageError !== false) setPageError(fail.error)
          return fail
        }
        await load()
        return { ok: true as const }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Запрос не выполнен'
        if (opts?.pageError !== false) setPageError(msg)
        return { ok: false as const, error: msg }
      } finally {
        setBusyDeliveryId(null)
      }
    })()
  }

  const createBatch = (e: FormEvent) => {
    e.preventDefault()
    const bodyLines: Record<string, unknown>[] = []
    const consumableIntakes: { id: number; pack_size: string; rolls_count: number; unit_cost: string }[] = []
    for (const ln of batchLines) {
      if (!ln.taxon) continue
      if (isConsumableStockHit(ln.taxon)) {
        const packNum = Number.parseFloat((ln.packSize ?? '').replace(',', '.'))
        if (!Number.isFinite(packNum) || packNum <= 0) {
          setIntakeFormError(`Для расходника: ${consumablePackVolumeRequiredError(ln.taxon.unit_kind)}`)
          setIntakeInvalidField('lines')
          return
        }
        const rolls = Number.parseInt((ln.rollsCount ?? '1').trim(), 10)
        if (!Number.isFinite(rolls) || rolls < 1) {
          setIntakeFormError(`Для расходника: ${consumablePackCountRequiredError(ln.taxon.unit_kind)}`)
          setIntakeInvalidField('lines')
          return
        }
        const uc = parseMoneyInput(ln.unitCost ?? '')
        if (uc === null || uc === 'bad') {
          setIntakeFormError(`Для расходника: ${consumablePriceRequiredError(ln.taxon.unit_kind)}`)
          setIntakeInvalidField('lines')
          return
        }
        consumableIntakes.push({
          id: ln.taxon.consumable_id,
          pack_size: String(packNum),
          rolls_count: rolls,
          unit_cost: String(uc),
        })
        continue
      }
      const quantity = Number.parseInt(ln.qty.trim(), 10)
      if (!Number.isFinite(quantity) || quantity < 1) {
        setIntakeFormError('В каждой заполненной строке количество — целое число не меньше 1.')
        setIntakeInvalidField('lines')
        return
      }
      const uc = parseMoneyInput(ln.unitCost)
      if (uc === null) {
        setIntakeFormError('В каждой заполненной строке укажите цену за штуку, ₽.')
        setIntakeInvalidField('lines')
        return
      }
      if (uc === 'bad') {
        setIntakeFormError('Цена за штуку: неотрицательное число, можно с копейками (запятая или точка).')
        setIntakeInvalidField('lines')
        return
      }
      const termsErr = validateRealizationLine(ln, quantity)
      if (termsErr) {
        setIntakeFormError(termsErr)
        setIntakeInvalidField('lines')
        return
      }
      const terms = realizationPayloadFromLine(ln)
      if (isRetailStockHit(ln.taxon)) {
        bodyLines.push({
          retail_product_id: ln.taxon.retail_product_id,
          quantity,
          unit_cost: uc,
          ...terms,
        })
      } else if (isFlowerStockHit(ln.taxon)) {
        bodyLines.push({
          store_flower_id: ln.taxon.store_flower_id ?? ln.taxon.id,
          quantity,
          unit_cost: uc,
          ...terms,
        })
      }
    }
    if (bodyLines.length === 0 && consumableIntakes.length === 0) {
      setIntakeFormError('Добавьте хотя бы одну позицию.')
      setIntakeInvalidField('lines')
      return
    }
    const recvCheck = validateReceivedAtInput(receivedDate, receivedTime)
    if (recvCheck.ok === false) {
      setIntakeFormError(null)
      setIntakeInvalidField('received')
      return
    }

    const body: Record<string, unknown> = { lines: bodyLines }
    const dPart = receivedDate.trim()
    if (dPart) {
      const dt = combineLocalDateTime(dPart, receivedTime)
      if (!dt || Number.isNaN(dt.getTime())) {
        setIntakeFormError('Проверьте дату и время прихода.')
        setIntakeInvalidField('received')
        return
      }
      body.received_at = dt.toISOString()
    }
    setCreating(true)
    setIntakeFormError(null)
    setIntakeInvalidField(null)

    const postBatch =
      bodyLines.length > 0
        ? apiFetch('/api/me/stock/batches/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }).then(async (res) => {
            if (!res.ok && isUpstreamErrorStatus(res.status)) return
            if (!res.ok) {
              const j = (await res.json().catch(() => ({}))) as { error?: string }
              throw new Error(j.error ?? `Ошибка ${res.status}`)
            }
          })
        : Promise.resolve()

    const postConsumables = Promise.all(
      consumableIntakes.map((row) =>
        apiFetch(`/api/me/stock/consumables/${row.id}/intake/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pack_size: row.pack_size,
            rolls_count: row.rolls_count,
            unit_cost: row.unit_cost,
          }),
        }).then(async (res) => {
          if (!res.ok && isUpstreamErrorStatus(res.status)) return
          if (!res.ok) {
            const j = (await res.json().catch(() => ({}))) as { error?: string }
            throw new Error(j.error ?? `Ошибка ${res.status}`)
          }
        }),
      ),
    )

    void Promise.all([postBatch, postConsumables])
      .then(() => {
        closeModal()
        return load()
      })
      .catch((err: unknown) => {
        setIntakeFormError(err instanceof Error ? err.message : 'Не удалось создать партию')
        setIntakeInvalidField(null)
      })
      .finally(() => setCreating(false))
  }

  const catalogFlowerNav = useMemo(
    () => catalogNavState(surface === 'warehouse' ? '/warehouse' : '/')!,
    [surface],
  )

  const renderBatchCard = (row: BatchRow) => (
    <BatchMiniCard
      row={row}
      busy={busyStockKey === stockActionKey(row)}
      warehouseMode={stockMeta.warehouse_mode}
      catalogFlowerNav={catalogFlowerNav}
      onPatch={(action) => void patchStockRow(row, { action })}
      showStockDiscard={isOwner}
      onRequestStockDiscard={() => {
        setWasteAggregate(null)
        setWasteSelectedKey(stockActionKey(row))
        setWasteQty('1')
        setWasteOpen(true)
      }}
    />
  )

  const warehouseFlowersCatalogPanel = useMemo(
    () => (
      <WarehouseFlowersCatalog
        stockLines={warehouseFlowerLines}
        stockBatches={batchesInStock}
        warehouseMode={stockMeta.warehouse_mode}
        catalogFlowerNav={catalogFlowerNav}
        showIntakeHint={isOwner}
        reloadToken={flowersCatalogReload}
        onOpenFlowerEdit={isOwner ? flowerEditor.openEdit : undefined}
        onOpenFlowerAdd={isOwner ? flowerEditor.openAdd : undefined}
        onOpenFlowerStockDiscard={isOwner ? openFlowerStockDiscard : undefined}
      />
    ),
    [
      warehouseFlowerLines,
      batchesInStock,
      stockMeta.warehouse_mode,
      catalogFlowerNav,
      isOwner,
      flowersCatalogReload,
      flowerEditor.openEdit,
      flowerEditor.openAdd,
      openFlowerStockDiscard,
    ],
  )

  const renderBouquetCard = (row: BouquetRow) => (
    <BouquetMiniCard
      row={row}
      busy={busyStockKey === bouquetActionKey(row)}
      warehouseMode={stockMeta.warehouse_mode}
      catalogFlowerNav={catalogFlowerNav}
      showStockDiscard={isOwner}
      onRequestStockDiscard={() => openBouquetDiscard(row)}
      onPatch={(action, batchId) => {
        const body: Record<string, unknown> = { action }
        if (row.assembly_id != null) body.assembly_id = row.assembly_id
        else if (batchId != null) body.batch_id = batchId
        void patchBouquetRow(row, body)
      }}
    />
  )

  const renderDeliveryCard = (row: SupplierDeliveryCareRow, compact = false) => (
    <SupplierDeliveryCareCard
      row={row}
      compact={compact}
      busy={busyDeliveryId === row.id}
      onOpenReceive={setReceiveDeliveryRow}
    />
  )

  const renderOrderCard = (row: CustomerOrderCareRow) => (
    <CustomerOrderCareCard
      row={row}
      busy={busyOrderId === row.id}
      onHandoff={(id) => void handoffOrder(id)}
    />
  )

  const renderHomeMergedItem = (item: HomeMergedItem) => (
    <BatchGridCardItem
      key={
        item.kind === 'delivery'
          ? `d-${item.row.id}`
          : item.kind === 'batch'
            ? stockActionKey(item.row)
            : bouquetActionKey(item.row)
      }
      exitIntent={
        item.kind === 'batch'
          ? leavingCareRows.has(stockActionKey(item.row)) ||
            syncDroppedRows.has(stockActionKey(item.row))
          : false
      }
    >
      {item.kind === 'delivery'
        ? renderDeliveryCard(item.row)
        : item.kind === 'batch'
          ? renderBatchCard(item.row)
          : renderBouquetCard(item.row)}
    </BatchGridCardItem>
  )

  const renderHomeMoreItem = (item: HomeMoreItem) => (
    <BatchGridCardItem
      key={
        item.kind === 'custom'
          ? `m-cust-${item.task.id}`
          : item.kind === 'batch'
            ? `m-b-${item.row.id}`
            : item.kind === 'retail'
              ? `m-r-${item.row.id}`
              : item.kind === 'expense'
                ? `m-exp-${item.task.expense_id}`
                : 'm-inventory'
      }
      exitIntent={false}
    >
      {item.kind === 'custom' ? (
        <HomeCustomTaskCard
          task={item.task}
          busy={busyCustomTaskId === item.task.id}
          onComplete={completeHomeCustomTask}
        />
      ) : item.kind === 'batch' ? (
        <HomeBatchSetPriceTaskCard row={item.row} catalogFlowerNav={catalogFlowerNav} />
      ) : item.kind === 'retail' ? (
        <HomeRetailSetPriceTaskCard row={item.row} />
      ) : item.kind === 'expense' ? (
        <HomeExpensePaymentTaskCard task={item.task} />
      ) : (
        <InventoryCareCard intervalDays={stockMeta.inventory_interval_days} fromPath="/" />
      )}
    </BatchGridCardItem>
  )

  const renderHomeSectionBlock = (section: HomeSectionView) => {
    const feeds = section.feeds ?? {}
    const count = homeSectionTaskCount(section)

    const mergedItems: HomeMergedItem[] = []
    if (feeds.supplier_deliveries) mergedItems.push(...deliveryHomeItems)
    if (feeds.intake) mergedItems.push(...intakeHomeItems)
    if (feeds.flower_care) mergedItems.push(...careOnlyHomeItems)

    const moreItems: HomeMoreItem[] = []
    if (feeds.inventory && inventoryDue) moreItems.push({ kind: 'inventory' })
    if (feeds.expense_payments) {
      for (const task of expensePaymentTasks) {
        moreItems.push({ kind: 'expense', task })
      }
    }
    if (feeds.missing_sale_price) moreItems.push(...homeMoreItems)
    for (const task of section.custom_tasks ?? []) {
      moreItems.push({ kind: 'custom', task })
    }

    const orderItems = feeds.customer_orders ? orderHomeItems : []
    const listLen = mergedItems.length + orderItems.length + moreItems.length
    const sectionOpenKey = String(section.id)

    return (
      <HomeTaskBlock
        key={section.id}
        sectionKey={sectionOpenKey}
        variant={homeSectionVariant(feeds)}
        title={section.name}
        taskCount={count}
        expanded={homeSectionsOpen[sectionOpenKey] ?? false}
        onToggle={() => toggleHomeSection(section.id)}
        content={
          listLen === 0 ? (
            <p className="crm-tasks-block__empty">Нет активных</p>
          ) : (
            <ul className="crm-batch-grid crm-batch-grid--home-tasks">
              {mergedItems.map((item) => renderHomeMergedItem(item))}
              {orderItems.map((row) => (
                <BatchGridCardItem key={`o-${row.id}`} exitIntent={false}>
                  {renderOrderCard(row)}
                </BatchGridCardItem>
              ))}
              {moreItems.map((item) => renderHomeMoreItem(item))}
            </ul>
          )
        }
      />
    )
  }

  const confirmReceiveDelivery = async (
    lines: SupplierDeliveryReceiveLinePayload[],
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (receiveDeliveryRow == null) {
      return { ok: false, error: 'Поставка не выбрана.' }
    }
    const result = await patchSupplierDelivery(
      receiveDeliveryRow.id,
      { action: 'receive_delivery', lines },
      { pageError: false },
    )
    if (result.ok) {
      setReceiveDeliveryRow(null)
    }
    return result
  }

  return (
    <div className="flowers-page warehouse-page warehouse-crm warehouse-crm--minimal">
      <div className="crm-shell">
        <CrmPageHeader
          surface={surface}
          batchesLoaded={batches !== null}
          showHomeSalesStats={isOwner}
          homeSalesDay={homeSalesDay}
          hasSaleStock={hasSaleStock}
          hasOrderStock={hasOrderStock}
          hasDiscardableStock={
            batchesInStock.length > 0 ||
            retailForSale.length > 0 ||
            bouquetsForDiscard.length > 0 ||
            consumablesForDiscard.length > 0
          }
          onOpenSupplierDelivery={isOwner ? () => setSupplierDeliveryOpen(true) : () => {}}
          onOpenIntake={openModal}
          onOpenRetailProduct={openRetailAdd}
          onOpenBouquetAssemble={isOwner ? openBouquetAssemble : undefined}
          onOpenSale={openSaleModal}
          onOpenOrder={openOrderModal}
          onOpenWaste={openWasteModal}
          showSupplierDelivery={isOwner}
          showStockReceivingActions={isOwner}
          showHeaderRetailProduct={surface !== 'warehouse'}
        />


        {pageError ? (
          <div className="crm-alert" role="alert">
            {pageError}
          </div>
        ) : null}

        {batches === null && !pageError ? <CrmSkeleton /> : null}

        {batches &&
        batches.length === 0 &&
        retailProducts.length === 0 &&
        supplierDeliveryCare.length === 0 &&
        surface !== 'warehouse' ? (
          <CrmEmpty
            onOpen={isOwner ? openModal : undefined}
            onPlanDelivery={isOwner ? () => setSupplierDeliveryOpen(true) : undefined}
          />
        ) : null}

        {showWarehousePage ? (
          <section className="crm-block crm-block--warehouse" aria-label="Содержимое склада">
            <div className="crm-warehouse-sections">
              {supplierDeliveryCare.length > 0 ? (
                <CollapsibleCardsBlock
                  sectionKey="warehouse-deliveries"
                  variant="delivery"
                  title="Поставки"
                  taskCount={supplierDeliveryCare.length}
                  expanded={warehouseSectionsOpen.deliveries}
                  onToggle={() => toggleWarehouseSection('deliveries')}
                  content={
                    <ul className="warehouse-deliveries-list">
                      {supplierDeliveryCare.map((row) => (
                        <li key={`d-${row.id}`}>{renderDeliveryCard(row, true)}</li>
                      ))}
                    </ul>
                  }
                />
              ) : null}
              <CollapsibleCardsBlock
                sectionKey="warehouse-flowers"
                variant="batches"
                title="Цветы"
                taskCount={warehouseFlowerPositionCount}
                expanded={warehouseSectionsOpen.flowers}
                onToggle={() => toggleWarehouseSection('flowers')}
                content={warehouseFlowersCatalogPanel}
              />
              <CollapsibleCardsBlock
                sectionKey="warehouse-bouquets"
                variant="bouquets"
                title="Букеты"
                taskCount={bouquets.length}
                expanded={warehouseSectionsOpen.bouquets}
                onToggle={() => toggleWarehouseSection('bouquets')}
                content={
                  <WarehouseBouquetCatalog
                    bouquets={bouquets}
                    warehouseMode={stockMeta.warehouse_mode}
                    isOwner={isOwner}
                    onOpenCreateRecipe={isOwner ? openBouquetRecipe : undefined}
                    onOpenEdit={isOwner ? openBouquetEdit : undefined}
                    onOpenStockDiscard={isOwner ? openBouquetDiscard : undefined}
                  />
                }
              />
              <CollapsibleCardsBlock
                sectionKey="warehouse-retail"
                variant="retail"
                title="Товары без срока"
                taskCount={retailProducts.length}
                expanded={warehouseSectionsOpen.retail}
                onToggle={() => toggleWarehouseSection('retail')}
                content={
                  <WarehouseRetailCatalog
                    reloadToken={retailCatalogReload}
                    onOpenEdit={isOwner ? openRetailEdit : undefined}
                    onOpenAdd={isOwner ? openRetailAdd : undefined}
                    onOpenStockDiscard={isOwner ? openRetailStockDiscard : undefined}
                  />
                }
              />
              <CollapsibleCardsBlock
                sectionKey="warehouse-consumables"
                variant="retail"
                title="Расходники"
                taskCount={consumables.length}
                expanded={warehouseSectionsOpen.consumables}
                onToggle={() => toggleWarehouseSection('consumables')}
                content={
                  <WarehouseConsumablesCatalog
                    items={consumables}
                    reloadToken={consumablesCatalogReload}
                    onOpenEdit={isOwner ? openConsumableEdit : undefined}
                    onOpenAdd={isOwner ? openConsumableAdd : undefined}
                    onOpenIntake={isOwner ? openConsumableIntake : undefined}
                    onOpenStockDiscard={isOwner ? openConsumableStockDiscard : undefined}
                  />
                }
              />
            </div>
          </section>
        ) : null}

        {batches !== null && surface === 'home' ? (
          <section className="crm-block crm-block--home-care" aria-labelledby="crm-home-care-heading">
            <div className="crm-block__head crm-block__head--home-deals-only">
              <h2 id="crm-home-care-heading" className="crm-block__title">
                Дела
              </h2>
            </div>
            <div className="crm-home-deals" aria-label="Список дел по категориям">
              {!hasUnderlyingHomeTasks && (batches?.length ?? 0) > 0 ? (
                <p className="crm-care-empty">Все партии в порядке — подрезка и вода по графику, цены на остатки заданы.</p>
              ) : !hasUnderlyingHomeTasks ? (
                <p className="crm-care-empty">Запланированных поставок на сегодня и ранее нет.</p>
              ) : (
                <>
                  <h3 className="crm-home-deals__title">Список дел</h3>
                  <div className="crm-home-deals__blocks">
                    {homeSections.map((section) => renderHomeSectionBlock(section))}
                  </div>
                </>
              )}
            </div>
          </section>
        ) : null}
      </div>

      <IntakeBatchModal
        open={intakeOpen && isOwner}
        batchLines={batchLines}
        receivedDate={receivedDate}
        receivedTime={receivedTime}
        intakeFormError={intakeFormError}
        intakeInvalidField={intakeInvalidField}
        receivedAtBad={receivedAtBad}
        receivedAtError={receivedAtError}
        creating={creating}
        onDialogClose={handleIntakeDialogClose}
        onSubmit={createBatch}
        onSetBatchLines={setBatchLines}
        onSetReceivedDate={setReceivedDate}
        onSetReceivedTime={setReceivedTime}
        onSetBatchLineTaxon={setBatchLineTaxon}
        onSetBatchLineQty={setBatchLineQty}
        onSetBatchLineUnitCost={setBatchLineUnitCost}
        onSetBatchLineRealizationQty={setBatchLineRealizationQty}
        onSetBatchLineSaleTermsFixedPrice={setBatchLineSaleTermsFixedPrice}
        onSetBatchLinePackSize={setBatchLinePackSize}
        onSetBatchLineRollsCount={setBatchLineRollsCount}
      />

      <OrderModal
        open={orderOpen}
        hasSaleStock={hasOrderStock}
        orderFormError={orderFormError}
        orderInvalidField={orderInvalidField}
        showLineErrors={orderInvalidField === 'lines'}
        saleStockOptions={orderStockOptions}
        storeFlowerStockBySf={storeFlowerStockBySf}
        orderLines={orderLines}
        onSetOrderLines={setOrderLines}
        orderBusy={orderBusy}
        deliveryServiceId={orderDeliveryServiceId}
        customerPhone={orderCustomerPhone}
        deliveryAddress={orderDeliveryAddress}
        scheduledDate={orderScheduledDate}
        scheduledTime={orderScheduledTime}
        onClose={closeOrderModal}
        onSubmit={submitOrder}
        onDeliveryServiceIdChange={setOrderDeliveryServiceId}
        onCustomerPhoneChange={setOrderCustomerPhone}
        onDeliveryAddressChange={setOrderDeliveryAddress}
        onScheduledDateChange={setOrderScheduledDate}
        onScheduledTimeChange={setOrderScheduledTime}
        orderPaymentType={orderPaymentType}
        onOrderPaymentTypeChange={setOrderPaymentType}
      />

      <SaleModal
        open={saleOpen}
        hasSaleStock={hasSaleStock}
        saleFormError={saleFormError}
        showLineErrors={saleInvalidField === 'lines'}
        saleStockOptions={saleStockOptions}
        storeFlowerStockBySf={storeFlowerStockBySf}
        saleLines={saleLines}
        onSetSaleLines={setSaleLines}
        saleBusy={saleBusy}
        salePaymentInvalid={saleInvalidField === 'payment'}
        onClose={closeSaleModal}
        onSubmit={(e) => void submitSale(e)}
        salePaymentType={salePaymentType}
        onSalePaymentTypeChange={setSalePaymentType}
      />

      <WasteModal
        open={wasteOpen}
        wasteSearchOptions={wasteSearchOptions}
        wasteSelectedKey={wasteSelectedKey}
        wasteSelectedRow={wasteSelectedRow}
        wasteSelectedRetailProduct={wasteSelectedRetailProduct}
        wasteSelectedBouquet={wasteSelectedBouquet}
        wasteSelectedConsumable={wasteSelectedConsumable}
        aggregateTarget={wasteAggregate}
        maxRealizationQty={wasteMaxRealization}
        discardQty={wasteQty}
        onDiscardQtyChange={setWasteQty}
        discardRealizationQty={wasteRealizationQty}
        onDiscardRealizationQtyChange={setWasteRealizationQty}
        discardMeters={wasteMeters}
        onDiscardMetersChange={setWasteMeters}
        busyDiscard={wasteModalBusy}
        onClose={closeWasteModal}
        onSelectKey={setWasteSelectedKey}
        onConfirmDiscard={confirmWasteDiscard}
      />

      {isOwner ? (
        <>
          <SupplierDeliveryModal
            open={supplierDeliveryOpen}
            onClose={() => setSupplierDeliveryOpen(false)}
            onCreated={() => void load()}
          />
          <SupplierDeliveryReceiveModal
            open={receiveDeliveryRow != null}
            row={receiveDeliveryRow}
            busy={receiveDeliveryRow != null && busyDeliveryId === receiveDeliveryRow.id}
            onClose={() => setReceiveDeliveryRow(null)}
            onConfirm={confirmReceiveDelivery}
          />
        </>
      ) : null}
      {flowerEditor.modal}
      {flowerEditor.confirmDialog}
      {deleteConfirmDialog}
      <BouquetRecipeModal
        open={bouquetRecipeOpen && isOwner}
        mode={bouquetRecipeMode}
        name={bouquetRecipeName}
        unitPrice={bouquetRecipePrice}
        photoPreviewUrl={bouquetRecipePhotoUrl}
        flowerLines={bouquetRecipeLines}
        consumableLines={bouquetConsumableLines}
        recipeHasAssembledStock={bouquetRecipeMode === 'edit' && bouquetRecipeStockQty > 0}
        formError={bouquetRecipeError}
        invalidField={bouquetRecipeInvalid}
        busy={bouquetRecipeBusy}
        onClose={() => setBouquetRecipeOpen(false)}
        onSubmit={submitBouquetRecipe}
        onDelete={bouquetRecipeMode === 'edit' ? removeBouquetRecipe : undefined}
        onNameChange={setBouquetRecipeName}
        onUnitPriceChange={setBouquetRecipePrice}
        onPhotoChange={setBouquetRecipePhoto}
        onSetFlowerLines={setBouquetRecipeLines}
        onSetConsumableLines={setBouquetConsumableLines}
        onSetFlowerLineTaxon={(key, taxon) =>
          setBouquetRecipeLines((prev) => prev.map((row) => (row.key === key ? { ...row, taxon } : row)))
        }
        onSetFlowerLineQty={(key, qty) =>
          setBouquetRecipeLines((prev) => prev.map((row) => (row.key === key ? { ...row, qty } : row)))
        }
        onSetConsumableLineTaxon={(key, taxon) =>
          setBouquetConsumableLines((prev) => prev.map((row) => (row.key === key ? { ...row, taxon } : row)))
        }
        onSetConsumableLineQty={(key, qty) =>
          setBouquetConsumableLines((prev) => prev.map((row) => (row.key === key ? { ...row, qty } : row)))
        }
        storeFlowerStockBySf={storeFlowerStockBySf}
      />
      <BouquetAssembleModal
        open={bouquetAssembleOpen && isOwner}
        bouquets={bouquets}
        bouquetId={bouquetAssembleId}
        bouquetQty={bouquetAssembleQty}
        bouquetCount={bouquetAssembleCount}
        bouquetQtyValid={bouquetAssembleQtyValid}
        usageRows={bouquetAssembleUsageRows}
        consumableUsageRows={bouquetAssembleConsumableUsageRows}
        formError={bouquetAssembleError}
        invalidField={bouquetAssembleInvalid}
        busy={bouquetAssembleBusy}
        onClose={() => setBouquetAssembleOpen(false)}
        onSubmit={submitBouquetAssemble}
        onBouquetIdChange={setBouquetAssembleId}
        onBouquetQtyChange={setBouquetAssembleQty}
      />

      <RetailProductModal
        open={retailModalOpen && isOwner}
        mode={retailModalMode}
        initial={retailModalInitial}
        productId={retailEditingId}
        busy={retailModalBusy}
        error={retailModalError}
        onClose={() => setRetailModalOpen(false)}
        onSubmit={submitRetailModal}
        onDelete={retailModalMode === 'edit' ? removeRetailProduct : undefined}
      />

      <ConsumableModal
        open={consumableModalOpen && isOwner}
        mode={consumableModalMode}
        initial={consumableModalInitial}
        busy={consumableModalBusy}
        error={consumableModalError}
        onClose={() => setConsumableModalOpen(false)}
        onSubmit={submitConsumableModal}
        onDelete={consumableModalMode === 'edit' ? removeConsumable : undefined}
      />
      <ConsumableIntakeModal
        open={consumableIntakeOpen && isOwner}
        row={consumableIntakeRow}
        busy={consumableIntakeBusy}
        error={consumableIntakeError}
        onClose={() => setConsumableIntakeOpen(false)}
        onSubmit={submitConsumableIntake}
      />
    </div>
  )
}
