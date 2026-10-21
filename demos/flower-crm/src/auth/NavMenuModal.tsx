import { useCallback, useEffect, useState } from 'react'
import { DragSortList } from '../components/ui/DragSortList'
import { CrmButton } from '../components/ui/CrmButton'
import { CrmModal } from '../components/ui/CrmModal'
import { formatPhoneDisplay } from './AuthContext'
import { NavMenuIcon } from './navMenuIcons'
import type { NavMenuItem } from './navMenuTypes'
import './navMenu.css'

type NavMenuModalProps = {
  open: boolean
  onClose: () => void
  items: NavMenuItem[]
  canEdit: boolean
  persistError?: string | null
  onPersist?: (items: NavMenuItem[]) => void
  onOpenSection: (path: string) => void
  phone: string
  onLogout: () => void
}

function NavMenuPencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden focusable="false">
      <path
        d="M10.5 2.5 13.5 5.5 5.75 13.25H2.75v-3L10.5 2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M9.25 3.75 12.25 6.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function NavMenuModal({
  open,
  onClose,
  items,
  canEdit,
  persistError = null,
  onPersist,
  onOpenSection,
  phone,
  onLogout,
}: NavMenuModalProps) {
  const [draft, setDraft] = useState<NavMenuItem[]>(items)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    if (open) setDraft(items)
  }, [open, items])

  useEffect(() => {
    if (!open) setEditMode(false)
  }, [open])

  const persist = useCallback(
    (next: NavMenuItem[]) => {
      if (onPersist) onPersist(next)
    },
    [onPersist],
  )

  const toggleVisible = useCallback(
    (id: string) => {
      setDraft((prev) => {
        const next = prev.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x))
        persist(next)
        return next
      })
    },
    [persist],
  )

  const title =
    editMode && canEdit ? 'Настройка меню' : canEdit ? 'Меню разделов' : 'Все разделы'

  const editToggle = canEdit ? (
    <button
      type="button"
      className={`nav-menu-modal__edit-toggle${editMode ? ' nav-menu-modal__edit-toggle--on' : ''}`}
      aria-label={editMode ? 'Закончить настройку меню' : 'Настроить меню'}
      aria-pressed={editMode}
      onClick={() => setEditMode((on) => !on)}
    >
      <NavMenuPencilIcon className="nav-menu-modal__edit-toggle-icon" />
    </button>
  ) : null

  return (
    <CrmModal
      open={open}
      onClose={onClose}
      title={title}
      width="2xl"
      className="nav-menu-modal"
      headActions={editToggle}
    >
      {editMode && canEdit ? (
        <DragSortList
          className="nav-menu-modal__list"
          items={draft}
          getItemId={(item) => item.id}
          disabled={!canEdit}
          onReorder={setDraft}
          onDragEnd={canEdit ? persist : undefined}
          itemClassName={(item, isDragging) =>
            [
              'nav-menu-modal__row',
              !item.visible ? 'nav-menu-modal__row--hidden' : '',
              isDragging ? 'nav-menu-modal__row--dragging' : '',
            ]
              .filter(Boolean)
              .join(' ')
          }
          renderItem={(item, { dragHandleProps }) => (
            <>
              {dragHandleProps ? (
                <span
                  className="drag-sort-list__handle nav-menu-modal__handle"
                  role="button"
                  tabIndex={-1}
                  aria-label={dragHandleProps['aria-label'] ?? `Переместить: ${item.label}`}
                  onPointerDown={dragHandleProps.onPointerDown}
                >
                  ⠿
                </span>
              ) : null}
              <span className="nav-menu-modal__icon-wrap" aria-hidden>
                <NavMenuIcon id={item.id} className="nav-menu-modal__icon" />
              </span>
              <span className="nav-menu-modal__label">{item.label}</span>
              <div className="nav-menu-modal__actions">
                <button
                  type="button"
                  className="nav-menu-modal__open"
                  onClick={() => onOpenSection(item.path)}
                >
                  Открыть
                </button>
                <button
                  type="button"
                  className={`nav-menu-modal__vis${item.visible ? ' nav-menu-modal__vis--on' : ''}`}
                  onClick={() => toggleVisible(item.id)}
                  aria-pressed={item.visible}
                >
                  {item.visible ? 'В шапке' : 'Скрыт'}
                </button>
              </div>
            </>
          )}
        />
      ) : (
        <ul className="nav-menu-modal__browse-list">
          {draft.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="nav-menu-modal__browse-btn"
                onClick={() => onOpenSection(item.path)}
              >
                <span className="nav-menu-modal__icon-wrap" aria-hidden>
                  <NavMenuIcon id={item.id} className="nav-menu-modal__icon" />
                </span>
                <span className="nav-menu-modal__label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {persistError ? (
        <p className="nav-menu-modal__error" role="alert">
          {persistError}
        </p>
      ) : null}

      <div className="nav-menu-modal__account">
        <p className="nav-menu-modal__phone">
          Телефон: <strong>{formatPhoneDisplay(phone)}</strong>
        </p>
        <CrmButton
          variant="custom"
          className="nav-menu-modal__logout"
          onClick={onLogout}
        >
          Выйти
        </CrmButton>
      </div>
    </CrmModal>
  )
}
