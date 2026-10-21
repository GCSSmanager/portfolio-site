import { validateNavMenuPatch } from '../auth/navMenuTypes'
import { getSessionUserId, setSessionUserId } from './session'
import { advanceBasicShopCalendarIfDue } from './basicWarehouse'
import { listBouquetsForUser } from './bouquetSerialize'
import { handleDemoPhotoUpload } from './demoPhotoUpload'
import { allocId, loadDb, saveDb } from './store'
import {
  findUser,
  findUserByPhone,
  ownerHomeTasksPayload,
  resolveNavMenu,
  salesStatsDay,
  serializeRetailProductRow,
  serializeStockList,
  shopUserId,
  subscriptionActive,
  taxonTreePayload,
  userPublic,
} from './serialize'
import type { DemoDb, DemoUser } from './types'
import {
  buildExpensesPayload,
  createExpense,
  patchExpense,
  recordExpensePayment,
} from './expensePeriod'
import { pricesCatalogPayload, putWarehousePrice } from './pricesApi'
import { taxonCareDetailPayload, taxonSearchResults } from './taxonsApi'
import { listSalesHistory } from './salesHistory'
import { canCompleteCustomTask, completeCustomHomeTask } from './homeTaskOps'
import { buildSalesStatsRange } from './saleStatsRange'
import {
  assembleBouquet,
  createBatchIntake,
  createWarehouseSale,
  deleteBouquetById,
  deleteRetailProduct,
  discardBouquet,
  discardConsumableMeters,
  discardRetail,
  discardStoreFlowerStock,
  patchBasicCare,
  patchBatch,
  patchBouquet,
  stockSearch,
  upsertBouquetRecipe,
  upsertRetailProduct,
} from './stockOps'
import { applyBasicShopPeriodicCare } from './basicWarehouse'
import { listMarketShops, marketShopCatalog } from './marketplace'
import {
  createStoreFlower,
  patchStoreFlower,
  searchStoreFlowers,
  serializeStoreFlowerCareDetail,
  serializeStoreFlowerRow,
} from './storeFlowerApi'
import {
  createCustomerOrders,
  completeCustomerOrderHandoff,
  serializeCustomerOrderCare,
} from './customerOrders'
import { createSupplierDelivery, receiveSupplierDelivery } from './supplierDeliveries'
import {
  createConsumable,
  deleteConsumable,
  intakeConsumable,
  patchConsumable,
  serializeConsumableRow,
} from './consumablesApi'
import {
  createDeliveryService,
  createSupplier,
  createSupplierOffer,
  deleteDeliveryService,
  deleteSupplier,
  deleteSupplierOffer,
  deliveryServicesPayload,
  patchDeliveryService,
  patchSupplier,
  patchSupplierOffer,
  suppliersPayload,
} from './directoryOps'
import {
  buildInventorySnapshot,
  completeInventory,
  inventoryMeta,
  listInventoryHistory,
  serializeInventoryDetail,
} from './inventory'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function err(message: string, status = 400): Response {
  return json({ error: message, ok: false }, status)
}

async function readJson(request: RequestInit | undefined): Promise<Record<string, unknown> | null> {
  if (!request?.body || typeof request.body !== 'string') return {}
  try {
    return JSON.parse(request.body) as Record<string, unknown>
  } catch {
    return null
  }
}

function methodOf(init?: RequestInit): string {
  return (init?.method ?? 'GET').toUpperCase()
}

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

function requireUser(db: DemoDb): DemoUser | Response {
  const uid = getSessionUserId()
  const user = findUser(db, uid)
  if (!user) return err('Требуется вход.', 401)
  if (user.role === 'customer') return err('Требуется аккаунт магазина.', 403)
  if (!isDemoMode && !subscriptionActive(user)) {
    return json({ code: 'subscription_expired', error: 'Подписка не активна.' }, 403)
  }
  return user
}

function requireOwner(session: DemoUser): Response | null {
  if (session.role !== 'owner') return err('Доступ только для владельца.', 403)
  return null
}

function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const d = raw.replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('7')) return d
  if (d.length === 10) return `7${d}`
  return null
}

function parsePath(pathname: string): { segments: string[]; search: URLSearchParams } {
  const [path, qs = ''] = pathname.split('?')
  const segments = path.split('/').filter(Boolean)
  return { segments, search: new URLSearchParams(qs) }
}

export async function handleDemoFetch(pathWithQuery: string, init?: RequestInit): Promise<Response> {
  const db = loadDb()
  const { segments, search } = parsePath(pathWithQuery)
  const method = methodOf(init)

  if (segments[0] !== 'api') return err('Not found', 404)

  if (pathWithQuery.includes('/photo') && method === 'POST') {
    const session = getSessionUserId() ? findUser(db, getSessionUserId()!) : null
    if (!session) return err('Требуется вход.', 401)
    const shopUid = shopUserId(session)
    const photoResp = handleDemoPhotoUpload(db, shopUid, segments)
    if (photoResp) {
      saveDb(db)
      return photoResp
    }
    return err('Не удалось сохранить фото.', 404)
  }

  // health
  if (segments[1] === 'health' && method === 'GET') {
    return json({ ok: true })
  }

  // auth/*
  if (segments[1] === 'auth') {
    if (segments[2] === 'me' && method === 'GET') {
      const uid = getSessionUserId()
      const user = findUser(db, uid)
      if (!user) {
        return json({
          phone: null,
          login: null,
          role: null,
          subscription_until: null,
          subscription_active: true,
          nav_menu: [],
          nav_menu_can_edit: false,
        })
      }
      return json(userPublic(db, user))
    }

    if (segments[2] === 'login' && method === 'POST') {
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const phone = normalizePhone(body.phone)
      const password = typeof body.password === 'string' ? body.password : ''
      if (!phone) return err('Укажите номер телефона: 10 цифр или +7…', 400)
      if (password.length < 6) return err('Пароль: от 6 до 128 символов.', 400)
      const user = findUserByPhone(db, phone)
      if (!user || user.password !== password) {
        return err('Неверный телефон или пароль.', 401)
      }
      setSessionUserId(user.id)
      return json({ ok: true, ...userPublic(db, user) })
    }

    if (isDemoMode && segments[2] === 'register' && method === 'POST') {
      return err('Регистрация отключена в демо.', 403)
    }

    if (isDemoMode && segments[2] === 'register-shop' && method === 'POST') {
      return err('В демо регистрация магазина недоступна.', 403)
    }

    if (segments[2] === 'logout' && method === 'POST') {
      setSessionUserId(null)
      return json({ ok: true })
    }

    if (segments[2] === 'staff') {
      const session = requireUser(db)
      if (session instanceof Response) return session
      if (session.role !== 'owner') return err('Доступ только для владельца.', 403)
      const shopUid = shopUserId(session)

      if (segments[3]) {
        const staffId = Number.parseInt(segments[3]!, 10)
        const row = db.users.find((u) => u.id === staffId && u.owner_id === shopUid)
        if (!row) return err('Сотрудник не найден.', 404)
        if (method === 'DELETE') {
          db.users = db.users.filter((u) => u.id !== staffId)
          saveDb(db)
          return json({ ok: true })
        }
        if (method === 'PATCH') {
          const body = await readJson(init)
          if (body === null) return err('Некорректный JSON.', 400)
          if (typeof body.name === 'string' && body.name.trim()) row.staff_name = body.name.trim().slice(0, 120)
          if (body.phone != null) {
            const phone = normalizePhone(body.phone)
            if (phone) row.phone = phone
          }
          if (typeof body.password === 'string' && body.password.length >= 6) row.password = body.password
          saveDb(db)
          return json({
            staff: { id: row.id, name: row.staff_name, phone: row.phone, login: row.login },
          })
        }
        return err('Method not allowed', 405)
      }

      const staff = db.users.filter((u) => u.owner_id === shopUid)
      if (method === 'GET') {
        return json({
          staff: staff.map((u) => ({
            id: u.id,
            name: u.staff_name,
            phone: u.phone,
            login: u.login,
          })),
        })
      }
      if (method === 'POST') {
        const body = await readJson(init)
        if (body === null) return err('Некорректный JSON.', 400)
        const phone = normalizePhone(body.phone)
        const password = typeof body.password === 'string' ? body.password : ''
        const name = typeof body.name === 'string' ? body.name.trim() : ''
        if (!phone || !name || password.length < 6) return err('Заполните имя, телефон и пароль.', 400)
        if (db.users.some((u) => u.phone === phone)) return err('Этот номер уже занят.', 409)
        const id = allocId(db)
        db.users.push({
          id,
          login: `florist_${id}`,
          phone,
          password,
          role: 'florist',
          staff_name: name.slice(0, 120),
          shop_name: '',
          owner_id: shopUid,
          subscription_until: null,
          warehouse_mode: 'basic',
          basic_care_interval_days: 3,
          basic_next_care_date: db.demoDay,
          basic_care_cycle_anchor_date: null,
          last_inventory_completed_at: null,
          inventory_interval_days: 14,
          acquiring_rate_pct: '2.20',
          sbp_commission_rate_pct: '0.70',
          tax_rate_pct: '6.00',
          nav_menu_prefs: [],
        })
        saveDb(db)
        return json(
          {
            staff: {
              id,
              name,
              phone,
              login: `florist_${id}`,
            },
          },
          201,
        )
      }
    }
  }

  // taxons/*
  if (segments[1] === 'taxons') {
    const session = requireUser(db)
    if (session instanceof Response) return session
    if (segments[2] === 'tree' && method === 'GET') {
      return json(taxonTreePayload(db))
    }
    if (segments[2] === 'search' && method === 'GET') {
      const q = search.get('q') || ''
      return json(taxonSearchResults(db, q))
    }
    if (segments[2] && segments[3] === 'care' && method === 'GET') {
      const taxonId = Number.parseInt(segments[2]!, 10)
      const payload = taxonCareDetailPayload(db, taxonId)
      if (!payload) return err('Таксон не найден.', 404)
      return json(payload)
    }
  }

  // me/*
  if (segments[1] === 'me') {
    const session = requireUser(db)
    if (session instanceof Response) return session
    const shopUid = shopUserId(session)

    if (segments[2] === 'stock' && !segments[3] && method === 'GET') {
      const calendarDirty = advanceBasicShopCalendarIfDue(db, shopUid)
      if (calendarDirty) saveDb(db)
      return json(serializeStockList(db, session))
    }

    if (segments[2] === 'stock' && segments[3] === 'sales' && segments[4] === 'stats' && method === 'GET') {
      return json(salesStatsDay(db, shopUid))
    }

    if (segments[2] === 'stock' && segments[3] === 'sales' && segments[4] === 'list' && method === 'GET') {
      const includeFinancials = session.role === 'owner'
      return json(listSalesHistory(db, shopUid, search, includeFinancials))
    }

    if (segments[2] === 'stock' && segments[3] === 'sales' && segments[4] === 'range' && method === 'GET') {
      if (session.role !== 'owner') return err('Доступ только для владельца.', 403)
      const owner = findUser(db, shopUid)
      if (!owner) return err('Магазин не найден.', 404)
      return json(buildSalesStatsRange(db, shopUid, owner, search))
    }

    if (segments[2] === 'stock' && segments[3] === 'sales' && !segments[4] && method === 'POST') {
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = createWarehouseSale(db, shopUid, body, () => allocId(db))
      if (result.error) return err(result.error, result.status ?? 400)
      saveDb(db)
      return json(result.payload ?? { ok: true }, result.status ?? 201)
    }

    if (segments[2] === 'stock' && segments[3] === 'search' && method === 'GET') {
      const q = search.get('q') || ''
      const rawSid = (search.get('supplier_id') || '').trim()
      let supplierId: number | null = null
      if (rawSid) {
        supplierId = Number.parseInt(rawSid, 10)
        if (!Number.isFinite(supplierId)) return err('supplier_id: ожидается целое число.', 400)
      }
      const result = stockSearch(db, shopUid, q, supplierId)
      if (result.error) return err(result.error, result.status ?? 400)
      return json({ results: result.results ?? [] })
    }

    if (segments[2] === 'stock' && segments[3] === 'basic-shop-care' && method === 'POST') {
      const result = applyBasicShopPeriodicCare(db, shopUid)
      if (result.error) {
        const status = result.code === 'no_user' ? 404 : 400
        return err(result.error, status)
      }
      saveDb(db)
      return json({ ok: true, basic_next_care_date: result.owner!.basic_next_care_date })
    }

    if (segments[2] === 'stock' && segments[3] === 'basic-care' && segments[4] && method === 'PATCH') {
      const careId = Number.parseInt(segments[4]!, 10)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = patchBasicCare(db, shopUid, careId, body)
      if (result.error) return err(result.error, 404)
      saveDb(db)
      return json(serializeStockList(db, session))
    }

    if (segments[2] === 'stock' && segments[3] === 'batches' && !segments[4] && method === 'POST') {
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = createBatchIntake(db, shopUid, body, () => allocId(db))
      if (result.error) return err(result.error, 400)
      saveDb(db)
      return json(serializeStockList(db, session), 201)
    }

    if (segments[2] === 'stock' && segments[3] === 'batches' && segments[4] && method === 'PATCH') {
      const batchId = Number.parseInt(segments[4]!, 10)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = patchBatch(db, shopUid, batchId, body)
      if (result.error) return err(result.error, 404)
      saveDb(db)
      return json(serializeStockList(db, session))
    }

    if (segments[2] === 'stock' && segments[3] === 'bouquets' && segments[4] === 'assemble' && method === 'POST') {
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = assembleBouquet(db, shopUid, body)
      if (result.error) return err(result.error, 400)
      saveDb(db)
      return json(serializeStockList(db, session), 201)
    }

    if (segments[2] === 'stock' && segments[3] === 'bouquets' && !segments[4] && method === 'POST') {
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = upsertBouquetRecipe(db, shopUid, body, null, () => allocId(db))
      if (result.error) return err(result.error, 400)
      saveDb(db)
      return json({ bouquet: result.bouquet }, 201)
    }

    if (segments[2] === 'stock' && segments[3] === 'bouquets' && segments[4] && method === 'PATCH') {
      const bouquetId = Number.parseInt(segments[4]!, 10)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      if (body.action) {
        const result = patchBouquet(db, shopUid, bouquetId, body)
        if (result.error) return err(result.error, 404)
      } else {
        const result = upsertBouquetRecipe(db, shopUid, body, bouquetId, () => allocId(db))
        if (result.error) return err(result.error, 404)
      }
      saveDb(db)
      return json(serializeStockList(db, session))
    }

    if (segments[2] === 'stock' && segments[3] === 'bouquets' && segments[4] && method === 'DELETE') {
      const bouquetId = Number.parseInt(segments[4]!, 10)
      const result = deleteBouquetById(db, shopUid, bouquetId)
      if (result.error) return err(result.error, 400)
      saveDb(db)
      return json(serializeStockList(db, session))
    }

    if (segments[2] === 'stock' && segments[3] === 'retail' && !segments[4] && method === 'POST') {
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = upsertRetailProduct(db, shopUid, body, null, () => allocId(db))
      if (result.error) return err(result.error, 400)
      saveDb(db)
      return json({ product: result.product }, 201)
    }

    if (segments[2] === 'stock' && segments[3] === 'retail' && segments[4] && !segments[5] && method === 'PATCH') {
      const productId = Number.parseInt(segments[4]!, 10)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = upsertRetailProduct(db, shopUid, body, productId, () => allocId(db))
      if (result.error) return err(result.error, 404)
      saveDb(db)
      return json(serializeStockList(db, session))
    }

    if (
      segments[2] === 'stock' &&
      segments[3] === 'retail' &&
      segments[4] &&
      !segments[5] &&
      method === 'DELETE'
    ) {
      const productId = Number.parseInt(segments[4]!, 10)
      const result = deleteRetailProduct(db, shopUid, productId)
      if (result.error) return err(result.error, 404)
      saveDb(db)
      return json(serializeStockList(db, session))
    }

    if (
      segments[2] === 'stock' &&
      segments[3] === 'store-flowers' &&
      segments[4] &&
      segments[5] === 'discard' &&
      method === 'POST'
    ) {
      const sfId = Number.parseInt(segments[4]!, 10)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = discardStoreFlowerStock(db, shopUid, sfId, body)
      if (result.error) return err(result.error, 400)
      saveDb(db)
      return json({ ok: true })
    }

    if (segments[2] === 'stock' && segments[3] === 'retail' && segments[5] === 'discard' && method === 'POST') {
      const productId = Number.parseInt(segments[4]!, 10)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = discardRetail(db, shopUid, productId, body)
      if (result.error) return err(result.error, 400)
      saveDb(db)
      return json({ ok: true })
    }

    if (segments[2] === 'stock' && segments[3] === 'bouquets' && segments[5] === 'discard' && method === 'POST') {
      const bouquetId = Number.parseInt(segments[4]!, 10)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = discardBouquet(db, shopUid, bouquetId, body)
      if (result.error) return err(result.error, 400)
      saveDb(db)
      return json({ ok: true })
    }

    if (segments[2] === 'stock' && segments[3] === 'consumables' && segments[5] === 'discard' && method === 'POST') {
      const consumableId = Number.parseInt(segments[4]!, 10)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = discardConsumableMeters(db, shopUid, consumableId, body)
      if (result.error) return err(result.error, 400)
      saveDb(db)
      return json({ ok: true })
    }

    if (segments[2] === 'stock' && segments[3] === 'prices') {
      const denied = requireOwner(session)
      if (denied) return denied

      if (segments[4] === 'catalog' && method === 'GET') {
        return json(pricesCatalogPayload(db, shopUid))
      }

      if (!segments[4] && (method === 'PUT' || method === 'PATCH')) {
        const body = await readJson(init)
        if (body === null) return err('Некорректный JSON.', 400)
        const result = putWarehousePrice(db, shopUid, body, () => allocId(db))
        if (result.error) return err(result.error, result.status ?? 400)
        saveDb(db)
        return json(result.payload ?? { ok: true })
      }

      if (!segments[4] && method === 'GET') {
        return json({
          items: db.prices
            .filter((p) => p.user_id === shopUid)
            .map((p) => {
              const sf = db.storeFlowers.find((s) => s.id === p.store_flower_id)
              const meta = sf ? db.taxons.find((t) => t.id === sf.taxon_id) : null
              return {
                store_flower_id: p.store_flower_id,
                taxon_id: p.taxon_id,
                display_name: meta ? (meta.name_ru || meta.name) : '—',
                unit_price: p.unit_price,
              }
            }),
        })
      }
    }

    if (segments[2] === 'shop-settings') {
      const owner = findUser(db, shopUid)
      if (!owner) return err('Магазин не найден.', 404)
      if (method === 'GET') {
        return json({
          shop_name: owner.shop_name,
          warehouse_mode: owner.warehouse_mode,
          basic_care_interval_days: owner.basic_care_interval_days,
          basic_next_care_date: owner.basic_next_care_date,
          inventory_interval_days: owner.inventory_interval_days,
          acquiring_rate_pct: owner.acquiring_rate_pct,
          sbp_commission_rate_pct: owner.sbp_commission_rate_pct,
          tax_rate_pct: owner.tax_rate_pct,
        })
      }
      if (method === 'PATCH') {
        const body = await readJson(init)
        if (body === null) return err('Некорректный JSON.', 400)
        if (typeof body.shop_name === 'string') owner.shop_name = body.shop_name.trim().slice(0, 200)
        if (typeof body.warehouse_mode === 'string') owner.warehouse_mode = body.warehouse_mode as DemoUser['warehouse_mode']
        if (body.basic_care_interval_days != null) {
          owner.basic_care_interval_days = Number(body.basic_care_interval_days) || 3
        }
        if (body.inventory_interval_days != null) {
          owner.inventory_interval_days = Number(body.inventory_interval_days) || 14
        }
        if (typeof body.acquiring_rate_pct === 'string') owner.acquiring_rate_pct = body.acquiring_rate_pct
        if (typeof body.sbp_commission_rate_pct === 'string') owner.sbp_commission_rate_pct = body.sbp_commission_rate_pct
        if (typeof body.tax_rate_pct === 'string') owner.tax_rate_pct = body.tax_rate_pct
        saveDb(db)
        return json({
          shop_name: owner.shop_name,
          warehouse_mode: owner.warehouse_mode,
          basic_care_interval_days: owner.basic_care_interval_days,
          basic_next_care_date: owner.basic_next_care_date,
          inventory_interval_days: owner.inventory_interval_days,
          acquiring_rate_pct: owner.acquiring_rate_pct,
          sbp_commission_rate_pct: owner.sbp_commission_rate_pct,
          tax_rate_pct: owner.tax_rate_pct,
        })
      }
    }

    if (segments[2] === 'nav-menu') {
      const owner = findUser(db, shopUid)
      if (!owner) return err('Магазин не найден.', 404)
      if (method === 'GET') {
        return json({ items: resolveNavMenu(owner, session.role === 'owner') })
      }
      if (method === 'PATCH') {
        const body = await readJson(init)
        if (body === null) return err('Некорректный JSON.', 400)
        const validated = validateNavMenuPatch(body)
        if (!validated.ok) return err(validated.error, 400)
        owner.nav_menu_prefs = validated.items
        saveDb(db)
        return json({ items: resolveNavMenu(owner, true) })
      }
    }

    if (segments[2] === 'home-tasks' && !segments[3] && method === 'GET') {
      if (session.role !== 'owner') return err('Доступ только для владельца.', 403)
      return json(ownerHomeTasksPayload(db, shopUid))
    }

    if (segments[2] === 'home-tasks' && segments[3] === 'system' && method === 'PATCH') {
      if (session.role !== 'owner') return err('Доступ только для владельца.', 403)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const key = String(body.task_key || '')
      const row = db.systemTasks.find((t) => t.user_id === shopUid && t.task_key === key)
      if (!row) return err('Задача не найдена.', 404)
      if ('enabled' in body) row.enabled = Boolean(body.enabled)
      if ('visibility' in body) row.visibility = String(body.visibility)
      if ('assignee_id' in body) row.assignee_id = body.assignee_id == null ? null : Number(body.assignee_id)
      if ('section_id' in body) row.section_id = body.section_id == null ? null : Number(body.section_id)
      saveDb(db)
      return json(ownerHomeTasksPayload(db, shopUid))
    }

    if (segments[2] === 'home-tasks' && segments[3] === 'custom' && !segments[4]) {
      if (session.role !== 'owner') return err('Доступ только для владельца.', 403)
      if (method === 'POST') {
        const body = await readJson(init)
        if (body === null) return err('Некорректный JSON.', 400)
        const name = String(body.name || '').trim()
        if (!name) return err('Укажите название.', 400)
        const id = allocId(db)
        db.customTasks.push({
          id,
          user_id: shopUid,
          name: name.slice(0, 200),
          section_id: body.section_id == null ? null : Number(body.section_id),
          enabled: body.enabled !== false,
          visibility: String(body.visibility || 'all'),
          assignee_id: body.assignee_id == null ? null : Number(body.assignee_id),
          schedule_kind: String(body.schedule_kind || 'once'),
          period: String(body.period || ''),
          due_date: typeof body.due_date === 'string' ? body.due_date : null,
          completed_at: null,
          note: String(body.note || '').slice(0, 2000),
          sort_order: db.customTasks.length,
        })
        saveDb(db)
        return json(ownerHomeTasksPayload(db, shopUid), 201)
      }
    }

    if (segments[2] === 'home-tasks' && segments[3] === 'custom' && segments[4]) {
      const taskId = Number.parseInt(segments[4]!, 10)
      const row = db.customTasks.find((t) => t.id === taskId && t.user_id === shopUid)
      if (!row) return err('Задача не найдена.', 404)
      if (segments[5] === 'complete' && method === 'POST') {
        if (!canCompleteCustomTask(session, shopUid, row)) {
          return err(row.enabled ? 'Нет доступа к этой задаче.' : 'Задача отключена.', 403)
        }
        completeCustomHomeTask(db, row)
        saveDb(db)
        const stock = serializeStockList(db, session)
        return json({ ok: true, home_sections: stock.home_sections })
      }
      if (session.role !== 'owner') return err('Доступ только для владельца.', 403)
      if (method === 'PATCH') {
        const body = await readJson(init)
        if (body === null) return err('Некорректный JSON.', 400)
        if (typeof body.name === 'string' && body.name.trim()) row.name = body.name.trim().slice(0, 200)
        if ('enabled' in body) row.enabled = Boolean(body.enabled)
        if ('visibility' in body) row.visibility = String(body.visibility)
        if ('section_id' in body) row.section_id = body.section_id == null ? null : Number(body.section_id)
        saveDb(db)
        return json(ownerHomeTasksPayload(db, shopUid))
      }
      if (method === 'DELETE') {
        db.customTasks = db.customTasks.filter((t) => t.id !== taskId)
        saveDb(db)
        return json(ownerHomeTasksPayload(db, shopUid))
      }
    }

    if (segments[2] === 'home-tasks' && segments[3] === 'sections') {
      if (session.role !== 'owner') return err('Доступ только для владельца.', 403)
      if (method === 'POST' && !segments[4]) {
        const body = await readJson(init)
        if (body === null) return err('Некорректный JSON.', 400)
        const name = String(body.name || '').trim()
        if (!name) return err('Укажите название раздела.', 400)
        if (!Array.isArray(db.homeSections)) db.homeSections = []
        const id = allocId(db)
        const shopSections = db.homeSections.filter((s) => s.user_id === shopUid)
        const maxSort = shopSections.reduce((m, s) => Math.max(m, s.sort_order), -1)
        const row = {
          id,
          user_id: shopUid,
          section_key: `custom_${id}`,
          name: name.slice(0, 120),
          is_builtin: false,
          sort_order: maxSort + 1,
        }
        db.homeSections.push(row)
        saveDb(db)
        return json({ ...ownerHomeTasksPayload(db, shopUid), section: row }, 201)
      }
      if (segments[4]) {
        const sectionId = Number.parseInt(segments[4]!, 10)
        const section = db.homeSections.find((s) => s.id === sectionId && s.user_id === shopUid)
        if (!section) return err('Раздел не найден.', 404)
        if (method === 'PATCH') {
          if (section.is_builtin) return err('Встроенный раздел нельзя переименовать.', 400)
          const body = await readJson(init)
          if (body === null) return err('Некорректный JSON.', 400)
          const nextName = typeof body.name === 'string' ? body.name.trim() : ''
          if (!nextName) return err('Укажите название.', 400)
          section.name = nextName.slice(0, 120)
          saveDb(db)
          return json({ ...ownerHomeTasksPayload(db, shopUid), section })
        }
        if (method === 'DELETE') {
          if (section.is_builtin) return err('Нельзя удалить встроенный раздел.', 400)
          const more = db.homeSections.find((s) => s.user_id === shopUid && s.section_key === 'more')
          if (more) {
            for (const t of db.customTasks) {
              if (t.user_id === shopUid && t.section_id === sectionId) t.section_id = more.id
            }
            for (const t of db.systemTasks) {
              if (t.user_id === shopUid && t.section_id === sectionId) t.section_id = more.id
            }
          }
          db.homeSections = db.homeSections.filter((s) => s.id !== sectionId)
          saveDb(db)
          return json({ ...ownerHomeTasksPayload(db, shopUid), ok: true })
        }
      }
    }

    if (segments[2] === 'expenses' && segments[3] === 'rates' && method === 'PATCH') {
      if (session.role !== 'owner') return err('Доступ только для владельца.', 403)
      const owner = findUser(db, shopUid)
      if (!owner) return err('Пользователь не найден.', 404)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      if (typeof body.acquiring_rate_pct === 'string') owner.acquiring_rate_pct = body.acquiring_rate_pct
      if (typeof body.sbp_commission_rate_pct === 'string') {
        owner.sbp_commission_rate_pct = body.sbp_commission_rate_pct
      }
      if (typeof body.tax_rate_pct === 'string') owner.tax_rate_pct = body.tax_rate_pct
      saveDb(db)
      return json(
        buildExpensesPayload(db, shopUid, owner, search, false),
      )
    }

    if (segments[2] === 'expenses' && !segments[3] && (method === 'GET' || method === 'HEAD')) {
      const owner = findUser(db, shopUid)!
      const restricted = session.role === 'florist'
      return json(buildExpensesPayload(db, shopUid, owner, search, restricted))
    }

    if (segments[2] === 'expenses' && !segments[3] && method === 'POST') {
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const restricted = session.role === 'florist'
      const created = createExpense(db, shopUid, body, restricted, allocId(db))
      if (created.error) return err(created.error, 400)
      saveDb(db)
      const owner = findUser(db, shopUid)!
      return json(
        { ...buildExpensesPayload(db, shopUid, owner, search, restricted), expense: created.expense },
        201,
      )
    }

    if (segments[2] === 'expenses' && segments[3] && segments[4] === 'payments' && method === 'POST') {
      if (session.role !== 'owner') return err('Доступ только для владельца.', 403)
      const expenseId = Number.parseInt(segments[3]!, 10)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const pay = recordExpensePayment(db, shopUid, expenseId, body, allocId(db))
      if (pay.error) return err(pay.error, 400)
      saveDb(db)
      const owner = findUser(db, shopUid)!
      return json(buildExpensesPayload(db, shopUid, owner, search, false), 201)
    }

    if (segments[2] === 'expenses' && segments[3] && !segments[4]) {
      const expenseId = Number.parseInt(segments[3]!, 10)
      const restricted = session.role === 'florist'
      if (method === 'PATCH') {
        const body = await readJson(init)
        if (body === null) return err('Некорректный JSON.', 400)
        const patched = patchExpense(db, shopUid, expenseId, body, restricted)
        if (patched.error) return err(patched.error, 400)
        saveDb(db)
        const owner = findUser(db, shopUid)!
        const data = buildExpensesPayload(db, shopUid, owner, search, restricted)
        const updated = data.expenses.find((e) => e.id === expenseId)
        return json({ ...data, expense: updated })
      }
      if (method === 'DELETE') {
        const e = db.expenses.find((x) => x.id === expenseId && x.user_id === shopUid)
        if (!e) return err('Строка не найдена.', 404)
        if (restricted && e.category !== 'additional') return err('Строка не найдена.', 404)
        db.expenses = db.expenses.filter((x) => x.id !== expenseId)
        db.expensePayments = db.expensePayments.filter((p) => p.expense_id !== expenseId)
        saveDb(db)
        const owner = findUser(db, shopUid)!
        return json({ ...buildExpensesPayload(db, shopUid, owner, search, restricted), ok: true })
      }
    }

    if (segments[2] === 'suppliers') {
      if (!segments[3] && method === 'GET') {
        return json(suppliersPayload(db, shopUid))
      }
      if (!segments[3] && method === 'POST') {
        const denied = requireOwner(session)
        if (denied) return denied
        const body = await readJson(init)
        if (body === null) return err('Некорректный JSON.', 400)
        const created = createSupplier(db, shopUid, body, () => allocId(db))
        if (created.error) return err(created.error, 400)
        saveDb(db)
        return json({ ...suppliersPayload(db, shopUid), supplier: created.supplier }, 201)
      }
      if (segments[3] && segments[4] === 'offers') {
        const denied = requireOwner(session)
        if (denied) return denied
        const supplierId = Number.parseInt(segments[3]!, 10)
        if (!segments[5] && method === 'POST') {
          const body = await readJson(init)
          if (body === null) return err('Некорректный JSON.', 400)
          const result = createSupplierOffer(db, shopUid, supplierId, body, () => allocId(db))
          if (result.error) return err(result.error, result.status ?? 400)
          saveDb(db)
          return json(suppliersPayload(db, shopUid), 201)
        }
        if (segments[5]) {
          const storeFlowerId = Number.parseInt(segments[5]!, 10)
          const body = await readJson(init)
          if (method === 'PATCH') {
            if (body === null) return err('Некорректный JSON.', 400)
            const result = patchSupplierOffer(db, shopUid, supplierId, storeFlowerId, body)
            if (result.error) return err(result.error, result.status ?? 400)
            saveDb(db)
            return json(suppliersPayload(db, shopUid))
          }
          if (method === 'DELETE') {
            const result = deleteSupplierOffer(db, shopUid, supplierId, storeFlowerId)
            if (result.error) return err(result.error, result.status ?? 404)
            saveDb(db)
            return json({ ...suppliersPayload(db, shopUid), ok: true })
          }
        }
      }
      if (segments[3] && !segments[4]) {
        const supplierId = Number.parseInt(segments[3]!, 10)
        if (method === 'PATCH') {
          const denied = requireOwner(session)
          if (denied) return denied
          const body = await readJson(init)
          if (body === null) return err('Некорректный JSON.', 400)
          const patched = patchSupplier(db, shopUid, supplierId, body)
          if (patched.error) return err(patched.error, patched.error.includes('не найден') ? 404 : 400)
          saveDb(db)
          return json({ ...suppliersPayload(db, shopUid), supplier: patched.supplier })
        }
        if (method === 'DELETE') {
          const denied = requireOwner(session)
          if (denied) return denied
          const result = deleteSupplier(db, shopUid, supplierId)
          if (result.error) return err(result.error, result.status ?? 404)
          saveDb(db)
          return json({ ...suppliersPayload(db, shopUid), ok: true })
        }
      }
    }

    if (segments[2] === 'delivery-services') {
      if (!segments[3] && method === 'GET') {
        return json(deliveryServicesPayload(db, shopUid))
      }
      if (!segments[3] && method === 'POST') {
        const denied = requireOwner(session)
        if (denied) return denied
        const body = await readJson(init)
        if (body === null) return err('Некорректный JSON.', 400)
        const created = createDeliveryService(db, shopUid, body, () => allocId(db))
        if (created.error) return err(created.error, 400)
        saveDb(db)
        return json({ ...deliveryServicesPayload(db, shopUid), service: created.service }, 201)
      }
      if (segments[3]) {
        const serviceId = Number.parseInt(segments[3]!, 10)
        if (method === 'PATCH') {
          const denied = requireOwner(session)
          if (denied) return denied
          const body = await readJson(init)
          if (body === null) return err('Некорректный JSON.', 400)
          const patched = patchDeliveryService(db, shopUid, serviceId, body)
          if (patched.error) return err(patched.error, patched.error.includes('не найден') ? 404 : 400)
          saveDb(db)
          return json({ ...deliveryServicesPayload(db, shopUid), service: patched.service })
        }
        if (method === 'DELETE') {
          const denied = requireOwner(session)
          if (denied) return denied
          const result = deleteDeliveryService(db, shopUid, serviceId)
          if (result.error) return err(result.error, result.status ?? 404)
          saveDb(db)
          return json({ ...deliveryServicesPayload(db, shopUid), ok: true })
        }
      }
    }

    if (segments[2] === 'flowers' && !segments[3] && method === 'GET') {
      return json({
        flowers: db.storeFlowers
          .filter((sf) => sf.user_id === shopUid)
          .map((sf) => serializeStoreFlowerRow(db, shopUid, sf)),
      })
    }

    if (segments[2] === 'flowers' && segments[3] && segments[4] === 'care' && method === 'GET') {
      const flowerId = Number.parseInt(segments[3]!, 10)
      const detail = serializeStoreFlowerCareDetail(db, shopUid, flowerId, session)
      if (!detail) return err('Цветок не найден.', 404)
      return json(detail)
    }

    if (segments[2] === 'flowers' && segments[3] && method === 'PATCH') {
      const flowerId = Number.parseInt(segments[3]!, 10)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = patchStoreFlower(db, shopUid, flowerId, body)
      if (result.error) return err(result.error, result.error.includes('не найден') ? 404 : 400)
      saveDb(db)
      return json(result.flower)
    }

    if (segments[2] === 'flowers' && segments[3] === 'search' && method === 'GET') {
      const q = search.get('q') || ''
      const rawSid = (search.get('supplier_id') || '').trim()
      let supplierId: number | null = null
      if (rawSid) {
        supplierId = Number.parseInt(rawSid, 10)
        if (!Number.isFinite(supplierId)) return err('supplier_id: ожидается целое число.', 400)
      }
      const found = searchStoreFlowers(db, shopUid, q, supplierId)
      if (found.error) return err(found.error, found.status ?? 400)
      return json({ results: found.results ?? [] })
    }

    if (segments[2] === 'stock' && segments[3] === 'retail' && !segments[4] && method === 'GET') {
      const includeFinancials = session.role === 'owner'
      return json({
        products: db.retailProducts
          .filter((p) => p.user_id === shopUid)
          .map((p) => serializeRetailProductRow(p, includeFinancials)),
      })
    }

    if (segments[2] === 'stock' && segments[3] === 'consumables' && !segments[4] && method === 'GET') {
      const includeFinancials = session.role === 'owner'
      return json({
        consumables: db.consumables
          .filter((c) => c.user_id === shopUid)
          .map((c) => serializeConsumableRow(c, includeFinancials)),
      })
    }

    if (segments[2] === 'stock' && segments[3] === 'consumables' && !segments[4] && method === 'POST') {
      const denied = requireOwner(session)
      if (denied) return denied
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const created = createConsumable(db, shopUid, body, () => allocId(db))
      if (created.error) return err(created.error, 400)
      saveDb(db)
      return json(
        { consumable: serializeConsumableRow(created.consumable!, true) },
        201,
      )
    }

    if (
      segments[2] === 'stock' &&
      segments[3] === 'consumables' &&
      segments[4] &&
      !segments[5] &&
      (method === 'PATCH' || method === 'DELETE')
    ) {
      const denied = requireOwner(session)
      if (denied) return denied
      const consumableId = Number.parseInt(segments[4]!, 10)
      if (method === 'PATCH') {
        const body = await readJson(init)
        if (body === null) return err('Некорректный JSON.', 400)
        const patched = patchConsumable(db, shopUid, consumableId, body)
        if (patched.error) return err(patched.error, 404)
        saveDb(db)
        return json({ consumable: serializeConsumableRow(patched.consumable!, true) })
      }
      const deleted = deleteConsumable(db, shopUid, consumableId)
      if (deleted.error) return err(deleted.error, deleted.status ?? 404)
      saveDb(db)
      return json({ ok: true })
    }

    if (
      segments[2] === 'stock' &&
      segments[3] === 'consumables' &&
      segments[5] === 'intake' &&
      method === 'POST'
    ) {
      const denied = requireOwner(session)
      if (denied) return denied
      const consumableId = Number.parseInt(segments[4]!, 10)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = intakeConsumable(db, shopUid, consumableId, body, () => allocId(db))
      if (result.error) return err(result.error, 404)
      saveDb(db)
      return json({ consumable: serializeConsumableRow(result.consumable!, true) })
    }

    if (segments[2] === 'stock' && segments[3] === 'bouquets' && !segments[4] && method === 'GET') {
      const owner = findUser(db, shopUid)
      const includeCost = session.role === 'owner'
      return json({
        bouquets: listBouquetsForUser(db, shopUid, owner ?? undefined, includeCost, db.demoDay),
      })
    }

    if (segments[2] === 'stock' && segments[3] === 'inventory') {
      if (session.role !== 'owner') return err('Доступ только для владельца.', 403)
      const owner = findUser(db, shopUid)
      if (!owner) return err('Магазин не найден.', 404)

      if (!segments[4] && method === 'GET') {
        const lines = buildInventorySnapshot(db, shopUid)
        return json({
          ...inventoryMeta(db, owner),
          lines,
        })
      }
      if (segments[4] === 'history' && method === 'GET') {
        return json({ history: listInventoryHistory(db, shopUid) })
      }
      if (segments[4] === 'complete' && method === 'POST') {
        const body = await readJson(init)
        if (body === null) return err('Некорректный JSON.', 400)
        const result = completeInventory(db, shopUid, body.lines, () => allocId(db))
        if (result.error) return err(result.error, 400)
        saveDb(db)
        return json(result.detail, 201)
      }
      if (segments[4] && method === 'GET') {
        const invId = Number.parseInt(segments[4]!, 10)
        const inv = db.inventories.find((i) => i.id === invId && i.user_id === shopUid)
        if (!inv) return err('Инвентаризация не найдена.', 404)
        return json(serializeInventoryDetail(inv))
      }
    }

    if (segments[2] === 'stock' && segments[3] === 'orders' && !segments[4] && method === 'POST') {
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = createCustomerOrders(db, shopUid, body, () => allocId(db))
      if (result.error) return err(result.error, result.status ?? 400)
      saveDb(db)
      const orders = result.orders ?? []
      return json(
        {
          ...serializeStockList(db, session),
          orders: orders.map((o) => serializeCustomerOrderCare(o)),
          order: orders[0] ? serializeCustomerOrderCare(orders[0]) : undefined,
        },
        201,
      )
    }

    if (segments[2] === 'stock' && segments[3] === 'orders' && segments[4] && method === 'PATCH') {
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const action = String(body.action || '').trim()
      if (action !== 'handoff') return err('Неизвестное действие.', 400)
      const orderId = Number.parseInt(segments[4]!, 10)
      const result = completeCustomerOrderHandoff(db, shopUid, orderId, () => allocId(db))
      if (result.error) return err(result.error, result.error.includes('не найден') ? 404 : 400)
      saveDb(db)
      return json({ order: serializeCustomerOrderCare(result.order!) })
    }

    if (
      segments[2] === 'stock' &&
      segments[3] === 'supplier-deliveries' &&
      !segments[4] &&
      method === 'POST'
    ) {
      const denied = requireOwner(session)
      if (denied) return denied
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const result = createSupplierDelivery(db, shopUid, body, () => allocId(db))
      if (result.error) return err(result.error, result.status ?? 400)
      saveDb(db)
      return json(result.payload ?? { ok: true }, result.status ?? 201)
    }

    if (
      segments[2] === 'stock' &&
      segments[3] === 'supplier-deliveries' &&
      segments[4] &&
      method === 'PATCH'
    ) {
      const denied = requireOwner(session)
      if (denied) return denied
      const deliveryId = Number.parseInt(segments[4]!, 10)
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const action = body.action
      if (action === 'receive_delivery') {
        const rawLines = body.lines
        if (rawLines != null && !Array.isArray(rawLines)) {
          return err('lines должен быть массивом.', 400)
        }
        const receive = receiveSupplierDelivery(db, shopUid, deliveryId, body, () => allocId(db))
        if (receive.error) return err(receive.error, 400)
        saveDb(db)
        return json({ ok: true })
      }
      return err('Неизвестное action (receive_delivery).', 400)
    }

    if (segments[2] === 'stock' && method !== 'GET') {
      return err(`Операция склада не реализована (${method} …/${segments.slice(3).join('/')})`, 501)
    }

    if (segments[2] === 'flowers' && !segments[3] && method === 'POST') {
      const denied = requireOwner(session)
      if (denied) return denied
      const body = await readJson(init)
      if (body === null) return err('Некорректный JSON.', 400)
      const created = createStoreFlower(db, shopUid, body, () => allocId(db))
      if (created.error) return err(created.error, created.status ?? 400)
      saveDb(db)
      return json(
        {
          flowers: db.storeFlowers
            .filter((sf) => sf.user_id === shopUid)
            .map((sf) => serializeStoreFlowerRow(db, shopUid, sf)),
          flower: created.flower,
        },
        201,
      )
    }
    if (segments[2] === 'flowers' && segments[3] && !segments[4] && method === 'DELETE') {
      const flowerId = Number.parseInt(segments[3]!, 10)
      const sf = db.storeFlowers.find((s) => s.id === flowerId && s.user_id === shopUid)
      if (!sf) return err('Цветок не найден.', 404)
      if (db.batches.some((b) => b.store_flower_id === sf.id && b.quantity > 0)) {
        return err('Сначала спишите остаток по цветку.', 400)
      }
      db.storeFlowers = db.storeFlowers.filter((s) => s.id !== sf.id)
      db.basicCare = db.basicCare.filter((c) => c.store_flower_id !== sf.id)
      saveDb(db)
      return json({ ok: true })
    }
  }

  // market/* — витрина для покупателя (нужна любая сессия)
  if (segments[1] === 'market' && segments[2] === 'shops') {
    const uid = getSessionUserId()
    if (uid == null) return err('Требуется вход.', 401)
    if (!segments[3] && method === 'GET') {
      return json({ shops: listMarketShops(db) })
    }
    if (segments[3] && method === 'GET') {
      const shopId = Number.parseInt(segments[3]!, 10)
      const catalog = marketShopCatalog(db, shopId)
      if (!catalog) return err('Магазин не найден.', 404)
      return json(catalog)
    }
  }

  return err(`Маршрут не найден (${method} ${pathWithQuery})`, 404)
}
