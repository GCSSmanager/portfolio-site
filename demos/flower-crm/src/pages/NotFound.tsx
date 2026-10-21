import { Link } from 'react-router-dom'
import './notFound.css'

export function NotFound() {
  return (
    <div className="not-found">
      <p className="not-found__code">404</p>
      <h1 className="not-found__title">Страница не найдена</h1>
      <p className="not-found__text">
        Такого адреса в приложении нет. Проверьте ссылку или вернитесь на главную.
      </p>
      <Link className="not-found__btn" to="/">
        Главная
      </Link>
    </div>
  )
}
