import { useAuth } from '../auth/AuthContext'
import './subscriptionPage.css'

function formatSubscriptionDate(iso: string | null): string {
  if (!iso) return 'Без ограничения по дате'
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return iso
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function subscriptionStatusLabel(active: boolean, until: string | null): string {
  if (active && until == null) return 'Активна (бессрочно)'
  if (active) return 'Активна'
  return 'Истекла'
}

export function SubscriptionPage() {
  const { subscriptionActive, subscriptionUntil } = useAuth()
  const status = subscriptionStatusLabel(subscriptionActive, subscriptionUntil)

  return (
    <main className="flowers-page flowers-page--subscription">
      <h1 className="flowers-page__title">Подписка</h1>
      <p className="subscription-page__lead">
        Статус доступа к FlowerFlow для вашего магазина. При регистрации — 14 дней бесплатно; продление
        после окончания срока — у управляющего платформы.
      </p>

      <section
        className={`subscription-page__card${subscriptionActive ? '' : ' subscription-page__card--inactive'}`}
        aria-labelledby="subscription-status-heading"
      >
        <h2 id="subscription-status-heading" className="subscription-page__card-title">
          Текущий статус
        </h2>
        <dl className="subscription-page__facts">
          <div className="subscription-page__fact">
            <dt>Статус</dt>
            <dd>{status}</dd>
          </div>
          <div className="subscription-page__fact">
            <dt>Действует до</dt>
            <dd>{formatSubscriptionDate(subscriptionUntil)}</dd>
          </div>
        </dl>
        <p className="subscription-page__renew">
          Чтобы продлить подписку или изменить срок, обратитесь к управляющему FlowerFlow.
        </p>
      </section>
    </main>
  )
}
