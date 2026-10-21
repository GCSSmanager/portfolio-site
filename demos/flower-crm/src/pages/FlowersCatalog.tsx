import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CrmButton } from '../components/ui/CrmButton'
import { CatalogFilter } from '../components/ui/CatalogFilter'
import { CrmPageStatus, crmPageStatusPanelClass } from '../components/ui/CrmPageStatus'
import { CrmPageToolbar } from '../components/ui/CrmPageToolbar'
import { HighlightedText } from '../components/ui/HighlightedText'
import { apiFetch } from '../api/apiFetch'
import { flowerLinkStateFromCatalog, parseCatalogNavState } from '../utils/catalogNav'
import { isUpstreamErrorStatus } from '../utils/networkError'
import {
  normalizeTaxonSearchQuery,
  taxonSearchQueryWords,
  type TaxonSearchHit,
} from '../utils/taxonSearchQuery'
import './flowersCatalog.css'

export type TaxonDto = {
  id: number
  name: string
  name_ru: string
  display_name: string
  rank: string
  rank_label: string
  children: TaxonDto[]
}

type ApiResponse = { taxons: TaxonDto[] }

/** Оставляет те же уровни семейство→род→…; узел показывается, если совпал он или что-то ниже. */
function filterTreeByMatchingIds(nodes: TaxonDto[], matchingIds: Set<number>): TaxonDto[] {
  const out: TaxonDto[] = []
  for (const node of nodes) {
    const childFiltered = filterTreeByMatchingIds(node.children, matchingIds)
    const selfHit = matchingIds.has(node.id)
    if (selfHit || childFiltered.length > 0) {
      out.push({
        ...node,
        children: childFiltered,
      })
    }
  }
  return out
}

/** Раскрыть только предков узлов с прямым совпадением имени (не по цепочке в blob). */
function collectSearchExpandIds(nodes: TaxonDto[], strictHitIds: Set<number>): Set<number> {
  const expand = new Set<number>()
  const walk = (node: TaxonDto): boolean => {
    const self = strictHitIds.has(node.id)
    let childBelow = false
    for (const ch of node.children) {
      if (walk(ch)) childBelow = true
    }
    if (childBelow && node.children.length > 0) expand.add(node.id)
    return self || childBelow
  }
  for (const n of nodes) walk(n)
  return expand
}

function isStrictTaxonNameMatch(node: { display_name: string; name: string }, words: string[]): boolean {
  if (!words.length) return false
  const hay = `${node.display_name} ${node.name}`.toLowerCase()
  return words.every((w) => hay.includes(w))
}

function TaxonBranch({
  nodes,
  highlightWords,
  searchHitIds,
  isExpanded,
  onToggleExpand,
  onCollapseBranch,
  branchOwnerId,
}: {
  nodes: TaxonDto[]
  highlightWords: string[]
  searchHitIds: Set<number> | null
  isExpanded: (id: number) => boolean
  onToggleExpand: (id: number) => void
  onCollapseBranch: (id: number) => void
  branchOwnerId: number
}) {
  return (
    <ul className="flowers-tree flowers-branch__list">
      {nodes.map((node) => (
        <li
          key={node.id}
          className={`flowers-tree-item${node.children.length === 0 ? ' flowers-tree-item--leaf' : ''}`}
        >
          <TaxonNode
            node={node}
            highlightWords={highlightWords}
            searchHitIds={searchHitIds}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
            onCollapseBranch={onCollapseBranch}
            branchOwnerId={branchOwnerId}
          />
        </li>
      ))}
    </ul>
  )
}

function TaxonNode({
  node,
  highlightWords,
  searchHitIds,
  isExpanded,
  onToggleExpand,
  onCollapseBranch,
  branchOwnerId = null,
}: {
  node: TaxonDto
  highlightWords: string[]
  searchHitIds: Set<number> | null
  isExpanded: (id: number) => boolean
  onToggleExpand: (id: number) => void
  onCollapseBranch: (id: number) => void
  branchOwnerId?: number | null
}) {
  const isFamily = node.rank === 'family'
  const isDirectHit = searchHitIds?.has(node.id) ?? false
  const hasChildren = node.children.length > 0
  const expanded = hasChildren && isExpanded(node.id)
  const rootClass = [
    isFamily ? 'flowers-node flowers-node--family' : 'flowers-node',
    isDirectHit ? 'flowers-node--search-hit' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const horizontalCollapseId = hasChildren ? node.id : branchOwnerId

  return (
    <>
      <div className={`flowers-tree-item__head${hasChildren ? '' : ' flowers-tree-item__head--leaf'}`.trim()}>
        {branchOwnerId != null && horizontalCollapseId != null ? (
          <CrmButton
            variant="flowersTreeGuideH"
            aria-label="Свернуть раздел"
            onClick={() => onCollapseBranch(horizontalCollapseId)}
          />
        ) : null}
        {hasChildren ? (
          <CrmButton
            variant="flowersTreeToggle"
            aria-expanded={expanded}
            aria-label={expanded ? 'Свернуть' : 'Развернуть'}
            onClick={() => onToggleExpand(node.id)}
          >
            <span className="flowers-tree-toggle__chev" aria-hidden>
              {expanded ? '▼' : '▶'}
            </span>
          </CrmButton>
        ) : null}
        <Link to={`/flowers/${node.id}`} state={flowerLinkStateFromCatalog} className="flowers-node-link">
          <div className={rootClass}>
            <div className="flowers-node__row">
              <span className="flowers-node__name">
                <HighlightedText text={node.display_name} highlightWords={highlightWords} />
              </span>
              <span className="flowers-node__badge">{node.rank_label}</span>
            </div>
            <p className="flowers-node__latin">
              <span className="flowers-node__latin-label">лат.</span>
              <span className="flowers-node__latin-name">
                <HighlightedText text={node.name} highlightWords={highlightWords} />
              </span>
            </p>
          </div>
        </Link>
      </div>
      {hasChildren && expanded ? (
        <div className="flowers-branch">
          <CrmButton
            variant="flowersTreeGuideV"
            aria-label="Свернуть раздел"
            onClick={() => onCollapseBranch(node.id)}
          />
          <TaxonBranch
            nodes={node.children}
            highlightWords={highlightWords}
            searchHitIds={searchHitIds}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
            onCollapseBranch={onCollapseBranch}
            branchOwnerId={node.id}
          />
        </div>
      ) : null}
    </>
  )
}

export function FlowersCatalog() {
  const location = useLocation()
  const [taxons, setTaxons] = useState<TaxonDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [searchHits, setSearchHits] = useState<TaxonSearchHit[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const returnNavRaw = parseCatalogNavState(location.state)
  const returnNav =
    returnNavRaw && returnNavRaw.from !== '/catalog' ? returnNavRaw : undefined

  const filterNorm = normalizeTaxonSearchQuery(filterQuery)
  const filterActive = filterNorm.length >= 2

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/taxons/tree/')
      .then((res) => {
        if (!res.ok && isUpstreamErrorStatus(res.status)) {
          return null
        }
        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        return res.json() as Promise<ApiResponse>
      })
      .then((data) => {
        if (cancelled || data === null) return
        setTaxons(Array.isArray(data.taxons) ? data.taxons : [])
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Не удалось загрузить каталог')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!filterActive) {
      setSearchHits(null)
      setSearchLoading(false)
      return
    }
    setSearchHits(null)
    setSearchLoading(true)
    const tmr = window.setTimeout(() => {
      void apiFetch(`/api/taxons/search/?q=${encodeURIComponent(filterNorm)}`)
        .then((res) => {
          if (!res.ok && isUpstreamErrorStatus(res.status)) {
            return null
          }
          if (!res.ok) throw new Error(`Ошибка ${res.status}`)
          return res.json() as Promise<{ results: TaxonSearchHit[] }>
        })
        .then((data) => {
          if (data === null) return
          setSearchHits(data.results)
        })
        .catch(() => {
          setSearchHits([])
        })
        .finally(() => setSearchLoading(false))
    }, 300)
    return () => window.clearTimeout(tmr)
  }, [filterActive, filterNorm])

  const displayTreeRoots = useMemo((): TaxonDto[] | null => {
    if (!taxons?.length) return null
    if (!filterActive) return taxons
    if (searchHits === null) return null
    if (searchHits.length === 0) return []
    const ids = new Set(searchHits.map((h) => h.id))
    return filterTreeByMatchingIds(taxons, ids)
  }, [taxons, filterActive, searchHits])

  const highlightWords = useMemo(
    () => (filterActive ? taxonSearchQueryWords(filterNorm) : []),
    [filterActive, filterNorm],
  )

  const strictSearchHitIds = useMemo(() => {
    if (!filterActive || !searchHits?.length) return null
    const words = taxonSearchQueryWords(filterNorm)
    const ids = new Set<number>()
    for (const h of searchHits) {
      if (isStrictTaxonNameMatch(h, words)) ids.add(h.id)
    }
    return ids
  }, [filterActive, searchHits, filterNorm])

  const [branchExpand, setBranchExpand] = useState<{
    expanded: Set<number>
    collapsed: Set<number>
  }>(() => ({ expanded: new Set(), collapsed: new Set() }))

  const filterExpandedIds = useMemo(() => {
    if (!filterActive || !displayTreeRoots?.length || !strictSearchHitIds?.size) return null
    return collectSearchExpandIds(displayTreeRoots, strictSearchHitIds)
  }, [filterActive, displayTreeRoots, strictSearchHitIds])

  const isExpanded = useCallback(
    (id: number) => {
      if (filterExpandedIds?.has(id)) return true
      if (branchExpand.collapsed.has(id)) return false
      return branchExpand.expanded.has(id)
    },
    [branchExpand, filterExpandedIds],
  )

  const onCollapseBranch = useCallback(
    (id: number) => {
      if (filterExpandedIds?.has(id)) return
      setBranchExpand((state) => {
        const collapsed = new Set(state.collapsed)
        collapsed.add(id)
        const expanded = new Set(state.expanded)
        expanded.delete(id)
        return { expanded, collapsed }
      })
    },
    [filterExpandedIds],
  )

  const onToggleExpand = useCallback(
    (id: number) => {
      if (filterExpandedIds?.has(id)) return
      setBranchExpand((state) => {
        const isOpen = !state.collapsed.has(id) && state.expanded.has(id)
        const collapsed = new Set(state.collapsed)
        const expanded = new Set(state.expanded)
        if (isOpen) {
          collapsed.add(id)
          expanded.delete(id)
        } else {
          collapsed.delete(id)
          expanded.add(id)
        }
        return { expanded, collapsed }
      })
    },
    [filterExpandedIds],
  )

  useEffect(() => {
    setBranchExpand({ expanded: new Set(), collapsed: new Set() })
  }, [filterNorm])

  return (
    <div className="flowers-page flowers-page--catalog">
      {returnNav ? (
        <nav className="flowers-catalog-return" aria-label="Вернуться">
          <Link to={returnNav.from} className="auth-site-header__pill flowers-catalog-return__pill">
            <span className="flowers-catalog-return__arrow" aria-hidden>
              ←
            </span>
            {returnNav.label}
          </Link>
        </nav>
      ) : null}
      <CrmPageToolbar
        title="Каталог цветов"
        lead={
          filterActive
            ? 'Та же иерархия семейство → род → вид → сорт; скрыты ветви без совпадений с запросом (правила поиска как на складе).'
            : 'Иерархия: семейство → род → вид → сорт. Общий каталог сортов.'
        }
      />

      <CatalogFilter
        id="flowers-catalog-search"
        label="Поиск в каталоге"
        value={filterQuery}
        onChange={setFilterQuery}
        placeholder="Русское или латинское название…"
        busy={searchLoading}
        busyLabel="…"
        hint={
          filterActive
            ? 'Минимум 2 символа без учёта кавычек; совпадение по словам и цепочке родитель → сорт; дерево показывает только подходящие ветви.'
            : 'От двух символов дерево сузится: остаются только узлы и потомки, проходящие фильтр.'
        }
      />

      <CrmPageStatus error={error} loading={!error && taxons === null} />

      {!error && taxons && taxons.length === 0 ? (
        <p className={crmPageStatusPanelClass()}>В каталоге пока нет записей.</p>
      ) : null}

      {!error && taxons && taxons.length > 0 && filterActive && searchLoading ? (
        <p className={crmPageStatusPanelClass()} aria-live="polite">
          Поиск…
        </p>
      ) : null}

      {!error &&
      taxons &&
      taxons.length > 0 &&
      filterActive &&
      !searchLoading &&
      searchHits &&
      searchHits.length === 0 ? (
        <p className={crmPageStatusPanelClass()}>Ничего не найдено — уточните запрос.</p>
      ) : null}

      {!error &&
      taxons &&
      taxons.length > 0 &&
      filterActive &&
      !searchLoading &&
      searchHits &&
      searchHits.length > 0 &&
      displayTreeRoots &&
      displayTreeRoots.length === 0 ? (
        <p className={crmPageStatusPanelClass()}>Ничего не найдено в дереве каталога.</p>
      ) : null}

      {!error &&
      taxons &&
      taxons.length > 0 &&
      displayTreeRoots &&
      displayTreeRoots.length > 0 &&
      (!filterActive || !searchLoading) ? (
        <ul className="flowers-tree flowers-tree--root" aria-label={filterActive ? 'Каталог (фильтр)' : 'Каталог'}>
          {displayTreeRoots.map((t) => (
            <li key={t.id} className="flowers-tree-item flowers-tree-item--root">
              <TaxonNode
                node={t}
                highlightWords={highlightWords}
                searchHitIds={strictSearchHitIds}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
                onCollapseBranch={onCollapseBranch}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
