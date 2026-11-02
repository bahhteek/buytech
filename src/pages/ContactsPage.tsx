import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { leadMeta } from '../analytics'
import { api } from '../api/client'
import { Footer, Header } from '../components/Layout'
import { DEFAULT_CONTACTS, telHref, waHref } from '../contactLinks'
import { useSite } from '../context/SiteContext'
import './ContactsPage.css'

export function ContactsPage() {
  const { content } = useSite()
  const contacts = content.contacts || {}
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const needFromQuery = searchParams.get('need') ?? ''
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    need: needFromQuery,
  })

  useEffect(() => {
    setForm((prev) => ({ ...prev, need: needFromQuery }))
  }, [needFromQuery])

  const phone = contacts.phone || DEFAULT_CONTACTS.phone
  const phone2 = contacts.phone2 || DEFAULT_CONTACTS.phone2
  const whatsapp = contacts.whatsapp || DEFAULT_CONTACTS.whatsapp
  const whatsapp2 = contacts.whatsapp2 || DEFAULT_CONTACTS.whatsapp2

  const items = [
    { id: 'phone', label: 'Телефон 1', value: phone, href: telHref(phone) },
    { id: 'phone2', label: 'Телефон 2', value: phone2, href: telHref(phone2) },
    { id: 'whatsapp', label: 'WhatsApp 1', value: whatsapp, href: waHref(whatsapp) },
    { id: 'whatsapp2', label: 'WhatsApp 2', value: whatsapp2, href: waHref(whatsapp2) },
    { id: 'email', label: 'Email', value: contacts.email || 'hello@buytech.kz', href: `mailto:${contacts.email || 'hello@buytech.kz'}` },
    { id: 'address', label: 'Адрес', value: contacts.address || 'г. Алматы, Казахстан' },
    { id: 'hours', label: 'Режим работы', value: contacts.hours || 'Пн–Сб, 09:00–19:00' },
  ]

  return (
    <div className="page contacts-page">
      <Header />

      <main className="contacts-main">
        <div className="contacts-top">
          <p className="contacts-kicker">Контакты</p>
          <h1>{contacts.title || 'Свяжитесь с нами'}</h1>
          <p>{contacts.lead}</p>
        </div>

        <div className="contacts-layout">
          <aside className="contacts-info">
            <h2>BuyTech</h2>
            <p className="contacts-lead">
              Прямые поставки спецтехники из Китая — новая техника с полным пакетом
              документов.
            </p>
            <ul className="contacts-list">
              {items.map((item) => (
                <li key={item.id}>
                  <span>{item.label}</span>
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                    >
                      {item.value}
                    </a>
                  ) : (
                    <strong>{item.value}</strong>
                  )}
                </li>
              ))}
            </ul>
          </aside>

          <section className="contacts-form-panel">
            <h2>Оставить заявку</h2>
            <p>Менеджер свяжется в течение дня и пришлёт 2–3 варианта под задачу.</p>

            {sent ? (
              <div className="contacts-success" role="status">
                <h3>Заявка отправлена</h3>
                <p>Мы получили ваш запрос и скоро свяжемся. Копия уходит на почту менеджеру.</p>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    setSent(false)
                    setForm({ name: '', phone: '', email: '', need: '' })
                  }}
                >
                  Отправить ещё
                </button>
              </div>
            ) : (
              <form
                className="contact-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (sending) return
                  setError('')
                  setSending(true)
                  void api
                    .createLead({ ...form, ...leadMeta({ page: `${location.pathname}${location.search}` }) })
                    .then(() => setSent(true))
                    .catch((err) =>
                      setError(err instanceof Error ? err.message : 'Не удалось отправить'),
                    )
                    .finally(() => setSending(false))
                }}
              >
                <label>
                  Имя
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Алексей"
                    required
                  />
                </label>
                <label>
                  Телефон
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+7 (___) ___-__-__"
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="alexey@mail.kz"
                  />
                </label>
                <label>
                  Какая техника нужна
                  <textarea
                    name="need"
                    rows={4}
                    value={form.need}
                    onChange={(e) => setForm((p) => ({ ...p, need: e.target.value }))}
                    placeholder="HOWO самосвал, доставка в Алматы"
                  />
                </label>
                {error && <p className="admin-error">{error}</p>}
                <button className={`btn btn-primary${sending ? ' is-busy' : ''}`} type="submit" disabled={sending} aria-busy={sending}>
                  {sending ? <span className="btn-spinner" aria-hidden="true" /> : null}
                  {sending ? 'Отправляем…' : 'Отправить заявку'}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
