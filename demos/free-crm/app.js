const DB_KEY = 'gcss-free.db'
const SESSION = 'gcss-free.session'
const PHONE_OK = 'gcss-free.phone'
const SKIP_AUTO = 'gcss-free.skipAutoLogin'
const OWNER_LOGIN = 'anna'

const VIEWS = ['home', 'clients', 'deals', 'tasks', 'roles']

const TITLES = {
  home: 'Главная',
  clients: 'Клиенты',
  deals: 'Сделки',
  tasks: 'Задачи',
  roles: 'Пользователи',
}

const EMPTY = {
  clients: 'Нет клиентов',
  deals: 'Нет сделок',
  tasks: 'Нет задач',
  roles: 'Нет пользователей',
}

const NEW_TITLE = {
  clients: 'Новый клиент',
  deals: 'Новая сделка',
  tasks: 'Новая задача',
  roles: 'Новый пользователь',
}

const EDIT_TITLE = {
  clients: 'Клиент',
  deals: 'Сделка',
  tasks: 'Задача',
  roles: 'Пользователь',
}

const STAGES = [
  ['new', 'Новая'],
  ['work', 'В работе'],
  ['won', 'Закрыта'],
  ['lost', 'Отказ'],
]

const PHONE_PREFIX = '+7 ('

const heading = document.querySelector('#heading')
const boardEl = document.querySelector('#board')
const listEl = document.querySelector('#list')
const emptyEl = document.querySelector('#empty')
const addBtn = document.querySelector('#add')
const dialog = document.querySelector('#editor')
const form = document.querySelector('#editor-form')
const fieldsEl = document.querySelector('#editor-fields')
const titleEl = document.querySelector('#editor-title')
const deleteBtn = document.querySelector('#editor-delete')
const cancelBtn = document.querySelector('#editor-cancel')

function isoOffset(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function seed() {
  return {
    roles: [
      { id: 'r1', name: 'Анна', role: 'Владелец', login: 'anna', password: 'demo' },
      { id: 'r2', name: 'Илья', role: 'Менеджер', login: 'ilya', password: 'demo' },
    ],
    clients: [
      { id: 'c1', name: 'Север', phone: '+7 (901) 100-20-30', note: 'Звонить после 11' },
      { id: 'c2', name: 'Ласточка', phone: '+7 (902) 200-30-40', note: '' },
      { id: 'c3', name: 'Мастерская', phone: '+7 (903) 300-40-50', note: 'Счёт на почту' },
    ],
    deals: [
      { id: 'd1', title: 'Поставка', clientId: 'c1', amount: 120000, stage: 'work' },
      { id: 'd2', title: 'Обслуживание', clientId: 'c2', amount: 48000, stage: 'new' },
      { id: 'd3', title: 'Договор', clientId: 'c3', amount: 90000, stage: 'won' },
    ],
    tasks: [
      { id: 't1', title: 'Позвонить', due: isoOffset(1), roleId: 'r2', done: false },
      { id: 't2', title: 'Отправить счёт', due: isoOffset(0), roleId: 'r1', done: false },
      { id: 't3', title: 'Уточнить срок', due: isoOffset(-1), roleId: 'r2', done: true },
    ],
  }
}

function readDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function writeDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function sessionLogin() {
  return localStorage.getItem(SESSION) || ''
}

function setSession(login) {
  if (login) localStorage.setItem(SESSION, login)
  else localStorage.removeItem(SESSION)
}

function load() {
  const fresh = seed()
  const saved = readDb()
  const next = {}
  for (const key of Object.keys(fresh)) {
    const list = saved && Array.isArray(saved[key]) ? saved[key] : null
    next[key] = key === 'roles' && list ? withLogins(list) : list || fresh[key]
  }
  if (['clients', 'deals', 'tasks'].every((key) => next[key].length === 0)) {
    next.clients = fresh.clients
    next.deals = fresh.deals
    next.tasks = fresh.tasks
  }
  if (!next.roles.some((item) => item.login && item.password)) next.roles = fresh.roles
  writeDb(next)
  return next
}

const ROLE_TITLES = ['Владелец', 'Менеджер']

let state = load()

function save() {
  writeDb(state)
}

function uid() {
  return Math.random().toString(36).slice(2, 8)
}

function withLogins(roles) {
  const known = {
    r1: { login: 'anna', password: 'demo', role: 'Владелец' },
    r2: { login: 'ilya', password: 'demo', role: 'Менеджер' },
  }
  return roles.map((role) => {
    const extra = known[role.id]
    const title = role.role === 'Руководитель' ? 'Владелец' : role.role
    return {
      ...role,
      role: ROLE_TITLES.includes(title) ? title : extra?.role || 'Менеджер',
      login: role.login || extra?.login || '',
      password: role.password || extra?.password || '',
    }
  })
}

function isOwner() {
  return currentUser()?.role === 'Владелец'
}

function view() {
  const name = location.hash.slice(1)
  if (name === 'roles' && !isOwner()) return 'home'
  return VIEWS.includes(name) ? name : 'home'
}

function phoneDigits(value) {
  let digits = String(value).replace(/\D/g, '')
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`
  if (digits.startsWith('7')) digits = digits.slice(1)
  return digits.slice(0, 10)
}

function formatRuPhone(value) {
  const digits = phoneDigits(value)
  if (!digits.length) return PHONE_PREFIX
  let formatted = `${PHONE_PREFIX}${digits.slice(0, 3)}`
  if (digits.length < 3) return formatted
  formatted += `) ${digits.slice(3, 6)}`
  if (digits.length <= 6) return formatted
  formatted += `-${digits.slice(6, 8)}`
  if (digits.length <= 8) return formatted
  return `${formatted}-${digits.slice(8, 10)}`
}

function bindPhone(input) {
  const place = (pos) => {
    requestAnimationFrame(() => input.setSelectionRange(pos, pos))
  }
  input.addEventListener('focus', () => {
    if (!input.value.startsWith('+7')) input.value = PHONE_PREFIX
    if ((input.selectionStart ?? 0) < PHONE_PREFIX.length) place(input.value.length)
  })
  input.addEventListener('blur', () => {
    if (phoneDigits(input.value).length === 0) input.value = ''
  })
  input.addEventListener('input', () => {
    const raw = input.value
    const start = input.selectionStart ?? raw.length
    const fromEnd = raw.length - start
    const formatted = formatRuPhone(raw)
    input.value = formatted
    place(Math.max(PHONE_PREFIX.length, formatted.length - fromEnd))
  })
  input.addEventListener('keydown', (event) => {
    const start = input.selectionStart
    const end = input.selectionEnd
    if (start == null || end == null || start !== end) return
    if ((event.key === 'Backspace' && start <= PHONE_PREFIX.length) || (event.key === 'Delete' && start < PHONE_PREFIX.length)) {
      event.preventDefault()
      input.value = PHONE_PREFIX
      place(PHONE_PREFIX.length)
      return
    }
    if (event.key !== 'Backspace') return
    const charBefore = input.value[start - 1]
    if (charBefore === ' ' || charBefore === '-' || charBefore === '(' || charBefore === ')') {
      event.preventDefault()
      const formatted = formatRuPhone(phoneDigits(input.value).slice(0, -1))
      input.value = formatted
      place(formatted.length)
    }
  })
}

function phoneOrEmpty(input) {
  const digits = phoneDigits(input.value)
  if (digits.length === 0) {
    input.setCustomValidity('')
    return ''
  }
  if (digits.length !== 10) {
    input.setCustomValidity('Введите номер полностью: +7 (999) 999-99-99')
    input.reportValidity()
    return null
  }
  input.setCustomValidity('')
  return formatRuPhone(input.value)
}

function showDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function showMoney(amount) {
  return `${new Intl.NumberFormat('ru-RU').format(Number(amount) || 0)} ₽`
}

function stageLabel(stage) {
  return STAGES.find(([value]) => value === stage)?.[1] ?? 'Новая'
}

function clientName(id) {
  return state.clients.find((item) => item.id === id)?.name || '—'
}

function roleName(id) {
  return state.roles.find((item) => item.id === id)?.name || ''
}

function backHref() {
  const from = new URLSearchParams(location.search).get('from')
  if (!from || !from.startsWith('/') || from.startsWith('//') || from.startsWith('/crm/demo/')) {
    return '/crm/free/'
  }
  return from
}

function field(label, control) {
  const wrap = document.createElement(control.classList?.contains('pick') ? 'div' : 'label')
  wrap.className = 'field'
  const caption = document.createElement('span')
  caption.textContent = label
  wrap.append(caption, control)
  return wrap
}

function closePicks() {
  for (const menu of document.querySelectorAll('.pick__menu')) {
    menu.hidden = true
    menu.previousElementSibling?.setAttribute('aria-expanded', 'false')
  }
}

function mountPick(options, current, placeholder) {
  const root = document.createElement('div')
  root.className = 'pick'
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'pick__btn'
  btn.setAttribute('aria-haspopup', 'listbox')
  const label = document.createElement('span')
  label.className = 'pick__label'
  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  chevron.setAttribute('viewBox', '0 0 16 16')
  chevron.setAttribute('aria-hidden', 'true')
  chevron.classList.add('pick__chevron')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M3.5 6.5 8 11l4.5-4.5')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '1.5')
  path.setAttribute('stroke-linecap', 'round')
  path.setAttribute('stroke-linejoin', 'round')
  chevron.append(path)
  const menu = document.createElement('ul')
  menu.className = 'pick__menu'
  menu.hidden = true
  menu.setAttribute('role', 'listbox')
  let value = options.some((item) => item.value === current) ? current : ''

  function paint() {
    const found = options.find((item) => item.value === value)
    label.textContent = found ? found.label : placeholder
    label.classList.toggle('is-placeholder', !found)
    btn.setAttribute('aria-expanded', String(!menu.hidden))
    for (const option of menu.querySelectorAll('.pick__option')) {
      option.setAttribute('aria-selected', String(option.dataset.value === value))
    }
  }

  function openMenu() {
    const rect = btn.getBoundingClientRect()
    menu.style.left = `${rect.left}px`
    menu.style.width = `${rect.width}px`
    menu.style.top = `${rect.bottom + 4}px`
    menu.hidden = false
    paint()
  }

  for (const item of options) {
    const li = document.createElement('li')
    const option = document.createElement('button')
    option.type = 'button'
    option.className = 'pick__option'
    option.dataset.value = item.value
    option.setAttribute('role', 'option')
    option.textContent = item.label
    option.addEventListener('click', (event) => {
      event.stopPropagation()
      value = item.value
      menu.hidden = true
      root.classList.remove('is-invalid')
      paint()
    })
    li.append(option)
    menu.append(li)
  }

  btn.addEventListener('click', (event) => {
    event.stopPropagation()
    const willOpen = menu.hidden
    closePicks()
    if (willOpen) openMenu()
  })

  btn.append(label, chevron)
  root.append(btn, menu)
  paint()

  return {
    el: root,
    get: () => value,
    markInvalid() {
      root.classList.add('is-invalid')
    },
  }
}

function textInput(value) {
  const input = document.createElement('input')
  input.type = 'text'
  input.value = value ?? ''
  input.required = true
  input.autocomplete = 'off'
  return input
}

function homeColumn(title, rows, kind) {
  const panel = document.createElement('section')
  panel.className = 'panel'
  const head = document.createElement('h2')
  head.textContent = title
  panel.append(head)
  if (!rows.length) {
    const empty = document.createElement('p')
    empty.className = 'panel__empty'
    empty.textContent = 'Нет записей'
    panel.append(empty)
    return panel
  }
  const list = document.createElement('ul')
  list.className = 'list'
  for (const row of rows) {
    const item = document.createElement('li')
    item.className = 'item'
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'item__main'
    const name = document.createElement('span')
    name.className = 'item__title'
    name.textContent = kind === 'clients' ? row.name || '—' : row.title || '—'
    const meta = document.createElement('span')
    meta.className = 'item__meta'
    if (kind === 'clients') meta.textContent = [row.phone, row.note].filter(Boolean).join(' · ')
    else if (kind === 'tasks') meta.textContent = [showDate(row.due), roleName(row.roleId)].filter(Boolean).join(' · ')
    else meta.textContent = `${clientName(row.clientId)} · ${showMoney(row.amount)} · ${stageLabel(row.stage)}`
    button.append(name)
    if (meta.textContent) button.append(meta)
    button.addEventListener('click', () => openEditor(kind, row))
    item.append(button)
    list.append(item)
  }
  panel.append(list)
  return panel
}

function renderHome() {
  boardEl.replaceChildren()
  const cols = document.createElement('div')
  cols.className = 'board__cols'
  cols.append(
    homeColumn('Клиенты', state.clients, 'clients'),
    homeColumn('Сделки', state.deals, 'deals'),
    homeColumn('Задачи', state.tasks, 'tasks'),
  )
  boardEl.append(cols)
}

function render() {
  const current = view()
  heading.textContent = TITLES[current]
  addBtn.hidden = current === 'home'
  boardEl.hidden = current !== 'home'
  emptyEl.textContent = EMPTY[current] || ''
  for (const link of document.querySelectorAll('.nav a')) {
    link.hidden = link.dataset.view === 'roles' && !isOwner()
    if (link.dataset.view === current) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }

  listEl.replaceChildren()
  if (current === 'home') {
    emptyEl.hidden = true
    renderHome()
    return
  }

  boardEl.replaceChildren()
  const rows = state[current]
  emptyEl.hidden = rows.length > 0

  for (const row of rows) {
    const item = document.createElement('li')
    item.className = 'item'

    if (current === 'tasks') {
      const check = document.createElement('input')
      check.className = 'item__check'
      check.type = 'checkbox'
      check.checked = Boolean(row.done)
      check.setAttribute('aria-label', 'Готово')
      check.addEventListener('change', () => {
        row.done = check.checked
        save('tasks')
        render()
      })
      item.append(check)
    }

    const open = document.createElement('button')
    open.type = 'button'
    open.className = 'item__main'
    const title = document.createElement('span')
    title.className = 'item__title'
    const meta = document.createElement('span')
    meta.className = 'item__meta'

    if (current === 'clients') {
      title.textContent = row.name || '—'
      meta.textContent = [row.phone, row.note].filter(Boolean).join(' · ')
    } else if (current === 'deals') {
      title.textContent = row.title || '—'
      meta.textContent = `${clientName(row.clientId)} · ${showMoney(row.amount)} · ${stageLabel(row.stage)}`
    } else if (current === 'tasks') {
      title.textContent = row.title || '—'
      title.classList.toggle('is-done', Boolean(row.done))
      meta.textContent = [showDate(row.due), roleName(row.roleId)].filter(Boolean).join(' · ')
    } else {
      title.textContent = row.name || '—'
      meta.textContent = [row.role, row.login].filter(Boolean).join(' · ')
    }

    open.append(title)
    if (meta.textContent) open.append(meta)
    open.addEventListener('click', () => openEditor(current, row))
    item.append(open)
    listEl.append(item)
  }
}

function openEditor(kind, record) {
  if (kind === 'roles' && !isOwner()) return
  const isNew = !record
  titleEl.textContent = isNew ? NEW_TITLE[kind] : EDIT_TITLE[kind]
  fieldsEl.replaceChildren()
  deleteBtn.hidden = isNew

  const controls = {}

  if (kind === 'clients') {
    controls.name = textInput(record?.name)
    controls.phone = document.createElement('input')
    controls.phone.type = 'tel'
    controls.phone.inputMode = 'tel'
    controls.phone.autocomplete = 'tel'
    controls.phone.maxLength = 18
    controls.phone.placeholder = '+7 (___) ___-__-__'
    controls.phone.value = record?.phone || ''
    bindPhone(controls.phone)
    controls.note = document.createElement('textarea')
    controls.note.rows = 3
    controls.note.value = record?.note || ''
    fieldsEl.append(
      field('Имя', controls.name),
      field('Телефон', controls.phone),
      field('Заметка', controls.note),
    )
  } else if (kind === 'deals') {
    controls.title = textInput(record?.title)
    controls.clientId = mountPick(
      state.clients.map((client) => ({ value: client.id, label: client.name })),
      record?.clientId || '',
      'Выберите',
    )
    controls.amount = document.createElement('input')
    controls.amount.type = 'text'
    controls.amount.inputMode = 'numeric'
    controls.amount.value = record ? String(record.amount ?? 0) : ''
    controls.stage = mountPick(
      STAGES.map(([value, label]) => ({ value, label })),
      STAGES.some(([value]) => value === record?.stage) ? record.stage : 'new',
      'Новая',
    )
    fieldsEl.append(
      field('Название', controls.title),
      field('Клиент', controls.clientId.el),
      field('Сумма', controls.amount),
      field('Статус', controls.stage.el),
    )
  } else if (kind === 'tasks') {
    controls.title = textInput(record?.title)
    controls.due = document.createElement('input')
    controls.due.type = 'date'
    controls.due.value = record?.due || ''
    controls.roleId = mountPick(
      [{ value: '', label: '—' }, ...state.roles.map((role) => ({ value: role.id, label: role.name }))],
      record?.roleId || '',
      '—',
    )
    controls.done = document.createElement('input')
    controls.done.type = 'checkbox'
    controls.done.checked = Boolean(record?.done)
    const check = document.createElement('label')
    check.className = 'check'
    const checkText = document.createElement('span')
    checkText.textContent = 'Готово'
    check.append(controls.done, checkText)
    fieldsEl.append(
      field('Что сделать', controls.title),
      field('Срок', controls.due),
      field('Кто', controls.roleId.el),
      check,
    )
  } else {
    controls.name = textInput(record?.name)
    controls.role = mountPick(
      ROLE_TITLES.map((title) => ({ value: title, label: title })),
      ROLE_TITLES.includes(record?.role) ? record.role : 'Менеджер',
      'Менеджер',
    )
    controls.login = textInput(record?.login)
    controls.login.autocomplete = 'off'
    controls.password = document.createElement('input')
    controls.password.type = 'password'
    controls.password.autocomplete = 'new-password'
    controls.password.required = true
    controls.password.value = record?.password || ''
    fieldsEl.append(
      field('Имя', controls.name),
      field('Роль', controls.role.el),
      field('Логин', controls.login),
      field('Пароль', controls.password),
    )
  }

  form.onsubmit = (event) => {
    event.preventDefault()
    if (!form.reportValidity()) return

    if (kind === 'clients') {
      const phone = phoneOrEmpty(controls.phone)
      if (phone == null) return
      const next = {
        id: record?.id || uid(),
        name: controls.name.value.trim(),
        phone,
        note: controls.note.value.trim(),
      }
      if (isNew) state.clients.unshift(next)
      else Object.assign(record, next)
      save('clients')
    } else if (kind === 'deals') {
      if (!controls.clientId.get()) {
        controls.clientId.markInvalid()
        return
      }
      const next = {
        id: record?.id || uid(),
        title: controls.title.value.trim(),
        clientId: controls.clientId.get(),
        amount: Math.max(0, Math.round(Number(String(controls.amount.value).replace(/\s/g, '')) || 0)),
        stage: controls.stage.get() || 'new',
      }
      if (isNew) state.deals.unshift(next)
      else Object.assign(record, next)
      save('deals')
    } else if (kind === 'tasks') {
      const next = {
        id: record?.id || uid(),
        title: controls.title.value.trim(),
        due: controls.due.value,
        roleId: controls.roleId.get(),
        done: controls.done.checked,
      }
      if (isNew) state.tasks.unshift(next)
      else Object.assign(record, next)
      save('tasks')
    } else {
      const login = controls.login.value.trim()
      const taken = state.roles.some((item) => item.login === login && item.id !== record?.id)
      if (taken) {
        controls.login.setCustomValidity('Такой логин уже есть')
        controls.login.reportValidity()
        return
      }
      controls.login.setCustomValidity('')
      const previous = record?.login
      const next = {
        id: record?.id || uid(),
        name: controls.name.value.trim(),
        role: controls.role.get() || 'Менеджер',
        login,
        password: controls.password.value,
      }
      if (isNew) state.roles.unshift(next)
      else Object.assign(record, next)
      save('roles')
      if (previous && previous === sessionLogin() && previous !== next.login) setSession(next.login)
    }

    dialog.close()
    render()
  }

  deleteBtn.onclick = () => {
    if (!record || !confirm('Удалить?')) return
    const wasSelf = kind === 'roles' && record.login && record.login === sessionLogin()
    state[kind] = state[kind].filter((item) => item.id !== record.id)
    save()
    dialog.close()
    if (wasSelf) {
      setSession('')
      showApp()
      return
    }
    render()
  }

  showQuiet(dialog)
}

const loginEl = document.querySelector('#login')
const appEl = document.querySelector('#app')
const userEl = document.querySelector('#user')
const logoutBtn = document.querySelector('#logout')
const loginError = document.querySelector('#login-error')
const loginName = document.querySelector('#login-name')
const loginPass = document.querySelector('#login-pass')
const badge = document.querySelector('#badge')
const badgeToggle = document.querySelector('#badge-toggle')

function currentUser() {
  const login = sessionLogin()
  if (!login) return null
  return state.roles.find((item) => item.login === login) || null
}

function fillAccounts() {
  const list = document.querySelector('#accounts')
  list.replaceChildren()
  const accounts = state.roles.filter((item) => item.login && item.password)
  for (const account of accounts) {
    const li = document.createElement('li')
    const button = document.createElement('button')
    button.type = 'button'
    const who = document.createElement('span')
    who.textContent = account.name
    const role = document.createElement('span')
    role.className = 'accounts__role'
    role.textContent = account.role
    const creds = document.createElement('span')
    creds.className = 'accounts__creds'
    creds.textContent = `${account.login} / ${account.password}`
    const person = document.createElement('span')
    person.append(who, role)
    button.append(person, creds)
    button.addEventListener('click', () => {
      loginName.value = account.login
      loginPass.value = account.password
      loginError.hidden = true
    })
    li.append(button)
    list.append(li)
  }
}

function closeBadge() {
  badge.classList.remove('is-open')
  badgeToggle.setAttribute('aria-expanded', 'false')
  syncChip()
}

function closeShellDialogs() {
  if (typeof callDialog !== 'undefined' && callDialog.open) callDialog.close()
  if (typeof phoneGate !== 'undefined' && phoneGate.open) phoneGate.close()
  if (dialog.open) dialog.close()
}

function ensureRecords() {
  const fresh = seed()
  const keys = ['clients', 'deals', 'tasks']
  if (!keys.every((key) => Array.isArray(state[key]) && state[key].length === 0)) return
  state.clients = fresh.clients
  state.deals = fresh.deals
  state.tasks = fresh.tasks
  save()
}

function showApp() {
  const user = currentUser()
  closeShellDialogs()
  loginEl.hidden = Boolean(user)
  appEl.hidden = !user
  document.querySelector('#call-open').hidden = !user
  closeBadge()
  if (typeof armShell === 'function') armShell(Boolean(user))
  if (!user) {
    loginName.value = ''
    loginPass.value = ''
    fillAccounts()
    return
  }
  ensureRecords()
  userEl.textContent = `${user.name} · ${user.role}`
  render()
}

function bootSession() {
  if (currentUser()) return
  if (sessionStorage.getItem(SKIP_AUTO) === '1') return
  setSession(OWNER_LOGIN)
}

document.querySelector('#login-form').addEventListener('submit', (event) => {
  event.preventDefault()
  const account = state.roles.find(
    (item) => item.login === loginName.value.trim() && item.password === loginPass.value,
  )
  if (!account) {
    loginError.hidden = false
    loginError.textContent = 'Неверный логин или пароль'
    return
  }
  loginError.hidden = true
  sessionStorage.removeItem(SKIP_AUTO)
  setSession(account.login)
  showApp()
})

addBtn.addEventListener('click', () => openEditor(view(), null))
cancelBtn.addEventListener('click', () => dialog.close())
document.querySelector('#reset').addEventListener('click', () => {
  if (!confirm('Сбросить демо к исходным данным?')) return
  state = seed()
  save()
  sessionStorage.setItem(SKIP_AUTO, '1')
  setSession('')
  location.hash = ''
  location.reload()
})
logoutBtn.addEventListener('click', () => {
  sessionStorage.setItem(SKIP_AUTO, '1')
  setSession('')
  location.hash = ''
  showApp()
})
badgeToggle.addEventListener('click', (event) => {
  event.preventDefault()
  event.stopPropagation()
  const open = !badge.classList.contains('is-open')
  closePicks()
  badge.classList.toggle('is-open', open)
  badgeToggle.setAttribute('aria-expanded', String(open))
  syncChip()
})
document.addEventListener('mousedown', (event) => {
  if (!badge.classList.contains('is-open')) return
  if (!(event.target instanceof Element)) return
  if (event.target.closest('#badge')) return
  closeBadge()
})
document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return
  if (!event.target.closest('.pick')) closePicks()
})
document.querySelector('#back').href = backHref()

const leadOpenedAt = Date.now()
const WELCOME_SEEN = 'gcss-free.tipSeen.welcome'
const welcome = document.querySelector('#welcome')
const callDialog = document.querySelector('#call')
const phoneGate = document.querySelector('#phone-gate')
const callChip = document.querySelector('#call-chip')
const callPhone = document.querySelector('#call-phone')
const gatePhone = document.querySelector('#gate-phone')
bindPhone(callPhone)
bindPhone(gatePhone)

async function postLead(input) {
  const response = await fetch('https://gcss-tg-leads.diatsht.workers.dev/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, openedAt: leadOpenedAt }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.ok) {
    const error = new Error('lead')
    error.code = data.code || 'unknown'
    throw error
  }
}

async function sendLead(input) {
  try {
    await postLead(input)
  } catch (error) {
    if (error.code !== 'too_fast') throw error
    const wait = Math.max(0, 10000 - (Date.now() - leadOpenedAt) + 250)
    await new Promise((resolve) => window.setTimeout(resolve, wait))
    await postLead(input)
  }
}

function requiredPhone(input) {
  const phone = phoneOrEmpty(input)
  if (phone) return phone
  input.setCustomValidity('Введите номер полностью: +7 (999) 999-99-99')
  input.reportValidity()
  return null
}

let chipReady = false

function syncChip() {
  if (!callChip) return
  const menuOpen = badge.classList.contains('is-open')
  const dialogOpen = Boolean(callDialog && callDialog.open)
  callChip.hidden = !chipReady || menuOpen || dialogOpen || !currentUser()
}

function openCall() {
  badge.classList.remove('is-open')
  badgeToggle.setAttribute('aria-expanded', 'false')
  document.querySelector('#call-body').hidden = false
  document.querySelector('#call-done').hidden = true
  document.querySelector('#call-error').hidden = true
  showQuiet(callDialog)
  syncChip()
}

document.querySelector('#call-open').addEventListener('click', openCall)
callChip.addEventListener('click', openCall)
document.querySelector('#call-close').addEventListener('click', () => callDialog.close())
callDialog.addEventListener('close', syncChip)
callDialog.addEventListener('click', (event) => {
  if (event.target === callDialog) callDialog.close()
})
document.querySelector('#call-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const phone = requiredPhone(callPhone)
  if (!phone) return
  const errorEl = document.querySelector('#call-error')
  errorEl.hidden = true
  try {
    await sendLead({
      name: document.querySelector('#call-name').value.trim() || 'Заявка с демо',
      phone,
      source: 'free-demo-call',
      message: 'Заказать звонок',
    })
    document.querySelector('#call-body').hidden = true
    document.querySelector('#call-done').hidden = false
  } catch {
    errorEl.hidden = false
    errorEl.textContent = 'Не удалось отправить заявку.'
  }
})

phoneGate.addEventListener('cancel', (event) => event.preventDefault())
document.querySelector('#phone-gate-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const phone = requiredPhone(gatePhone)
  if (!phone) return
  const errorEl = document.querySelector('#gate-error')
  errorEl.hidden = true
  try {
    await sendLead({
      name: 'Демо CRM',
      phone,
      source: 'free-demo-phone',
    })
    localStorage.setItem(PHONE_OK, '1')
    phoneGate.close()
  } catch {
    errorEl.hidden = false
    errorEl.textContent = 'Не удалось отправить номер.'
  }
})

let chipTimer = 0
let gateTimer = 0

function armShell(active) {
  window.clearTimeout(chipTimer)
  window.clearTimeout(gateTimer)
  chipReady = false
  syncChip()
  if (!active) return
  chipTimer = window.setTimeout(() => {
    if (!currentUser()) return
    chipReady = true
    syncChip()
  }, 10000)
  gateTimer = window.setTimeout(openPhoneGate, 120000)
}

function openPhoneGate() {
  if (!currentUser() || localStorage.getItem(PHONE_OK)) return
  if (welcome.open || callDialog.open) {
    const waiter = welcome.open ? welcome : callDialog
    waiter.addEventListener('close', openPhoneGate, { once: true })
    return
  }
  showQuiet(phoneGate)
}

function showQuiet(dialogEl) {
  if (!dialogEl.open) dialogEl.showModal()
  dialogEl.focus({ preventScroll: true })
}
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close()
})
window.addEventListener('hashchange', () => {
  if (currentUser()) render()
})
welcome.addEventListener('close', () => {
  sessionStorage.setItem(WELCOME_SEEN, '1')
})
welcome.addEventListener('click', (event) => {
  if (event.target === welcome) welcome.close()
})
document.querySelector('#welcome-ok').addEventListener('click', () => welcome.close())

bootSession()
showApp()
if (sessionStorage.getItem(WELCOME_SEEN) !== '1') showQuiet(welcome)
