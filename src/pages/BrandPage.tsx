import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { Footer, Header } from '../components/Layout'
import { useSite } from '../context/SiteContext'
import { brandPath, findBrandBySlugOrId } from '../categorySlug'
import { sanitizeArticle } from '../articleHtml'
import { resolveImageUrl } from '../mediaUrl'
import './BrandPage.css'

export function BrandPage() {
  const { brandSlug } = useParams()
  const location = useLocation()
  const { brands, loading } = useSite()
  const brand = brandSlug ? findBrandBySlugOrId(brands, brandSlug) : undefined

  if (loading && !brand) {
    return (
      <div className="page brand-page">
        <Header />
        <main className="brand-main">
          <p>Загрузка…</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!brand) {
    return <Navigate to="/" replace />
  }

  const pretty = brandPath(brand, brands)
  if (location.pathname !== pretty) {
    return <Navigate to={pretty} replace />
  }

  const article = sanitizeArticle(brand.article || '')
  const banner = brand.bannerImage ? resolveImageUrl(brand.bannerImage) : ''

  return (
    <div className="page brand-page">
      <Header />
      <main className="brand-main">
        <nav className="brand-breadcrumbs" aria-label="Навигация">
          <Link to="/">Главная</Link>
          <span>/</span>
          <span>{brand.name}</span>
        </nav>
        <section className={`brand-banner${banner ? ' has-photo' : ''}`}>
          {banner ? <img src={banner} alt="" /> : null}
          <div className="brand-banner-copy">
            <p>Марка</p>
            <h1>{brand.name}</h1>
            <p className="brand-short">
              {brand.shortText || `Новая техника ${brand.name} с завода в Китае — подбор и поставка в Казахстан.`}
            </p>
            <Link className="btn btn-primary" to={`/catalog?brand=${encodeURIComponent(brand.id)}`}>
              Смотреть технику
            </Link>
          </div>
        </section>
        {article ? (
          <article className="brand-article" dangerouslySetInnerHTML={{ __html: article }} />
        ) : (
          <article className="brand-article">
            <p>
              Поставки {brand.name} идут напрямую с завода. В каталоге — актуальные модели с ценой и
              характеристиками.
            </p>
          </article>
        )}
      </main>
      <Footer />
    </div>
  )
}
