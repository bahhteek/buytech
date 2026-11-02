import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { getAdminToken } from '../api/client'
import { DEFAULT_CONTACTS, telHref, waHref } from '../contactLinks'
import { findMachineBySlugOrId } from '../categorySlug'
import { useSite } from '../context/SiteContext'
import { SiteSearch } from './SiteSearch'

type HeaderProps = {
  variant?: 'home' | 'inner'
}

export function Logo({
  tone = 'on-dark',
  lockup = false,
}: {
  tone?: 'on-dark' | 'on-light'
  lockup?: boolean
}) {
  const src = lockup
    ? tone === 'on-light'
      ? '/logo-lockup-ink.svg'
      : '/logo-lockup.svg'
    : tone === 'on-light'
      ? '/logo-wordmark-ink.svg'
      : '/logo-wordmark.svg'

  return <img className="logo-mark" src={src} alt="" />
}

function AdminProductEdit() {
  const location = useLocation()
  const { allMachines } = useSite()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(Boolean(getAdminToken()))
  }, [location.pathname])

  const parts = location.pathname.split('/').filter(Boolean)
  const machine =
    isAdmin && parts.length === 2 && parts[0] !== 'admin' && parts[0] !== 'brand'
      ? findMachineBySlugOrId(allMachines, parts[1])
      : undefined
  if (!machine) return null

  return (
    <Link className="header-edit" to={`/admin/machines/${machine.id}`}>
      Редактировать
    </Link>
  )
}

export function Header({ variant = 'inner' }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.hash])

  return (
    <>
      {open ? (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Закрыть меню"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <header className={`header${variant === 'inner' ? ' header-solid' : ''}${open ? ' is-menu-open' : ''}`}>
        <div className="header-bar">
          <Link className="logo" to="/" aria-label="buytechkz">
            <Logo lockup />
          </Link>
          <nav className="nav" aria-label="Основная навигация">
            <NavLink to="/catalog">Каталог</NavLink>
            <Link to="/#process">Поставка</Link>
            <NavLink to="/about">О компании</NavLink>
            <NavLink to="/contacts">Контакты</NavLink>
          </nav>
          <SiteSearch />
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            onClick={() => setOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
          <AdminProductEdit />
          <Link className="header-cta" to="/contacts">
            Заявка
          </Link>
        </div>
        {open ? (
          <nav id="mobile-nav" className="mobile-nav" aria-label="Мобильная навигация">
            <NavLink to="/catalog">Каталог</NavLink>
            <Link to="/#process">Поставка</Link>
            <NavLink to="/about">О компании</NavLink>
            <NavLink to="/contacts">Контакты</NavLink>
          </nav>
        ) : null}
      </header>
    </>
  )
}

export function Footer() {
  const { content } = useSite()

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link className="logo" to="/" aria-label="buytechkz">
            <Logo lockup />
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
          <a href={telHref(content.contacts?.phone || DEFAULT_CONTACTS.phone)}>
            {content.contacts?.phone || DEFAULT_CONTACTS.phone}
          </a>
          <a href={telHref(content.contacts?.phone2 || DEFAULT_CONTACTS.phone2)}>
            {content.contacts?.phone2 || DEFAULT_CONTACTS.phone2}
          </a>
          <a href={waHref(content.contacts?.whatsapp || DEFAULT_CONTACTS.whatsapp)} target="_blank" rel="noreferrer">
            WhatsApp {content.contacts?.whatsapp || DEFAULT_CONTACTS.whatsapp}
          </a>
          <a href={waHref(content.contacts?.whatsapp2 || DEFAULT_CONTACTS.whatsapp2)} target="_blank" rel="noreferrer">
            WhatsApp {content.contacts?.whatsapp2 || DEFAULT_CONTACTS.whatsapp2}
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
