import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useSite } from '../context/SiteContext'
import { machinePath } from '../categorySlug'
import { machinesInCategory } from '../catalogFilters'
import { categoryOptionLabel, flattenCategoryTree } from '../categoryTree'
import { MachineStats } from './StatsPage'
import type { Category, Machine, Spec } from '../types'
import { machineVideos, parsePriceAmount } from '../types'
import { MediaListField } from './MediaFields'

const PAGE_SIZE = 20
const RELATED_PAGE = 12

function RelatedPicker({
  machines,
  categories,
  currentId,
  selected,
  onToggle,
}: {
  machines: Machine[]
  categories: Category[]
  currentId?: string
  selected: string[]
  onToggle: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [page, setPage] = useState(1)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return machinesInCategory(
      machines.filter((machine) => machine.id !== currentId),
      categoryId,
      categories,
    ).filter((machine) => {
      if (!q) return true
      return `${machine.name} ${machine.brand} ${machine.category}`.toLowerCase().includes(q)
    })
  }, [machines, categories, currentId, categoryId, query])
  const pageCount = Math.max(1, Math.ceil(filtered.length / RELATED_PAGE))
  const current = Math.min(page, pageCount)
  const visible = filtered.slice((current - 1) * RELATED_PAGE, current * RELATED_PAGE)

  useEffect(() => {
    setPage(1)
  }, [query, categoryId])

  return (
    <div className="admin-related-picker">
      <div className="admin-related-toolbar">
        <label>
          Поиск
          <input
            value={query}
            placeholder="Название или марка"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Категория
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="all">Все</option>
            {flattenCategoryTree(categories).map(({ category, depth }) => (
              <option key={category.id} value={category.id}>
                {categoryOptionLabel(category.title, depth)}
              </option>
            ))}
          </select>
        </label>
        <p>
          Выбрано {selected.length} · найдено {filtered.length}
        </p>
      </div>
      <ul className="admin-related-list">
        {visible.map((machine) => (
          <li key={machine.id}>
            <label>
              <input
                type="checkbox"
                checked={selected.includes(machine.id)}
                onChange={() => onToggle(machine.id)}
              />
              <img src={machine.images?.[0]} alt="" />
              <span>
                <strong>{machine.name}</strong>
                <em>
                  {machine.brand} · {machine.category}
                  {machine.draft ? ' · скрыта' : ''}
                </em>
              </span>
            </label>
          </li>
        ))}
        {!visible.length ? <li className="admin-muted">Ничего не найдено</li> : null}
      </ul>
      {pageCount > 1 ? (
        <div className="admin-pager">
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
            <button
              key={item}
              type="button"
              className={item === current ? 'is-active' : undefined}
              onClick={() => setPage(item)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function emptyMachine(): Partial<Machine> {
  return {
    name: '',
    brandId: '',
    categoryId: '',
    category: '',
    year: new Date().getFullYear(),
    condition: 'Новый',
    price: '',
    priceFrom: 0,
    images: [],
    videos: [],
    videoUrl: '',
    description: '',
    specs: [{ id: crypto.randomUUID(), label: '', value: '' }],
    relatedIds: [],
    draft: false,
  }
}

export function MachinesAdmin() {
  const { allMachines, categories, refresh } = useSite()
  const [search, setSearch] = useSearchParams()
  const categoryId = search.get('category') || 'all'
  const page = Math.max(1, Number(search.get('page') || '1') || 1)
  const filtered = machinesInCategory(allMachines, categoryId, categories)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  function patch(next: { category?: string | null; page?: string | null }) {
    const params = new URLSearchParams(search)
    if (next.category !== undefined) {
      if (!next.category || next.category === 'all') params.delete('category')
      else params.set('category', next.category)
    }
    if (next.page !== undefined) {
      if (!next.page || next.page === '1') params.delete('page')
      else params.set('page', next.page)
    }
    setSearch(params)
  }

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <h1>Техника</h1>
        <Link className="btn btn-primary" to="/admin/machines/new">
          Создать позицию
        </Link>
      </div>
      <div className="admin-machines-bar">
        <label>
          Категория
          <select
            value={categoryId}
            onChange={(event) => patch({ category: event.target.value, page: null })}
          >
            <option value="all">Все</option>
            {flattenCategoryTree(categories).map(({ category, depth }) => (
              <option key={category.id} value={category.id}>
                {categoryOptionLabel(category.title, depth)}
              </option>
            ))}
          </select>
        </label>
        <p>
          {filtered.length} позиций · страница {current} из {pageCount}
        </p>
      </div>
      <div className="admin-list">
        {visible.map((machine) => (
          <div className="admin-card admin-row" key={machine.id}>
            <img src={machine.images?.[0]} alt="" className="admin-thumb" />
            <div>
              <strong>{machine.name}</strong>
              <p>
                {machine.brand} · {machine.category}
                {machine.draft ? ' · скрыта' : ''}
              </p>
            </div>
            {machine.draft ? <span className="admin-badge">Скрыта</span> : <span className="admin-badge done">На сайте</span>}
            <Link className="btn btn-dark" to={`/admin/machines/${machine.id}`}>
              Изменить
            </Link>
            <button
              type="button"
              className="btn btn-dark"
              onClick={() => {
                if (!confirm(`Удалить «${machine.name}»?`)) return
                void api.deleteMachine(machine.id).then(refresh)
              }}
            >
              Удалить
            </button>
          </div>
        ))}
        {!visible.length && <p>В этом списке пока нет техники.</p>}
      </div>
      {pageCount > 1 && (
        <div className="admin-pager">
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
            <button
              key={item}
              type="button"
              className={item === current ? 'is-active' : undefined}
              onClick={() => patch({ page: String(item) })}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function MachineEditor() {
  const { id = 'new' } = useParams()
  const navigate = useNavigate()
  const { allMachines, brands, categories, loading, refresh } = useSite()
  const current = id === 'new' ? undefined : allMachines.find((item) => item.id === id)
  const [draft, setDraft] = useState<Partial<Machine>>(emptyMachine)
  const [ready, setReady] = useState(id === 'new')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (ready || !current) return
    setDraft({
      ...current,
      specs: current.specs.map((spec) => ({ ...spec })),
      relatedIds: [...(current.relatedIds || [])],
      images: [...(current.images || [])],
      videos: machineVideos(current),
    })
    setReady(true)
  }, [current, ready])

  useEffect(() => {
    if (id !== 'new' || ready) return
    if (!brands.length && !categories.length) return
    setDraft((prev) => ({
      ...prev,
      brandId: prev.brandId || brands[0]?.id || '',
      categoryId: prev.categoryId || categories[0]?.id || '',
      category: prev.category || categories[0]?.title || '',
    }))
    setReady(true)
  }, [id, ready, brands, categories])

  const categorySpecHints = useMemo(() => {
    const labels = new Set<string>()
    for (const machine of allMachines) {
      if (machine.categoryId !== draft.categoryId) continue
      for (const spec of machine.specs || []) {
        if (spec.label.trim()) labels.add(spec.label.trim())
      }
    }
    return [...labels].sort((a, b) => a.localeCompare(b, 'ru'))
  }, [allMachines, draft.categoryId])

  async function save(next = draft) {
    setError('')
    setMessage('')
    const videos = (next.videos || []).map((item) => item.trim()).filter(Boolean)
    const payload = { ...next, videos, videoUrl: videos[0] || '' }
    try {
      if (current) {
        await api.updateMachine(current.id, payload)
        setMessage('Сохранено')
      } else {
        const created = await api.createMachine(payload)
        navigate(`/admin/machines/${created.id}`, { replace: true })
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    }
  }

  async function toggleDraft() {
    const next = { ...draft, draft: !draft.draft }
    setDraft(next)
    if (current) await save(next)
  }

  function toggleRelated(relatedId: string) {
    setDraft((prev) => {
      const list = prev.relatedIds || []
      return {
        ...prev,
        relatedIds: list.includes(relatedId) ? list.filter((item) => item !== relatedId) : [...list, relatedId],
      }
    })
  }

  if (id !== 'new' && !loading && !current) {
    return (
      <div className="admin-section">
        <h1>Техника не найдена</h1>
        <Link to="/admin/machines">К списку</Link>
      </div>
    )
  }

  const pageUrl = current ? machinePath(current, categories, allMachines) : ''

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <h1>{current ? current.name : 'Новая позиция'}</h1>
        <div className="admin-inline">
          <Link className="btn btn-dark" to="/admin/machines">
            К списку
          </Link>
          <button
            className="btn btn-dark"
            type="button"
            onClick={() => (current ? void toggleDraft() : setDraft((prev) => ({ ...prev, draft: !prev.draft })))}
          >
            {draft.draft ? 'Показать' : 'Скрыть'}
          </button>
          {pageUrl ? (
            <a className="btn btn-dark" href={pageUrl} target="_blank" rel="noreferrer">
              Открыть страницу
            </a>
          ) : null}
        </div>
      </div>
      <div className="admin-content-stack">
        {current ? <MachineStats machineId={current.id} /> : null}
        <section className="admin-content-block">
          <div className="admin-content-block-head">
            <h2>Карточка</h2>
            <p>{draft.draft ? 'Позиция скрыта из каталога и поиска.' : 'Позиция видна на сайте.'}</p>
          </div>
          <div className="admin-grid-form">
            <label>
              Название
              <input value={draft.name || ''} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
            </label>
            <label>
              Марка
              <select value={draft.brandId || ''} onChange={(event) => setDraft((prev) => ({ ...prev, brandId: event.target.value }))}>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </label>
            <label>
              Категория
              <select
                value={draft.categoryId || ''}
                onChange={(event) => {
                  const category = categories.find((item) => item.id === event.target.value)
                  setDraft((prev) => ({
                    ...prev,
                    categoryId: event.target.value,
                    category: category?.title || prev.category,
                  }))
                }}
              >
                {flattenCategoryTree(categories).map(({ category, depth }) => (
                  <option key={category.id} value={category.id}>
                    {categoryOptionLabel(category.title, depth)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Тип (подпись)
              <input value={draft.category || ''} onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))} />
            </label>
            <label>
              Год
              <input type="number" value={draft.year || ''} onChange={(event) => setDraft((prev) => ({ ...prev, year: Number(event.target.value) }))} />
            </label>
            <label>
              Состояние
              <input value={draft.condition || ''} onChange={(event) => setDraft((prev) => ({ ...prev, condition: event.target.value }))} />
            </label>
            <label>
              Цена
              <input
                value={draft.price || ''}
                placeholder="105 000 000"
                onChange={(event) => {
                  const price = event.target.value
                  setDraft((prev) => ({ ...prev, price, priceFrom: parsePriceAmount(price, 0) ?? 0 }))
                }}
              />
            </label>
            <label className="admin-span-2">
              Описание
              <textarea rows={4} value={draft.description || ''} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} />
            </label>
          </div>
        </section>
        <section className="admin-content-block">
          <div className="admin-content-block-head">
            <h2>Фото и видео</h2>
            <p>Файл с компьютера или ссылка, если хранить на хостинге не нужно.</p>
          </div>
          <div className="admin-grid-form">
            <MediaListField
              label="Фото"
              hint="Порядок в списке — порядок в слайдере."
              items={draft.images || []}
              onChange={(images) => setDraft((prev) => ({ ...prev, images }))}
              accept="image/*"
              kind="image"
            />
            <MediaListField
              label="Видео"
              hint="Можно несколько: файл, YouTube или Google Drive."
              items={draft.videos || []}
              onChange={(videos) => setDraft((prev) => ({ ...prev, videos }))}
              accept="video/*"
              kind="video"
            />
          </div>
        </section>
        <section className="admin-content-block">
          <div className="admin-content-block-head">
            <h2>Характеристики</h2>
          </div>
          <div className="admin-specs-editor">
            {(draft.specs || []).map((spec, index) => (
              <div className="admin-spec-row" key={spec.id}>
                <label>
                  Название
                  <input
                    list="category-spec-hints"
                    value={spec.label}
                    onChange={(event) => {
                      const specs = [...(draft.specs || [])] as Spec[]
                      specs[index] = { ...specs[index], label: event.target.value }
                      setDraft((prev) => ({ ...prev, specs }))
                    }}
                  />
                </label>
                <label>
                  Значение
                  <input
                    value={spec.value}
                    onChange={(event) => {
                      const specs = [...(draft.specs || [])] as Spec[]
                      specs[index] = { ...specs[index], value: event.target.value }
                      setDraft((prev) => ({ ...prev, specs }))
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={() => setDraft((prev) => ({ ...prev, specs: (prev.specs || []).filter((_, specIndex) => specIndex !== index) }))}
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
                setDraft((prev) => ({
                  ...prev,
                  specs: [...(prev.specs || []), { id: crypto.randomUUID(), label: '', value: '' }],
                }))
              }
            >
              Добавить характеристику
            </button>
          </div>
        </section>
        <section className="admin-content-block">
          <div className="admin-content-block-head">
            <h2>Похожая техника</h2>
          </div>
          <RelatedPicker
            machines={allMachines}
            categories={categories}
            currentId={current?.id}
            selected={draft.relatedIds || []}
            onToggle={toggleRelated}
          />
        </section>
        <div className="admin-inline">
          <button className="btn btn-primary" type="button" onClick={() => void save()}>
            Сохранить
          </button>
          {message ? <p className="admin-ok">{message}</p> : null}
          {error ? <p className="admin-error">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
