import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { apiFetch } from '../api/apiFetch'
import { catalogNavState, parseCatalogNavState } from '../utils/catalogNav'
import { isUpstreamErrorStatus } from '../utils/networkError'
import { CrmPageStatus } from '../components/ui/CrmPageStatus'
import { CareFactIcon } from '../components/ui/CareFactIcon'
import { buildCareDisplaySections, type CareRuleRow } from '../utils/careRulesDisplay'
import { CARE_SECTION_VISUAL, careFactIconFor } from '../utils/careFactVisual'
import './flowersCatalog.css'
import './taxonCareDetail.css'

type LineageNode = {
  id: number
  name: string
  name_ru: string
  display_name: string
  rank: string
  rank_label: string
}

type DetailResponse = {
  taxon: LineageNode
  lineage: LineageNode[]
  care_rules: CareRuleRow[]
}

export function TaxonCareDetail() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const [data, setData] = useState<DetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const returnNav = parseCatalogNavState(location.state)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setData(null)
    setError(null)
    apiFetch(`/api/taxons/${id}/care/`)
      .then((res) => {
        if (!res.ok && isUpstreamErrorStatus(res.status)) {
          return null
        }
        if (res.status === 404) throw new Error('Таксон не найден')
        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        return res.json() as Promise<DetailResponse>
      })
      .then((json) => {
        if (cancelled || json === null) return
        setData(json)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Не удалось загрузить данные')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const careSections = useMemo(
    () => (data?.care_rules.length ? buildCareDisplaySections(data.care_rules) : []),
    [data],
  )

  return (
    <div className="flowers-page flowers-page--detail">
      <div className="flowers-detail__back">
        {returnNav ? (
          <Link to={returnNav.from} className="auth-site-header__pill">
            ← {returnNav.label}
          </Link>
        ) : (
          <Link to="/" className="auth-site-header__pill">
            ← Главная
          </Link>
        )}
        <Link
          to="/catalog"
          state={catalogNavState(location.pathname)}
          className="auth-site-header__pill"
        >
          Каталог
        </Link>
      </div>

      <CrmPageStatus error={error} loading={!error && !data} />

      {data ? (
        <>
          <nav className="flowers-breadcrumb" aria-label="Иерархия">
            {data.lineage.map((node, i) => (
              <span key={node.id} className="flowers-breadcrumb__segment">
                {i > 0 ? <span className="flowers-breadcrumb__sep">›</span> : null}
                {i < data.lineage.length - 1 ? (
                  <Link to={`/flowers/${node.id}`} className="flowers-breadcrumb__link">
                    {node.display_name}
                  </Link>
                ) : (
                  <span className="flowers-breadcrumb__current">{node.display_name}</span>
                )}
              </span>
            ))}
          </nav>

          <header className="flowers-detail__header">
            <h1 className="flowers-page__title">{data.taxon.display_name}</h1>
            <p className="flowers-detail__latin">
              <span className="flowers-node__latin-label">лат.</span>
              <span className="flowers-node__latin-name">{data.taxon.name}</span>
            </p>
            <p className="flowers-detail__rank">{data.taxon.rank_label}</p>
          </header>

          <section className="flowers-care" aria-labelledby="care-heading">
            <h2 id="care-heading" className="flowers-care__title">
              Правила ухода
            </h2>
            {careSections.length > 0 ? (
              careSections.map((block) => {
                const tone = CARE_SECTION_VISUAL[block.id].tone
                return (
                  <div
                    key={block.id}
                    className={`flowers-care__block flowers-care__block--${tone}`}
                  >
                    <h3 className="flowers-care__block-title">{block.title}</h3>
                    <ul className="flowers-care__facts">
                      {block.items.map((line) => (
                        <li key={`${block.id}-${line.id}`} className="flowers-care__fact">
                          <span className="flowers-care__fact-icon" aria-hidden>
                            <CareFactIcon id={careFactIconFor(line.id, block.id)} size={16} />
                          </span>
                          <span className="flowers-care__fact-text">{line.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })
            ) : (
              <p className="flowers-care__empty">
                Для этого таксона пока нет записанных правил ухода — они могут быть заданы на уровне
                рода или семейства.
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
