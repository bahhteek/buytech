import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HomeIntro } from '../components/HomeIntro'
import { Footer, Header, Logo } from '../components/Layout'
import { MachineCard } from '../components/MachineCard'
import { BrandSkeletons, CategoryGridSkeleton, MachineGridSkeleton } from '../components/Skeleton'
import { useSite } from '../context/SiteContext'
import { brandPath, catalogCategoryPath } from '../categorySlug'
import { rootCategories } from '../categoryTree'

export function HomePage() {
  const { content, brands, categories, machines, loading } = useSite()
  const location = useLocation()
  const home = content.home || {}
  const previewMachines = machines.slice(0, 6)

  useEffect(() => {
    if (location.hash !== '#process') return
    const frame = requestAnimationFrame(() => {
      const node = document.getElementById('process')
      if (!node) return
      const top = node.getBoundingClientRect().top + window.scrollY - 108
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.hash, loading])

  return (
    <div className="page">
      <HomeIntro ready={!loading} />
      <Header variant="home" />

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="brand">
              <Logo />
            </p>
            <h1>{home.heroTitle || 'Новая спецтехника из Китая — в Казахстан'}</h1>
            <p className="hero-lead">
              {home.heroLead ||
                'Прямые поставки HOWO, Hengte, SOVOL, Shantui и SHANMON.'}
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/catalog">
                {home.heroCtaPrimary || 'Смотреть технику'}
              </Link>
              <Link className="btn btn-ghost" to="/contacts">
                {home.heroCtaSecondary || 'Запросить цену'}
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src={home.heroImage || '/images/excavator-2.jpg'}
              alt="Жёлтый экскаватор — новая спецтехника"
            />
          </div>
        </section>

        <section className="brands" aria-label="Марки">
          <div className="brands-inner">
            <p>{home.brandsLabel || 'Работаем с заводами Китая'}</p>
            <ul>
              {loading ? <BrandSkeletons /> : brands.map((brand) => (
                <li key={brand.id}>
                  <Link to={brandPath(brand, brands)}>{brand.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section categories" id="categories">
          <div className="section-head">
            <h2>{home.categoriesTitle || 'Категории техники'}</h2>
            <p>{home.categoriesLead}</p>
          </div>
          <div className="category-grid" aria-busy={loading || undefined}>
            {loading ? (
              <CategoryGridSkeleton />
            ) : (
              rootCategories(categories).map((category) => (
                <Link
                  key={category.id}
                  className="category"
                  to={catalogCategoryPath(category, categories)}
                >
                <img src={category.image} alt="" />
                <div className="category-meta">
                  <h3>{category.title}</h3>
                </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="section catalog" id="catalog">
          <div className="section-head">
            <h2>{home.catalogTitle || 'В наличии и под заказ'}</h2>
            <p>{home.catalogLead}</p>
          </div>
          {loading ? (
            <>
              <p className="skeleton-status">Загрузка техники</p>
              <MachineGridSkeleton count={6} />
            </>
          ) : (
            <div className="machine-grid">
              {previewMachines.map((machine) => (
                <MachineCard key={machine.id} machine={machine} />
              ))}
            </div>
          )}
          <div className="section-more">
            <Link className="btn btn-primary" to="/catalog">
              Весь каталог
            </Link>
          </div>
        </section>

        <section className="section process" id="process">
          <div className="section-head">
            <h2>{home.processTitle || 'Как идёт поставка'}</h2>
            <p>{home.processLead}</p>
          </div>
          <ol className="steps">
            <li>
              <span>01</span>
              <h3>Запрос</h3>
              <p>Уточняем модель, комплектацию, сроки и бюджет.</p>
            </li>
            <li>
              <span>02</span>
              <h3>Подбор на заводе</h3>
              <p>Согласуем марку и комплектацию под объект.</p>
            </li>
            <li>
              <span>03</span>
              <h3>Документы</h3>
              <p>Контракт, оплата и полный пакет на ввоз новой техники.</p>
            </li>
            <li>
              <span>04</span>
              <h3>Доставка в РК</h3>
              <p>Привозим в Казахстан и передаём на ваш объект.</p>
            </li>
          </ol>
        </section>

        <section className="section contact" id="contact">
          <div className="contact-panel">
            <div className="contact-copy">
              <h2>{home.contactTitle || 'Нужна техника из Китая?'}</h2>
              <p>{home.contactLead}</p>
            </div>
            <Link className="btn btn-primary" to="/contacts">
              Оставить заявку
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
