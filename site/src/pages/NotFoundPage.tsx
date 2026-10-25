import { Link } from 'react-router-dom'
import { PageMeta } from '@/components/seo/PageMeta'
import { notFoundRouteSeo } from '@/seo/routeMeta'

export function NotFoundPage() {
  return (
    <>
      <PageMeta {...notFoundRouteSeo} bodyClass="crm-page" />
      <section className="crm-missing">
        <div className="container crm-missing__inner">
          <img
            className="crm-missing__logo"
            src="/assets/gcss-logo.webp"
            alt="ГКСС"
            width={64}
            height={64}
            decoding="async"
          />
          <h1 className="crm-missing__title">404</h1>
          <p className="crm-missing__text">упс, такой страницы нет</p>
          <div className="crm-missing__actions">
            <Link className="btn btn--primary" to="/crm/custom/">
              Перейти в CRM
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
