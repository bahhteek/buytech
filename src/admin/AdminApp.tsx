import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { api, AUTH_LOST_EVENT, clearAdminToken, getAdminToken, setAdminToken } from '../api/client'
import type { AboutContent, Lead, SiteContent } from '../types'
import { normalizeAbout } from '../types'
import { useSite } from '../context/SiteContext'
import { Logo } from '../components/Layout'
import { BrandEditor, BrandsAdmin } from './BrandPages'
import { CategoriesAdmin, CategoryEditor } from './CategoryPages'
import { MachineEditor, MachinesAdmin } from './MachinePages'
import { StatsPage } from './StatsPage'
import './admin.css'

function requireAuth() {
  return Boolean(getAdminToken())
}

function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const expired =
    location.state &&
    typeof location.state === 'object' &&
    'reason' in location.state &&
    (location.state as { reason?: string }).reason === 'expired'
  const [error, setError] = useState(expired ? 'Сессия истекла. Войдите снова.' : '')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const { token } = await api.login(username, password)
      setAdminToken(token)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    }
  }

  return (
    <div className="admin-login">
      <form onSubmit={onSubmit}>
        <p className="admin-kicker">BuyTech Admin</p>
        <h1>Вход</h1>
        <label>
          Логин
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="admin-error">{error}</p>}
        <button className="btn btn-primary" type="submit">
          Войти
        </button>
      </form>
    </div>
  )
}

function AdminShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  async function logout() {
    try {
      await api.logout()
    } catch {
      /* ignore */
    }
    clearAdminToken()
    navigate('/admin/login')
  }

  return (
    <div className="admin-shell">
      <aside className="admin-aside">
        <Link className="logo" to="/admin" aria-label="buytechkz">
          <Logo tone="on-dark" />
        </Link>
        <nav>
          <NavLink to="/admin" end>Обзор</NavLink>
          <NavLink to="/admin/content">Контент</NavLink>
          <NavLink to="/admin/faq">FAQ</NavLink>
          <NavLink to="/admin/categories">Категории</NavLink>
          <NavLink to="/admin/brands">Марки</NavLink>
          <NavLink to="/admin/machines">Техника</NavLink>
          <NavLink to="/admin/stats">Статистика</NavLink>
          <NavLink to="/admin/leads">Заявки</NavLink>
        </nav>
      </aside>
      <div className="admin-body">
        <header className="admin-top">
          <AdminSearch />
          <div className="admin-top-actions">
            <Link className="btn btn-dark" to="/" target="_blank" rel="noreferrer">
              На сайт
            </Link>
            <button className="btn btn-primary" type="button" onClick={() => void logout()}>
              Выйти
            </button>
          </div>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  )
}

function AdminSearch() {
  const { allMachines, categories, brands } = useSite()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const hits = useMemo(() => {
    if (!q) return []
    const items: { to: string; title: string; meta: string }[] = []
    for (const machine of allMachines) {
      const hay = `${machine.name} ${machine.brand} ${machine.category}`.toLowerCase()
      if (hay.includes(q)) {
        items.push({
          to: `/admin/machines/${machine.id}`,
          title: machine.name,
          meta: `Техника · ${machine.brand}${machine.draft ? ' · скрыта' : ''}`,
        })
      }
    }
    for (const category of categories) {
      if (category.title.toLowerCase().includes(q)) {
        items.push({ to: `/admin/categories/${category.id}`, title: category.title, meta: 'Категория' })
      }
    }
    for (const brand of brands) {
      if (brand.name.toLowerCase().includes(q)) {
        items.push({ to: `/admin/brands/${brand.id}`, title: brand.name, meta: 'Марка' })
      }
    }
    return items.slice(0, 12)
  }, [q, allMachines, categories, brands])

  return (
    <div className="admin-search">
      <input
        value={query}
        placeholder="Поиск техники, категории или марки"
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Поиск"
      />
      {q && (
        <div className="admin-search-results">
          {hits.length ? (
            hits.map((hit) => (
              <button
                key={hit.to}
                type="button"
                onClick={() => {
                  setQuery('')
                  navigate(hit.to)
                }}
              >
                <strong>{hit.title}</strong>
                <span>{hit.meta}</span>
              </button>
            ))
          ) : (
            <p>Ничего не найдено</p>
          )}
        </div>
      )}
    </div>
  )
}

function Guard({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(() => (requireAuth() ? null : false))
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (ok !== null) return
    let cancelled = false
    void api
      .checkSession()
      .then(() => {
        if (!cancelled) setOk(true)
      })
      .catch(() => {
        if (!cancelled) {
          setExpired(true)
          setOk(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [ok])

  useEffect(() => {
    const onLost = () => {
      setExpired(true)
      setOk(false)
    }
    window.addEventListener(AUTH_LOST_EVENT, onLost)
    return () => window.removeEventListener(AUTH_LOST_EVENT, onLost)
  }, [])

  if (ok === false) {
    return <Navigate to="/admin/login" replace state={expired ? { reason: 'expired' } : undefined} />
  }
  if (ok !== true) {
    return (
      <div className="admin-login">
        <p>Проверка сессии…</p>
      </div>
    )
  }
  return <AdminShell>{children}</AdminShell>
}

function AdminHome() {
  const { allMachines, categories, brands } = useSite()
  const [leadsCount, setLeadsCount] = useState(0)

  useEffect(() => {
    void api.getLeads().then((leads) => setLeadsCount(leads.filter((l) => l.status === 'new').length))
  }, [])

  return (
    <div>
      <h1>Обзор</h1>
      <div className="admin-stats">
        <article>
          <strong>{allMachines.length}</strong>
          <span>Техника</span>
        </article>
        <article>
          <strong>{categories.length}</strong>
          <span>Категории</span>
        </article>
        <article>
          <strong>{brands.length}</strong>
          <span>Марки</span>
        </article>
        <article>
          <strong>{leadsCount}</strong>
          <span>Новые заявки</span>
        </article>
      </div>
    </div>
  )
}

type ContentTab = 'home' | 'about' | 'catalog' | 'contacts' | 'footer'

function ContentField({
  label,
  hint,
  value,
  rows = 1,
  onChange,
}: {
  label: string
  hint?: string
  value: string
  rows?: number
  onChange: (value: string) => void
}) {
  return (
    <label>
      {label}
      {hint ? <span className="admin-field-hint">{hint}</span> : null}
      {rows > 1 ? (
        <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  )
}

function ContentBlock({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="admin-content-block">
      <div className="admin-content-block-head">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="admin-grid-form">{children}</div>
    </section>
  )
}

function ContentAdmin() {
  const { content, refresh } = useSite()
  const [draft, setDraft] = useState<SiteContent>(() => ({
    ...content,
    about: normalizeAbout(content.about),
  }))
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<ContentTab>('home')

  useEffect(() => {
    setDraft({
      ...content,
      about: normalizeAbout(content.about),
    })
  }, [content])

  function setSection(
    section: 'home' | 'catalog' | 'contacts' | 'footer',
    key: string,
    value: string,
  ) {
    setDraft((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }))
  }

  function setAbout(patch: Partial<AboutContent>) {
    setDraft((prev) => ({
      ...prev,
      about: { ...normalizeAbout(prev.about), ...patch },
    }))
  }

  function updateAboutList<K extends 'roles' | 'facts' | 'steps'>(
    key: K,
    index: number,
    patch: Partial<AboutContent[K][number]>,
  ) {
    setDraft((prev) => {
      const about = normalizeAbout(prev.about)
      const list = about[key].map((item, i) => (i === index ? { ...item, ...patch } : item))
      return { ...prev, about: { ...about, [key]: list } }
    })
  }

  async function save() {
    await api.saveContent({
      ...draft,
      about: normalizeAbout(draft.about),
    })
    await refresh()
    setMessage('Сохранено')
  }

  const about = normalizeAbout(draft.about)

  const tabs: { id: ContentTab; label: string; hint: string }[] = [
    { id: 'home', label: 'Главная', hint: 'Тексты блоков на главной странице — сверху вниз.' },
    { id: 'about', label: 'О компании', hint: 'Все блоки страницы «О компании».' },
    { id: 'catalog', label: 'Каталог', hint: 'Заголовок и описание страницы каталога.' },
    { id: 'contacts', label: 'Контакты', hint: 'Страница контактов и реквизиты связи.' },
    { id: 'footer', label: 'Футер', hint: 'Текст внизу сайта на всех страницах.' },
  ]

  const active = tabs.find((item) => item.id === tab)!

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <h1>Контент сайта</h1>
        <button className="btn btn-primary" type="button" onClick={() => void save()}>
          Сохранить
        </button>
      </div>
      {message && <p className="admin-ok">{message}</p>}

      <div className="admin-tabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'is-active' : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="admin-tab-hint">{active.hint}</p>

      {tab === 'home' && (
        <div className="admin-content-stack">
          <ContentBlock
            title="Первый экран"
            description="То, что видит посетитель сразу при открытии сайта."
          >
            <ContentField
              label="Заголовок"
              rows={2}
              value={draft.home?.heroTitle || ''}
              onChange={(v) => setSection('home', 'heroTitle', v)}
            />
            <ContentField
              label="Текст под заголовком"
              rows={3}
              value={draft.home?.heroLead || ''}
              onChange={(v) => setSection('home', 'heroLead', v)}
            />
            <ContentField
              label="Кнопка основная"
              hint="Например: Смотреть технику"
              value={draft.home?.heroCtaPrimary || ''}
              onChange={(v) => setSection('home', 'heroCtaPrimary', v)}
            />
            <ContentField
              label="Кнопка вторая"
              hint="Например: Запросить цену"
              value={draft.home?.heroCtaSecondary || ''}
              onChange={(v) => setSection('home', 'heroCtaSecondary', v)}
            />
            <ContentField
              label="Картинка hero"
              hint="URL, например /images/excavator-2.jpg"
              value={draft.home?.heroImage || ''}
              onChange={(v) => setSection('home', 'heroImage', v)}
            />
          </ContentBlock>

          <ContentBlock title="Марки" description="Подпись над полосой брендов.">
            <ContentField
              label="Подпись"
              value={draft.home?.brandsLabel || ''}
              onChange={(v) => setSection('home', 'brandsLabel', v)}
            />
          </ContentBlock>

          <ContentBlock title="Категории" description="Блок с типами техники на главной.">
            <ContentField
              label="Заголовок"
              value={draft.home?.categoriesTitle || ''}
              onChange={(v) => setSection('home', 'categoriesTitle', v)}
            />
            <ContentField
              label="Текст"
              rows={2}
              value={draft.home?.categoriesLead || ''}
              onChange={(v) => setSection('home', 'categoriesLead', v)}
            />
          </ContentBlock>

          <ContentBlock title="Каталог на главной" description="Превью техники перед полным каталогом.">
            <ContentField
              label="Заголовок"
              value={draft.home?.catalogTitle || ''}
              onChange={(v) => setSection('home', 'catalogTitle', v)}
            />
            <ContentField
              label="Текст"
              rows={2}
              value={draft.home?.catalogLead || ''}
              onChange={(v) => setSection('home', 'catalogLead', v)}
            />
          </ContentBlock>

          <ContentBlock title="Поставка" description="Как проходит доставка техники.">
            <ContentField
              label="Заголовок"
              value={draft.home?.processTitle || ''}
              onChange={(v) => setSection('home', 'processTitle', v)}
            />
            <ContentField
              label="Текст"
              rows={2}
              value={draft.home?.processLead || ''}
              onChange={(v) => setSection('home', 'processLead', v)}
            />
          </ContentBlock>

          <ContentBlock title="Форма заявки" description="Нижний блок с призывом оставить контакты.">
            <ContentField
              label="Заголовок"
              value={draft.home?.contactTitle || ''}
              onChange={(v) => setSection('home', 'contactTitle', v)}
            />
            <ContentField
              label="Текст"
              rows={2}
              value={draft.home?.contactLead || ''}
              onChange={(v) => setSection('home', 'contactLead', v)}
            />
          </ContentBlock>
        </div>
      )}

      {tab === 'about' && (
        <div className="admin-content-stack">
          <ContentBlock title="Верх страницы">
            <ContentField
              label="Заголовок"
              rows={2}
              value={about.title}
              onChange={(v) => setAbout({ title: v })}
            />
            <ContentField
              label="Текст"
              rows={4}
              value={about.lead}
              onChange={(v) => setAbout({ lead: v })}
            />
          </ContentBlock>

          {about.roles.map((role, index) => (
            <ContentBlock
              key={role.id}
              title={`Роль ${index + 1}`}
              description="Карточка: кто чем занимается."
            >
              <ContentField
                label="Подпись"
                value={role.kicker}
                onChange={(v) => updateAboutList('roles', index, { kicker: v })}
              />
              <ContentField
                label="Заголовок"
                value={role.title}
                onChange={(v) => updateAboutList('roles', index, { title: v })}
              />
              <ContentField
                label="Текст"
                rows={3}
                value={role.text}
                onChange={(v) => updateAboutList('roles', index, { text: v })}
              />
              <ContentField
                label="Пункты"
                hint="Каждый пункт с новой строки"
                rows={4}
                value={role.points.join('\n')}
                onChange={(v) =>
                  updateAboutList('roles', index, {
                    points: v.split('\n').map((line) => line.trim()).filter(Boolean),
                  })
                }
              />
            </ContentBlock>
          ))}

          <ContentBlock title="Факты" description="Чёрная полоса с цифрами.">
            {about.facts.map((fact, index) => (
              <div className="admin-inline-fields" key={fact.id}>
                <ContentField
                  label={`Значение ${index + 1}`}
                  value={fact.value}
                  onChange={(v) => updateAboutList('facts', index, { value: v })}
                />
                <ContentField
                  label="Подпись"
                  value={fact.label}
                  onChange={(v) => updateAboutList('facts', index, { label: v })}
                />
              </div>
            ))}
          </ContentBlock>

          <ContentBlock title="Как устроена работа">
            <ContentField
              label="Заголовок блока"
              value={about.stepsTitle}
              onChange={(v) => setAbout({ stepsTitle: v })}
            />
            <ContentField
              label="Текст блока"
              rows={2}
              value={about.stepsLead}
              onChange={(v) => setAbout({ stepsLead: v })}
            />
            {about.steps.map((step, index) => (
              <div className="admin-inline-fields" key={step.id}>
                <ContentField
                  label="Номер"
                  value={step.n}
                  onChange={(v) => updateAboutList('steps', index, { n: v })}
                />
                <ContentField
                  label="Заголовок шага"
                  value={step.title}
                  onChange={(v) => updateAboutList('steps', index, { title: v })}
                />
                <ContentField
                  label="Текст шага"
                  rows={2}
                  value={step.text}
                  onChange={(v) => updateAboutList('steps', index, { text: v })}
                />
              </div>
            ))}
          </ContentBlock>

          <ContentBlock title="Нижний призыв">
            <ContentField
              label="Заголовок"
              value={about.ctaTitle}
              onChange={(v) => setAbout({ ctaTitle: v })}
            />
            <ContentField
              label="Текст"
              rows={2}
              value={about.ctaLead}
              onChange={(v) => setAbout({ ctaLead: v })}
            />
            <ContentField
              label="Кнопка"
              value={about.ctaButton}
              onChange={(v) => setAbout({ ctaButton: v })}
            />
          </ContentBlock>
        </div>
      )}

      {tab === 'catalog' && (
        <ContentBlock title="Страница каталога">
          <ContentField
            label="Заголовок"
            value={draft.catalog?.title || ''}
            onChange={(v) => setSection('catalog', 'title', v)}
          />
          <ContentField
            label="Текст"
            rows={3}
            value={draft.catalog?.lead || ''}
            onChange={(v) => setSection('catalog', 'lead', v)}
          />
        </ContentBlock>
      )}

      {tab === 'contacts' && (
        <div className="admin-content-stack">
          <ContentBlock title="Заголовок страницы">
            <ContentField
              label="Заголовок"
              value={draft.contacts?.title || ''}
              onChange={(v) => setSection('contacts', 'title', v)}
            />
            <ContentField
              label="Текст"
              rows={3}
              value={draft.contacts?.lead || ''}
              onChange={(v) => setSection('contacts', 'lead', v)}
            />
          </ContentBlock>
          <ContentBlock title="Реквизиты" description="Показываются на странице контактов и в футере.">
            <ContentField
              label="Телефон 1"
              value={draft.contacts?.phone || ''}
              onChange={(v) => setSection('contacts', 'phone', v)}
            />
            <ContentField
              label="Телефон 2"
              value={draft.contacts?.phone2 || ''}
              onChange={(v) => setSection('contacts', 'phone2', v)}
            />
            <ContentField
              label="WhatsApp 1"
              value={draft.contacts?.whatsapp || ''}
              onChange={(v) => setSection('contacts', 'whatsapp', v)}
            />
            <ContentField
              label="WhatsApp 2"
              value={draft.contacts?.whatsapp2 || ''}
              onChange={(v) => setSection('contacts', 'whatsapp2', v)}
            />
            <ContentField
              label="Email"
              value={draft.contacts?.email || ''}
              onChange={(v) => setSection('contacts', 'email', v)}
            />
            <ContentField
              label="Адрес"
              value={draft.contacts?.address || ''}
              onChange={(v) => setSection('contacts', 'address', v)}
            />
            <ContentField
              label="Режим работы"
              value={draft.contacts?.hours || ''}
              onChange={(v) => setSection('contacts', 'hours', v)}
            />
          </ContentBlock>
        </div>
      )}

      {tab === 'footer' && (
        <ContentBlock title="Подвал сайта">
          <ContentField
            label="Текст футера"
            rows={3}
            value={draft.footer?.text || ''}
            onChange={(v) => setSection('footer', 'text', v)}
          />
        </ContentBlock>
      )}
    </div>
  )
}

function FaqAdmin() {
  const { content, refresh } = useSite()
  const [faq, setFaq] = useState(content.faq || [])
  const [message, setMessage] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  useEffect(() => {
    setFaq(content.faq || [])
  }, [content.faq])

  async function save(nextFaq = faq) {
    await api.saveContent({ ...content, faq: nextFaq })
    await refresh()
    setMessage('Сохранено')
  }

  async function addItem() {
    if (!question.trim()) return
    const next = [
      ...faq,
      {
        id: crypto.randomUUID(),
        question: question.trim(),
        answer: answer.trim(),
      },
    ]
    setFaq(next)
    setQuestion('')
    setAnswer('')
    await save(next)
  }

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <h1>FAQ</h1>
        <button className="btn btn-primary" type="button" onClick={() => void save()}>
          Сохранить
        </button>
      </div>
      {message && <p className="admin-ok">{message}</p>}

      <div className="admin-card">
        <h2>Добавить вопрос</h2>
        <div className="admin-grid-form">
          <label className="admin-span-2">
            Вопрос
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Например: Сколько занимает поставка?"
            />
          </label>
          <label className="admin-span-2">
            Ответ
            <textarea
              rows={3}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Текст ответа"
            />
          </label>
        </div>
        <button className="btn btn-primary" type="button" onClick={() => void addItem()}>
          Добавить в FAQ
        </button>
      </div>

      <div className="admin-list">
        {faq.map((item, index) => (
          <div className="admin-card" key={item.id}>
            <label>
              Вопрос
              <input
                value={item.question}
                onChange={(e) => {
                  const next = [...faq]
                  next[index] = { ...next[index], question: e.target.value }
                  setFaq(next)
                }}
              />
            </label>
            <label>
              Ответ
              <textarea
                rows={3}
                value={item.answer}
                onChange={(e) => {
                  const next = [...faq]
                  next[index] = { ...next[index], answer: e.target.value }
                  setFaq(next)
                }}
              />
            </label>
            <button
              type="button"
              className="btn btn-dark"
              onClick={() => {
                const next = faq.filter((_, i) => i !== index)
                setFaq(next)
                void save(next)
              }}
            >
              Удалить
            </button>
          </div>
        ))}
        {!faq.length && <p>Пока нет вопросов — добавьте первый выше.</p>}
      </div>
    </div>
  )
}

function LeadsAdmin() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [tab, setTab] = useState<'new' | 'done' | 'deleted'>('new')

  async function load() {
    setLeads(await api.getLeads())
  }

  useEffect(() => {
    void load()
  }, [])

  const counts = {
    new: leads.filter((l) => l.status === 'new').length,
    done: leads.filter((l) => l.status === 'done').length,
    deleted: leads.filter((l) => l.status === 'deleted').length,
  }

  const visible = leads.filter((lead) => lead.status === tab)

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'new', label: 'Новые' },
    { id: 'done', label: 'Готовые' },
    { id: 'deleted', label: 'Удалённые' },
  ]

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <h1>Заявки</h1>
        <button className="btn btn-primary" type="button" onClick={() => void load()}>
          Обновить
        </button>
      </div>

      <div className="admin-tabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'is-active' : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            <em>{counts[item.id]}</em>
          </button>
        ))}
      </div>

      <div className="admin-list">
        {visible.map((lead) => (
          <div className="admin-card" key={lead.id}>
            <div className="admin-row">
              <strong>{lead.name}</strong>
              <span className={`admin-badge ${lead.status}`}>
                {lead.status === 'new'
                  ? 'новая'
                  : lead.status === 'done'
                    ? 'готовая'
                    : lead.status === 'deleted'
                      ? 'удалённая'
                      : lead.status}
              </span>
            </div>
            <p>{lead.phone}</p>
            <p>{lead.email || '—'}</p>
            <p>{lead.need || '—'}</p>
            <p className="admin-muted">{new Date(lead.createdAt).toLocaleString('ru-RU')}</p>
            <div className="admin-inline">
              {tab === 'new' && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void api.updateLead(lead.id, 'done').then(load)}
                  >
                    В готовые
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={() => void api.updateLead(lead.id, 'deleted').then(load)}
                  >
                    В корзину
                  </button>
                </>
              )}
              {tab === 'done' && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void api.updateLead(lead.id, 'new').then(load)}
                  >
                    Вернуть в новые
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={() => void api.updateLead(lead.id, 'deleted').then(load)}
                  >
                    В корзину
                  </button>
                </>
              )}
              {tab === 'deleted' && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void api.updateLead(lead.id, 'new').then(load)}
                  >
                    Восстановить
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={() => {
                      if (confirm('Удалить заявку навсегда?')) {
                        void api.deleteLead(lead.id).then(load)
                      }
                    }}
                  >
                    Удалить навсегда
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {!visible.length && <p>В этой вкладке заявок нет.</p>}
      </div>
    </div>
  )
}

export function AdminApp() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="robots"]')
    const previous = meta?.getAttribute('content') ?? ''
    if (meta) {
      meta.setAttribute('content', 'noindex, nofollow, noarchive')
    }
    return () => {
      const current = document.querySelector('meta[name="robots"]')
      if (current) {
        current.setAttribute('content', previous || 'index, follow')
      }
    }
  }, [])

  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route
        index
        element={
          <Guard>
            <AdminHome />
          </Guard>
        }
      />
      <Route
        path="content"
        element={
          <Guard>
            <ContentAdmin />
          </Guard>
        }
      />
      <Route
        path="faq"
        element={
          <Guard>
            <FaqAdmin />
          </Guard>
        }
      />
      <Route
        path="categories"
        element={
          <Guard>
            <CategoriesAdmin />
          </Guard>
        }
      />
      <Route
        path="categories/new"
        element={
          <Guard>
            <CategoryEditor />
          </Guard>
        }
      />
      <Route
        path="categories/:id"
        element={
          <Guard>
            <CategoryEditor />
          </Guard>
        }
      />
      <Route
        path="brands"
        element={
          <Guard>
            <BrandsAdmin />
          </Guard>
        }
      />
      <Route
        path="brands/:id"
        element={
          <Guard>
            <BrandEditor />
          </Guard>
        }
      />
      <Route
        path="machines"
        element={
          <Guard>
            <MachinesAdmin />
          </Guard>
        }
      />
      <Route
        path="machines/new"
        element={
          <Guard>
            <MachineEditor />
          </Guard>
        }
      />
      <Route
        path="machines/:id"
        element={
          <Guard>
            <MachineEditor />
          </Guard>
        }
      />
      <Route
        path="stats"
        element={
          <Guard>
            <StatsPage />
          </Guard>
        }
      />
      <Route
        path="leads"
        element={
          <Guard>
            <LeadsAdmin />
          </Guard>
        }
      />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
