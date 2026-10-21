import { CrmButton } from '../../components/ui/CrmButton'

/** Кнопка «изменить» в строке каталога склада (цветы / товары / букеты). */
export function CatalogRowEditButton({ onClick, title = 'Изменить' }: { onClick: () => void; title?: string }) {
  return (
    <CrmButton
      variant="rowEdit"
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
    >
      ✎
    </CrmButton>
  )
}
