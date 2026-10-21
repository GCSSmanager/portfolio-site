import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { apiFetch } from '../api/apiFetch'
import { useCrmConfirm } from '../hooks/useCrmConfirm'
import { CrmTextField } from '../components/form'
import { CrmButton } from '../components/ui/CrmButton'
import { CrmPageStatus } from '../components/ui/CrmPageStatus'
import { CrmPageToolbar } from '../components/ui/CrmPageToolbar'
import { applyPhoneFieldChange, formatRuPhoneMasked } from '../auth/phoneInput'
import '../auth/staffPage.css'

type StaffRow = { id: number; name: string; phone: string | null; login: string }

type DialogState = null | { mode: 'phone' | 'password' | 'name'; row: StaffRow }

export function StaffPage() {
  const { ask, dialog: confirmDialog } = useCrmConfirm()
  const [staff, setStaff] = useState<StaffRow[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [phoneDigits, setPhoneDigits] = useState('')
  const [staffName, setStaffName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const [dialog, setDialog] = useState<DialogState>(null)
  const [editPhoneDigits, setEditPhoneDigits] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editName, setEditName] = useState('')
  const [dialogErr, setDialogErr] = useState<string | null>(null)
  const [dialogBusy, setDialogBusy] = useState(false)

  const load = useCallback(() => {
    setLoadErr(null)
    return apiFetch('/api/auth/staff/')
      .then(async (res) => {
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? `Ошибка ${res.status}`)
        }
        return res.json() as Promise<{ staff: StaffRow[] }>
      })
      .then((data) => setStaff(data.staff ?? []))
      .catch((e: unknown) => setLoadErr(e instanceof Error ? e.message : 'Не удалось загрузить список'))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openNameDialog = (row: StaffRow) => {
    setEditName(row.name)
    setDialogErr(null)
    setDialog({ mode: 'name', row })
  }

  const openPhoneDialog = (row: StaffRow) => {
    setEditPhoneDigits('')
    setDialogErr(null)
    setDialog({ mode: 'phone', row })
  }

  const openPasswordDialog = (row: StaffRow) => {
    setEditPassword('')
    setDialogErr(null)
    setDialog({ mode: 'password', row })
  }

  const closeDialog = () => {
    setDialog(null)
    setDialogErr(null)
    setDialogBusy(false)
    setEditPhoneDigits('')
    setEditPassword('')
    setEditName('')
  }

  const submitCreate = (e: FormEvent) => {
    e.preventDefault()
    setFormErr(null)
    setOkMsg(null)
    if (phoneDigits.length !== 11 || password.length < 6 || !staffName.trim()) return
    setBusy(true)
    void apiFetch('/api/auth/staff/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: staffName.trim(), phone: phoneDigits, password }),
    })
      .then(async (res) => {
        const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
        if (!res.ok) {
          setFormErr(j.error ?? `Ошибка ${res.status}`)
          return
        }
        setPassword('')
        setStaffName('')
        setOkMsg('Флорист добавлен. Он может войти по этому номеру.')
        await load()
      })
      .catch(() => setFormErr('Запрос не выполнен'))
      .finally(() => setBusy(false))
  }

  const submitDialog = (e: FormEvent) => {
    e.preventDefault()
    if (!dialog) return
    setDialogErr(null)
    if (dialog.mode === 'phone') {
      if (editPhoneDigits.length !== 11) {
        setDialogErr('Введите номер полностью.')
        return
      }
      setDialogBusy(true)
      void apiFetch(`/api/auth/staff/${dialog.row.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: editPhoneDigits }),
      })
        .then(async (res) => {
          const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; user?: StaffRow }
          if (!res.ok) {
            setDialogErr(j.error ?? `Ошибка ${res.status}`)
            return
          }
          closeDialog()
          setOkMsg('Номер обновлён.')
          await load()
        })
        .catch(() => setDialogErr('Запрос не выполнен'))
        .finally(() => setDialogBusy(false))
      return
    }

    if (dialog.mode === 'name') {
      const n = editName.trim()
      if (!n) {
        setDialogErr('Укажите имя.')
        return
      }
      setDialogBusy(true)
      void apiFetch(`/api/auth/staff/${dialog.row.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n }),
      })
        .then(async (res) => {
          const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
          if (!res.ok) {
            setDialogErr(j.error ?? `Ошибка ${res.status}`)
            return
          }
          closeDialog()
          setOkMsg('Имя обновлено.')
          await load()
        })
        .catch(() => setDialogErr('Запрос не выполнен'))
        .finally(() => setDialogBusy(false))
      return
    }

    if (editPassword.length < 6) {
      setDialogErr('Пароль: не менее 6 символов.')
      return
    }
    setDialogBusy(true)
    void apiFetch(`/api/auth/staff/${dialog.row.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: editPassword }),
    })
      .then(async (res) => {
        const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
        if (!res.ok) {
          setDialogErr(j.error ?? `Ошибка ${res.status}`)
          return
        }
        closeDialog()
        setOkMsg('Новый пароль сохранён. Сообщите его сотруднику.')
        await load()
      })
      .catch(() => setDialogErr('Запрос не выполнен'))
      .finally(() => setDialogBusy(false))
  }

  const removeStaff = (row: StaffRow) => {
    const name = row.name || 'без имени'
    const phone = formatRuPhoneMasked(row.phone ?? '')
    ask({
      title: `Удалить флориста «${name}»?`,
      message: `Номер ${phone}.\nВход по этому номеру перестанет работать.`,
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        setLoadErr(null)
        setOkMsg(null)
        const res = await apiFetch(`/api/auth/staff/${row.id}/`, { method: 'DELETE' })
        const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
        if (!res.ok) {
          setLoadErr(j.error ?? `Ошибка ${res.status}`)
          return
        }
        setOkMsg('Аккаунт удалён.')
        await load()
      },
    })
  }

  const authReady = phoneDigits.length === 11 && password.length >= 6 && staffName.trim().length > 0
  const dialogPhoneReady = editPhoneDigits.length === 11
  const dialogPasswordReady = editPassword.length >= 6
  const dialogNameReady = editName.trim().length > 0
  const dialogSaveDisabled =
    dialogBusy ||
    (dialog?.mode === 'phone' && !dialogPhoneReady) ||
    (dialog?.mode === 'password' && !dialogPasswordReady) ||
    (dialog?.mode === 'name' && !dialogNameReady)

  return (
    <div className="flowers-page staff-page">
      <CrmPageToolbar
        className="staff-page__head"
        title="Флористы"
        lead="Зарегистрируйте сотрудников по номеру телефона. У них общий склад магазина и подписка владельца; доступ к закупкам и ценам только у вас."
      />

      <CrmPageStatus error={loadErr} variant="text" />

      <section className="staff-page__card" aria-labelledby="staff-add-h">
        <h2 id="staff-add-h" className="staff-page__sub">
          Добавить флориста
        </h2>
        <form className="staff-page__form" onSubmit={submitCreate}>
          <CrmTextField
            label="Имя"
            id="staff-name"
            type="text"
            autoComplete="name"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            placeholder="как отображать в списке"
          />
          <CrmTextField
            label="Телефон"
            id="staff-phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={formatRuPhoneMasked(phoneDigits)}
            onChange={(e) => {
              setPhoneDigits(
                applyPhoneFieldChange(phoneDigits, formatRuPhoneMasked(phoneDigits), e.target.value),
              )
            }}
            placeholder="+7 (900) 123-45-67"
          />
          <CrmTextField
            label="Пароль"
            id="staff-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="не менее 6 символов"
          />
          {formErr ? (
            <p className="staff-page__form-err" role="alert">
              {formErr}
            </p>
          ) : null}
          {okMsg ? (
            <p className="staff-page__form-ok" role="status">
              {okMsg}
            </p>
          ) : null}
          <CrmButton type="submit" variant="staffSubmit" disabled={!authReady || busy}>
            {busy ? 'Сохранение…' : 'Создать аккаунт'}
          </CrmButton>
        </form>
      </section>

      <section className="staff-page__card" aria-labelledby="staff-list-h">
        <h2 id="staff-list-h" className="staff-page__sub">
          Зарегистрированные
        </h2>
        {staff === null ? (
          <CrmPageStatus loading variant="text" />
        ) : staff.length === 0 ? (
          <p className="staff-page__muted">Пока никого нет.</p>
        ) : (
          <ul className="staff-page__list">
            {staff.map((u) => (
              <li key={u.id} className="staff-page__row">
                <div className="staff-page__row-main">
                  <span className="staff-page__staff-name">{u.name || '—'}</span>
                  <div className="staff-page__row-meta">
                    <span className="staff-page__mono">{formatRuPhoneMasked(u.phone ?? '')}</span>
                    <span className="staff-page__muted">{u.login}</span>
                  </div>
                </div>
                <div className="staff-page__row-actions" role="toolbar" aria-label="Действия с сотрудником">
                  <CrmButton variant="staffChip" onClick={() => openNameDialog(u)}>
                    Имя
                  </CrmButton>
                  <CrmButton variant="staffChip" onClick={() => openPhoneDialog(u)}>
                    Телефон
                  </CrmButton>
                  <CrmButton variant="staffChip" onClick={() => openPasswordDialog(u)}>
                    Пароль
                  </CrmButton>
                  <CrmButton variant="staffChipDanger" onClick={() => removeStaff(u)}>
                    Удалить
                  </CrmButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dialog ? (
        <div
          className="staff-page__backdrop"
          role="presentation"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget && !dialogBusy) closeDialog()
          }}
        >
          <div className="staff-page__modal" role="dialog" aria-modal="true" aria-labelledby="staff-dlg-title">
            <h3 id="staff-dlg-title" className="staff-page__modal-title">
              {dialog.mode === 'phone' ? 'Номер телефона' : dialog.mode === 'name' ? 'Имя' : 'Новый пароль'}
            </h3>
            <form className="staff-page__modal-form" onSubmit={submitDialog}>
              {dialog.mode === 'phone' ? (
                <CrmTextField
                  label="Телефон"
                  id="staff-edit-phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={formatRuPhoneMasked(editPhoneDigits)}
                  onChange={(e) => {
                    setDialogErr(null)
                    setEditPhoneDigits(
                      applyPhoneFieldChange(editPhoneDigits, formatRuPhoneMasked(editPhoneDigits), e.target.value),
                    )
                  }}
                  placeholder="+7 (900) 123-45-67"
                />
              ) : dialog.mode === 'name' ? (
                <CrmTextField
                  label="Имя"
                  id="staff-edit-name"
                  type="text"
                  autoComplete="name"
                  value={editName}
                  onChange={(e) => {
                    setDialogErr(null)
                    setEditName(e.target.value)
                  }}
                  placeholder="как в списке"
                />
              ) : (
                <CrmTextField
                  label="Новый пароль"
                  id="staff-edit-password"
                  type="password"
                  autoComplete="new-password"
                  value={editPassword}
                  onChange={(e) => {
                    setDialogErr(null)
                    setEditPassword(e.target.value)
                  }}
                  placeholder="не менее 6 символов"
                />
              )}
              {dialogErr ? (
                <p className="staff-page__form-err" role="alert">
                  {dialogErr}
                </p>
              ) : null}
              <div className="staff-page__modal-btns">
                <CrmButton variant="staffChip" onClick={closeDialog} disabled={dialogBusy}>
                  Отмена
                </CrmButton>
                <CrmButton type="submit" variant="staffSubmit" disabled={dialogSaveDisabled}>
                  {dialogBusy ? 'Сохранение…' : 'Сохранить'}
                </CrmButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {confirmDialog}
    </div>
  )
}
