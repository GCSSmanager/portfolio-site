import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../api/apiFetch'
import { useAuth } from '../auth/AuthContext'
import { FLOWER_ART_PLACEHOLDER } from '../utils/flowerPlaceholder'
import { mediaUrl } from '../utils/mediaUrl'
import { isUpstreamErrorStatus } from '../utils/networkError'
import { CareFactIcon } from '../components/ui/CareFactIcon'
import { CrmPageStatus } from '../components/ui/CrmPageStatus'
import { buildCareDisplaySections, type CareRuleRow } from '../utils/careRulesDisplay'
import { CARE_SECTION_VISUAL, careFactIconFor } from '../utils/careFactVisual'
import './flowersCatalog.css'
import './taxonCareDetail.css'
import './storeFlowersPage.css'

type DetailResponse = {
  flower: {
    id: number
    name: string
    display_name: string
    photo_url: string | null
    catalog_linked: boolean
    latin_name: string | null
  }
  catalog_taxon?: { display_name: string; latin_name: string; rank_label: string } | null
  care_rules: CareRuleRow[]
  care_editable: boolean
}

export function StoreFlowerCarePage() {
  const { id } = useParams<{ id: string }>()
  const { isOwner } = useAuth()
  const [data, setData] = useState<DetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void apiFetch(`/api/me/flowers/${id}/care/`)
      .then((res) => {
        if (!res.ok && isUpstreamErrorStatus(res.status)) return null
        if (res.status === 404) throw new Error('Цветок не найден')
        if (!res.ok) throw new Error(`Ошибка ${res.status}`)
        return res.json() as Promise<DetailResponse>
      })
      .then((json) => {
        if (!cancelled && json) setData(json)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки')
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
        <Link to="/warehouse" className="auth-site-header__pill">
          ← К складу
        </Link>
      </div>
      <CrmPageStatus error={error} loading={!data && !error} variant="banner" />
      {data ? (
        <>
          <header className="flowers-detail__hero">
            <img
              className={
                data.flower.photo_url
                  ? 'store-flowers__detail-photo'
                  : 'store-flowers__detail-photo store-flowers__detail-photo--placeholder'
              }
              src={mediaUrl(data.flower.photo_url) ?? mediaUrl(FLOWER_ART_PLACEHOLDER) ?? FLOWER_ART_PLACEHOLDER}
              alt=""
            />
            <div>
              <h1 className="flowers-page__title">{data.flower.display_name}</h1>
              {data.catalog_taxon ? (
                <p className="flowers-detail__latin">
                  Каталог: {data.catalog_taxon.display_name} · <em>{data.catalog_taxon.latin_name}</em> ·{' '}
                  {data.catalog_taxon.rank_label}
                </p>
              ) : (
                <p className="flowers-detail__latin">Локальный цветок · свой уход</p>
              )}
            </div>
          </header>
          {data.care_editable && isOwner ? (
            <p className="crm-field__hint">
              Чтобы изменить правила, откройте карточку цветка (✎) в списке — блок «Базовый уход».
            </p>
          ) : data.care_editable && !isOwner ? (
            <p className="crm-field__hint">Изменение правил доступно только владельцу магазина.</p>
          ) : null}
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
              <p className="flowers-care__empty">Правила ухода не заданы.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
