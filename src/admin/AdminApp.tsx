import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { api, clearAdminToken, getAdminToken, setAdminToken } from '../api/client'
import type { AboutContent, Brand, Category, Lead, Machine, SiteContent, Spec } from '../types'
import { normalizeAbout } from '../types'
import { useSite } from '../context/SiteContext'
import './admin.css'

function requireAuth() {
  return Boolean(getAdminToken())
}

function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

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
        <p className="admin-hint">По умолчанию: admin / buytech-admin</p>
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
        <Link className="logo" to="/admin">
          Buy<span>Tech</span> Admin
        </Link>
        <nav>
          <Link to="/admin">Обзор</Link>
          <Link to="/admin/content">Контент</Link>
          <Link to="/admin/faq">FAQ</Link>
          <Link to="/admin/categories">Категории</Link>
          <Link to="/admin/brands">Марки</Link>
          <Link to="/admin/machines">Техника</Link>
          <Link to="/admin/leads">Заявки</Link>
        </nav>
        <div className="admin-aside-foot">
          <Link to="/">На сайт</Link>
          <button type="button" onClick={() => void logout()}>
            Выйти
          </button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  )
}

function Guard({ children }: { children: ReactNode }) {
  if (!requireAuth()) return <Navigate to="/admin/login" replace />
  return <AdminShell>{children}</AdminShell>
}

function AdminHome() {
  const { machines, categories, brands } = useSite()
  const [leadsCount, setLeadsCount] = useState(0)

  useEffect(() => {
    void api.getLeads().then((leads) => setLeadsCount(leads.filter((l) => l.status === 'new').length))
  }, [])

  return (
    <div>
      <h1>Обзор</h1>
      <div className="admin-stats">
        <article>
          <strong>{machines.length}</strong>
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
              label="Телефон"
              value={draft.contacts?.phone || ''}
              onChange={(v) => setSection('contacts', 'phone', v)}
            />
            <ContentField
              label="WhatsApp"
              value={draft.contacts?.whatsapp || ''}
              onChange={(v) => setSection('contacts', 'whatsapp', v)}
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

function CategoriesAdmin() {
  const { categories, refresh } = useSite()
  const [title, setTitle] = useState('')
  const [hint, setHint] = useState('')
  const [image, setImage] = useState('/images/excavator.jpg')

  async function create() {
    await api.createCategory({ title, hint, image })
    setTitle('')
    setHint('')
    await refresh()
  }

  async function onUpload(file: File, category: Category) {
    const { url } = await api.upload(file)
    await api.updateCategory(category.id, { image: url })
    await refresh()
  }

  return (
    <div className="admin-section">
      <h1>Категории</h1>
      <div className="admin-card">
        <h2>Добавить</h2>
        <div className="admin-inline">
          <input placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input placeholder="Подпись" value={hint} onChange={(e) => setHint(e.target.value)} />
          <input placeholder="URL фото" value={image} onChange={(e) => setImage(e.target.value)} />
          <button className="btn btn-primary" type="button" onClick={() => void create()}>
            Добавить
          </button>
        </div>
      </div>
      <div className="admin-list">
        {categories.map((category) => (
          <div className="admin-card" key={category.id}>
            <img src={category.image} alt="" className="admin-thumb" />
            <input
              value={category.title}
              onChange={(e) => {
                category.title = e.target.value
                void api.updateCategory(category.id, { title: e.target.value }).then(refresh)
              }}
            />
            <input
              value={category.hint}
              onChange={(e) => {
                void api.updateCategory(category.id, { hint: e.target.value }).then(refresh)
              }}
            />
            <label className="admin-file">
              Фото
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onUpload(file, category)
                }}
              />
            </label>
            <button
              type="button"
              className="btn btn-dark"
              onClick={() => void api.deleteCategory(category.id).then(refresh)}
            >
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function BrandsAdmin() {
  const { brands, refresh } = useSite()
  const [name, setName] = useState('')

  return (
    <div className="admin-section">
      <h1>Марки</h1>
      <div className="admin-inline">
        <input placeholder="Новая марка" value={name} onChange={(e) => setName(e.target.value)} />
        <button
          className="btn btn-primary"
          type="button"
          onClick={() =>
            void api.createBrand(name).then(() => {
              setName('')
              return refresh()
            })
          }
        >
          Добавить
        </button>
      </div>
      <div className="admin-list">
        {brands.map((brand) => (
          <div className="admin-card admin-row" key={brand.id}>
            <input
              value={brand.name}
              onChange={(e) => void api.updateBrand(brand.id, e.target.value).then(refresh)}
            />
            <button
              type="button"
              className="btn btn-dark"
              onClick={() => void api.deleteBrand(brand.id).then(refresh)}
            >
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function emptyMachine(brands: Brand[], categories: Category[]): Partial<Machine> {
  return {
    name: '',
    brandId: brands[0]?.id,
    categoryId: categories[0]?.id,
    category: categories[0]?.title || '',
    year: new Date().getFullYear(),
    condition: 'Новый',
    price: '',
    priceFrom: 0,
    images: [],
    videoUrl: '',
    description: '',
    specs: [{ id: crypto.randomUUID(), label: '', value: '' }],
    relatedIds: [],
  }
}

function MachinesAdmin() {
  const { machines, brands, categories, refresh } = useSite()
  const [draft, setDraft] = useState<Partial<Machine>>(emptyMachine(brands, categories))
  const [editingId, setEditingId] = useState<string | null>(null)

  function startEdit(machine: Machine) {
    setEditingId(machine.id)
    setDraft({
      ...machine,
      specs: machine.specs.map((s) => ({ ...s })),
      relatedIds: [...(machine.relatedIds || [])],
      images: [...(machine.images || [])],
    })
  }

  function resetForm() {
    setEditingId(null)
    setDraft(emptyMachine(brands, categories))
  }

  async function save() {
    if (editingId) await api.updateMachine(editingId, draft)
    else await api.createMachine(draft)
    resetForm()
    await refresh()
  }

  async function uploadImage(file: File) {
    const { url } = await api.upload(file)
    setDraft((prev) => ({ ...prev, images: [...(prev.images || []), url] }))
  }

  function toggleRelated(id: string) {
    setDraft((prev) => {
      const current = prev.relatedIds || []
      return {
        ...prev,
        relatedIds: current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      }
    })
  }

  const relatedCandidates = machines.filter((machine) => machine.id !== editingId)
  const categorySpecHints = useMemo(() => {
    const labels = new Set<string>()
    for (const machine of machines) {
      if (machine.categoryId !== draft.categoryId) continue
      for (const spec of machine.specs || []) {
        if (spec.label.trim()) labels.add(spec.label.trim())
      }
    }
    return [...labels].sort((a, b) => a.localeCompare(b, 'ru'))
  }, [machines, draft.categoryId])

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <h1>Техника</h1>
        {editingId && (
          <button className="btn btn-dark" type="button" onClick={resetForm}>
            Новая позиция
          </button>
        )}
      </div>

      <div className="admin-content-stack">
        <ContentBlock
          title={editingId ? 'Редактирование' : 'Новая позиция'}
          description="Основные данные карточки техники."
        >
          <label>
            Название
            <input
              value={draft.name || ''}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            />
          </label>
          <label>
            Марка
            <select
              value={draft.brandId || ''}
              onChange={(e) => setDraft((p) => ({ ...p, brandId: e.target.value }))}
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Категория
            <select
              value={draft.categoryId || ''}
              onChange={(e) => {
                const category = categories.find((item) => item.id === e.target.value)
                setDraft((p) => ({
                  ...p,
                  categoryId: e.target.value,
                  category: category?.title || p.category,
                }))
              }}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Тип (подпись)
            <input
              value={draft.category || ''}
              onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
              placeholder="Экскаватор"
            />
          </label>
          <label>
            Год
            <input
              type="number"
              value={draft.year || ''}
              onChange={(e) => setDraft((p) => ({ ...p, year: Number(e.target.value) }))}
            />
          </label>
          <label>
            Состояние
            <input
              value={draft.condition || ''}
              onChange={(e) => setDraft((p) => ({ ...p, condition: e.target.value }))}
            />
          </label>
          <label>
            Цена (текст)
            <input
              value={draft.price || ''}
              onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value }))}
              placeholder="от 24 700 000 ₸"
            />
          </label>
          <label>
            Цена от (число)
            <input
              type="number"
              value={draft.priceFrom || 0}
              onChange={(e) => setDraft((p) => ({ ...p, priceFrom: Number(e.target.value) }))}
            />
          </label>
          <label className="admin-span-2">
            Описание
            <textarea
              rows={3}
              value={draft.description || ''}
              onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
            />
          </label>
        </ContentBlock>

        <ContentBlock title="Медиа" description="Фото для слайдера и необязательное видео.">
          <label className="admin-span-2">
            Видео URL
            <input
              value={draft.videoUrl || ''}
              onChange={(e) => setDraft((p) => ({ ...p, videoUrl: e.target.value }))}
              placeholder="YouTube или ссылка на файл"
            />
          </label>
          <div className="admin-span-2 admin-media-block">
            <div className="admin-thumbs">
              {(draft.images || []).map((url) => (
                <div key={url} className="admin-thumb-wrap">
                  <img src={url} alt="" />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        images: (p.images || []).filter((item) => item !== url),
                      }))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <label className="admin-file">
              Загрузить фото
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  files.forEach((file) => void uploadImage(file))
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </ContentBlock>

        <ContentBlock
          title="Характеристики"
          description="Эти поля попадают в карточку и в фильтр каталога."
        >
          <div className="admin-span-2 admin-specs-editor">
            {(draft.specs || []).map((spec, index) => (
              <div className="admin-spec-row" key={spec.id}>
                <label>
                  Название
                  <input
                    list="category-spec-hints"
                    placeholder="Мощность"
                    value={spec.label}
                    onChange={(e) => {
                      const specs = [...(draft.specs || [])] as Spec[]
                      specs[index] = { ...specs[index], label: e.target.value }
                      setDraft((p) => ({ ...p, specs }))
                    }}
                  />
                </label>
                <label>
                  Значение
                  <input
                    placeholder="371 л.с."
                    value={spec.value}
                    onChange={(e) => {
                      const specs = [...(draft.specs || [])] as Spec[]
                      specs[index] = { ...specs[index], value: e.target.value }
                      setDraft((p) => ({ ...p, specs }))
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-dark"
                  aria-label="Удалить характеристику"
                  onClick={() =>
                    setDraft((p) => ({
                      ...p,
                      specs: (p.specs || []).filter((_, i) => i !== index),
                    }))
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <datalist id="category-spec-hints">
              {categorySpecHints.map((label) => (
                <option key={label} value={label} />
              ))}
            </datalist>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                setDraft((p) => ({
                  ...p,
                  specs: [
                    ...(p.specs || []),
                    { id: crypto.randomUUID(), label: '', value: '' },
                  ],
                }))
              }
            >
              Добавить характеристику
            </button>
          </div>
        </ContentBlock>

        <ContentBlock
          title="Похожая техника"
          description="Что показывать внизу страницы товара. Если ничего не выбрать — подставим автоматически из той же категории."
        >
          <div className="admin-span-2">
            {relatedCandidates.length ? (
              <ul className="admin-related-list">
                {relatedCandidates.map((machine) => (
                  <li key={machine.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={(draft.relatedIds || []).includes(machine.id)}
                        onChange={() => toggleRelated(machine.id)}
                      />
                      <img src={machine.images?.[0]} alt="" />
                      <span>
                        <strong>{machine.name}</strong>
                        <em>
                          {machine.brand} · {machine.category}
                        </em>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-tab-hint">Пока нет других позиций для выбора.</p>
            )}
          </div>
        </ContentBlock>

        <div className="admin-inline">
          <button className="btn btn-primary" type="button" onClick={() => void save()}>
            {editingId ? 'Сохранить изменения' : 'Добавить технику'}
          </button>
          {editingId && (
            <button className="btn btn-dark" type="button" onClick={resetForm}>
              Отмена
            </button>
          )}
        </div>
      </div>

      <div className="admin-list">
        <h2>Все позиции</h2>
        {machines.map((machine) => (
          <div className="admin-card admin-row" key={machine.id}>
            <img src={machine.images?.[0]} alt="" className="admin-thumb" />
            <div>
              <strong>{machine.name}</strong>
              <p>
                {machine.brand} · {machine.category}
                {(machine.relatedIds || []).length
                  ? ` · похожих: ${machine.relatedIds?.length}`
                  : ''}
              </p>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => startEdit(machine)}>
              Изменить
            </button>
            <button
              type="button"
              className="btn btn-dark"
              onClick={() => void api.deleteMachine(machine.id).then(refresh)}
            >
              Удалить
            </button>
          </div>
        ))}
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
        path="brands"
        element={
          <Guard>
            <BrandsAdmin />
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
