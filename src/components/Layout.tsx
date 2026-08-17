import { Link, NavLink } from 'react-router-dom'
import { useSite } from '../context/SiteContext'

type HeaderProps = {
  variant?: 'home' | 'inner'
}

export function Header({ variant = 'inner' }: HeaderProps) {
  return (
    <header className={`header${variant === 'inner' ? ' header-solid' : ''}`}>
      <Link className="logo" to="/">
        Buy<span>Tech</span>
      </Link>
      <nav className="nav" aria-label="Основная навигация">
        <NavLink to="/catalog">Каталог</NavLink>
        <a href="/#process">Поставка</a>
        <NavLink to="/about">О компании</NavLink>
        <NavLink to="/contacts">Контакты</NavLink>
      </nav>
      <Link className="header-cta" to="/contacts">
        Заявка
      </Link>
    </header>
  )
}

export function Footer() {
  const { content } = useSite()

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link className="logo" to="/">
            Buy<span>Tech</span>
          </Link>
          <p>
            {content.footer?.text ||
              'Новая спецтехника из Китая в Казахстан — с документами и доставкой.'}
          </p>
        </div>

        <div className="footer-col">
          <h3>Разделы</h3>
          <Link to="/catalog">Каталог</Link>
          <Link to="/about">О компании</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/contacts">Контакты</Link>
        </div>

        <div className="footer-col">
          <h3>Связь</h3>
          <a href={`tel:${(content.contacts?.phone || '+77001234567').replace(/\D/g, '')}`}>
            {content.contacts?.phone || '+7 (700) 123-45-67'}
          </a>
          <a href={`mailto:${content.contacts?.email || 'hello@buytech.kz'}`}>
            {content.contacts?.email || 'hello@buytech.kz'}
          </a>
        </div>

        <div className="footer-col">
          <h3>Документы</h3>
          <Link to="/privacy">Конфиденциальность</Link>
          <Link to="/terms">Соглашение</Link>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} BuyTech</span>
        <span>Поставки из Китая · Казахстан</span>
      </div>
    </footer>
  )
}
