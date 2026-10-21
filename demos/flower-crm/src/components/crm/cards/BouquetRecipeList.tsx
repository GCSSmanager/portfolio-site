import { Link } from 'react-router-dom'
import type { CatalogNavState } from '../../../utils/catalogNav'
import {
  buildBouquetRecipeListItems,
  type BouquetRecipeListItem,
} from '../../../utils/bouquetAssembleRealization'
import type { BouquetConsumableRecipeLineRow, BouquetRecipeLineRow } from '../stock/types'
import './bouquet-recipe-list.css'

type Props = {
  recipeLines?: BouquetRecipeLineRow[]
  consumableLines?: BouquetConsumableRecipeLineRow[] | null
  items?: BouquetRecipeListItem[]
  linkState?: CatalogNavState
  className?: string
  emptyLabel?: string
}

export function BouquetRecipeList({
  recipeLines = [],
  consumableLines,
  items: itemsProp,
  linkState,
  className,
  emptyLabel,
}: Props) {
  const items = itemsProp ?? buildBouquetRecipeListItems(recipeLines, consumableLines ?? [])
  if (items.length === 0) {
    return emptyLabel ? <span className="crm-bouquet-recipe-list__empty">{emptyLabel}</span> : null
  }

  const listClass = ['crm-bouquet-recipe-list', className].filter(Boolean).join(' ')

  return (
    <ul className={listClass} aria-label="Состав">
      {items.map((item) => (
        <li
          key={item.key}
          className={item.muted ? 'crm-bouquet-recipe-list__item--muted' : undefined}
        >
          {item.href ? (
            <Link to={item.href} state={linkState} className="crm-bouquet-recipe-list__link">
              {item.label}
            </Link>
          ) : (
            item.label
          )}
        </li>
      ))}
    </ul>
  )
}
