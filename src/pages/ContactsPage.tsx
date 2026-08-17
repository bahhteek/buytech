import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { Footer, Header } from '../components/Layout'
import { useSite } from '../context/SiteContext'
import './ContactsPage.css'

export function ContactsPage() {
  const { content } = useSite()
  const contacts = content.contacts || {}
  const [searchParams] = useSearchParams()
  const needFromQuery = searchParams.get('need') ?? ''
  const [sent, setSent] = useState(false)
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

  const items = [
    { label: 'Телефон', value: contacts.phone || '+7 (700) 123-45-67', href: `tel:${(contacts.phone || '+77001234567').replace(/\D/g, '')}` },
    {
      label: 'WhatsApp',
      value: contacts.whatsapp || contacts.phone || '+7 (700) 123-45-67',
      href: `https://wa.me/${(contacts.whatsapp || contacts.phone || '77001234567').replace(/\D/g, '')}`,
    },
    { label: 'Email', value: contacts.email || 'hello@buytech.kz', href: `mailto:${contacts.email || 'hello@buytech.kz'}` },
    { label: 'Адрес', value: contacts.address || 'г. Алматы, Казахстан' },
    { label: 'Режим работы', value: contacts.hours || 'Пн–Сб, 09:00–19:00' },
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
                <li key={item.label}>
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
                  setError('')
                  void api
                    .createLead(form)
                    .then(() => setSent(true))
                    .catch((err) =>
                      setError(err instanceof Error ? err.message : 'Не удалось отправить'),
                    )
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
                <button className="btn btn-primary" type="submit">
                  Отправить заявку
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
