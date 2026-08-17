import { Link } from 'react-router-dom'
import { Footer, Header } from '../components/Layout'
import './NotFoundPage.css'

export function NotFoundPage() {
  return (
    <div className="page not-found-page">
      <Header />

      <main className="not-found-main">
        <p className="not-found-code">404</p>
        <h1>Страница не найдена</h1>
        <p>
          Такой страницы нет или ссылка устарела. Вернитесь на главную или откройте
          каталог техники.
        </p>
        <div className="not-found-actions">
          <Link className="btn btn-primary" to="/">
            На главную
          </Link>
          <Link className="btn btn-dark" to="/catalog">
            В каталог
          </Link>
          <Link className="btn btn-ghost not-found-ghost" to="/contacts">
            Контакты
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
