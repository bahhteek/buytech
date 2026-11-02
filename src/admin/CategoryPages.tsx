import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useSite } from '../context/SiteContext'
import { categoryOptionLabel, childCategories, descendantIds, flattenCategoryTree } from '../categoryTree'
import { SingleMediaField } from './MediaFields'

export function CategoriesAdmin() {
  const { categories, refresh } = useSite()
  const [openIds, setOpenIds] = useState<string[]>([])
  const roots = childCategories(categories, '')

  function toggle(id: string) {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  async function remove(id: string, title: string) {
    const kids = flattenCategoryTree(categories, id)
    const extra = kids.length ? ` Вместе с ней удалятся ${kids.length} подкатегорий.` : ''
    if (!confirm(`Удалить «${title}»?${extra}`)) return
    await api.deleteCategory(id)
    await refresh()
  }

  function row(category: { id: string; title: string; image: string }, nested = false, depth = 0) {
    return (
      <div
        className={`admin-tree-row${nested ? ' is-nested' : ''}`}
        key={category.id}
        style={nested ? { marginLeft: `${depth * 1.75}rem` } : undefined}
      >
        <img src={category.image} alt="" />
        <div>
          <strong>{category.title}</strong>
        </div>
        <Link className="btn btn-dark" to={`/admin/categories/${category.id}`}>
          Редактировать
        </Link>
        <Link className="btn btn-dark" to={`/admin/categories/new?parent=${encodeURIComponent(category.id)}`}>
          Подкатегория
        </Link>
        <button type="button" className="btn btn-dark" onClick={() => void remove(category.id, category.title)}>
          Удалить
        </button>
      </div>
    )
  }

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <h1>Категории</h1>
        <Link className="btn btn-primary" to="/admin/categories/new">
          Создать категорию
        </Link>
      </div>
      <div className="admin-tree">
        {roots.map((root) => {
          const children = flattenCategoryTree(categories, root.id)
          const open = openIds.includes(root.id)
          return (
            <div className="admin-tree-group" key={root.id}>
              <div className="admin-tree-row">
                {children.length ? (
                  <button
                    type="button"
                    className={`admin-tree-toggle${open ? ' is-open' : ''}`}
                    aria-label={open ? 'Закрыть подкатегории' : 'Открыть подкатегории'}
                    onClick={() => toggle(root.id)}
                  >
                    <svg viewBox="0 0 12 12" aria-hidden="true">
                      <path
                        d="M4.25 2.5 L7.75 6 L4.25 9.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                ) : null}
                <img src={root.image} alt="" />
                <div>
                  <strong>{root.title}</strong>
                </div>
                <Link className="btn btn-dark" to={`/admin/categories/${root.id}`}>
                  Редактировать
                </Link>
                <Link className="btn btn-dark" to={`/admin/categories/new?parent=${encodeURIComponent(root.id)}`}>
                  Подкатегория
                </Link>
                <button type="button" className="btn btn-dark" onClick={() => void remove(root.id, root.title)}>
                  Удалить
                </button>
              </div>
              {open
                ? children.map(({ category, depth }) => row(category, true, depth + 1))
                : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CategoryEditor() {
  const { id } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { categories, loading, refresh } = useSite()
  const current = id && id !== 'new' ? categories.find((item) => item.id === id) : undefined
  const [title, setTitle] = useState(current?.title || '')
  const [image, setImage] = useState(current?.image || '')
  const [parentId, setParentId] = useState(current?.parentId || search.get('parent') || '')
  const [hydrated, setHydrated] = useState(!id || id === 'new' || Boolean(current))

  useEffect(() => {
    if (!current || hydrated) return
    setTitle(current.title)
    setImage(current.image || '')
    setParentId(current.parentId || '')
    setHydrated(true)
  }, [current, hydrated])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const blocked = current ? new Set(descendantIds(categories, current.id)) : new Set<string>()
  const parents = flattenCategoryTree(categories).filter(({ category }) => !blocked.has(category.id))

  async function save() {
    setError('')
    setMessage('')
    if (!title.trim()) {
      setError('Укажите название')
      return
    }
    const payload = { title: title.trim(), hint: title.trim(), image, parentId }
    try {
      if (current) {
        await api.updateCategory(current.id, payload)
        setMessage('Сохранено')
      } else {
        await api.createCategory(payload)
        navigate('/admin/categories')
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    }
  }

  if (id && id !== 'new' && loading && !current) {
    return (
      <div className="admin-section">
        <p>Загрузка…</p>
      </div>
    )
  }

  if (id && id !== 'new' && !current) {
    return (
      <div className="admin-section">
        <h1>Категория не найдена</h1>
        <Link to="/admin/categories">К списку</Link>
      </div>
    )
  }

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <h1>{current ? 'Редактирование категории' : 'Новая категория'}</h1>
        <Link className="btn btn-dark" to="/admin/categories">
          К списку
        </Link>
      </div>
      <div className="admin-card admin-form">
        <label>
          Название
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Надкатегория
          <select value={parentId} onChange={(event) => setParentId(event.target.value)}>
            <option value="">Корневая</option>
            {parents.map(({ category, depth }) => (
              <option key={category.id} value={category.id}>
                {categoryOptionLabel(category.title, depth)}
              </option>
            ))}
          </select>
        </label>
        <SingleMediaField label="Картинка" value={image} onChange={setImage} />
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
