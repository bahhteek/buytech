import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useSite } from '../context/SiteContext'
import { brandPath } from '../categorySlug'
import { ArticleEditor } from './ArticleEditor'
import { SingleMediaField } from './MediaFields'

export function BrandsAdmin() {
  const { brands, refresh } = useSite()
  const navigate = useNavigate()
  const [name, setName] = useState('')

  async function create() {
    if (!name.trim()) return
    const brand = await api.createBrand(name.trim())
    setName('')
    await refresh()
    navigate(`/admin/brands/${brand.id}`)
  }

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <h1>Марки</h1>
      </div>
      <div className="admin-inline">
        <input placeholder="Новая марка" value={name} onChange={(event) => setName(event.target.value)} />
        <button className="btn btn-primary" type="button" onClick={() => void create()}>
          Добавить
        </button>
      </div>
      <div className="admin-list">
        {brands.map((brand) => (
          <div className="admin-card admin-row" key={brand.id}>
            <div>
              <strong>{brand.name}</strong>
              <p>{brand.shortText || 'Страница марки ещё без текста'}</p>
            </div>
            <Link className="btn btn-dark" to={`/admin/brands/${brand.id}`}>
              Редактировать
            </Link>
            <a className="btn btn-dark" href={brandPath(brand, brands)} target="_blank" rel="noreferrer">
              Открыть страницу
            </a>
            <button type="button" className="btn btn-dark" onClick={() => void api.deleteBrand(brand.id).then(refresh)}>
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BrandEditor() {
  const { id = '' } = useParams()
  const { brands, loading, refresh } = useSite()
  const brand = brands.find((item) => item.id === id)
  const [name, setName] = useState(brand?.name || '')
  const [bannerImage, setBannerImage] = useState(brand?.bannerImage || '')
  const [shortText, setShortText] = useState(brand?.shortText || '')
  const [article, setArticle] = useState(brand?.article || '')
  const [hydrated, setHydrated] = useState(Boolean(brand))

  useEffect(() => {
    if (!brand || hydrated) return
    setName(brand.name)
    setBannerImage(brand.bannerImage || '')
    setShortText(brand.shortText || '')
    setArticle(brand.article || '')
    setHydrated(true)
  }, [brand, hydrated])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function save() {
    setError('')
    setMessage('')
    try {
      await api.updateBrand(id, { name, bannerImage, shortText, article })
      await refresh()
      setMessage('Сохранено')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    }
  }

  if (loading && !brand) {
    return (
      <div className="admin-section">
        <p>Загрузка…</p>
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="admin-section">
        <h1>Марка не найдена</h1>
        <Link to="/admin/brands">К списку</Link>
      </div>
    )
  }

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <h1>{brand.name}</h1>
        <Link className="btn btn-dark" to="/admin/brands">
          К списку
        </Link>
      </div>
      <div className="admin-card admin-form">
        <label>
          Название
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="admin-span-2">
          Короткий текст на баннере
          <textarea rows={3} value={shortText} onChange={(event) => setShortText(event.target.value)} />
        </label>
        <SingleMediaField label="Картинка баннера" value={bannerImage} onChange={setBannerImage} />
        <div className="admin-span-2">
          <span className="admin-field-label">Статья</span>
          <ArticleEditor value={article} onChange={setArticle} />
        </div>
        <div className="admin-inline">
          <button className="btn btn-primary" type="button" onClick={() => void save()}>
            Сохранить
          </button>
          <a className="btn btn-dark" href={brandPath({ ...brand, name }, brands)} target="_blank" rel="noreferrer">
            Открыть страницу
          </a>
          {message ? <p className="admin-ok">{message}</p> : null}
          {error ? <p className="admin-error">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
