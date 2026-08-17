import { Link } from 'react-router-dom'
import { Footer, Header } from '../components/Layout'
import { MachineCard } from '../components/MachineCard'
import { useSite } from '../context/SiteContext'

export function HomePage() {
  const { content, brands, categories, machines, loading } = useSite()
  const home = content.home || {}
  const previewMachines = machines.slice(0, 6)

  return (
    <div className="page">
      <Header variant="home" />

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="brand">
              Buy<span>Tech</span>
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
              {brands.map((brand) => (
                <li key={brand.id}>{brand.name}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section categories" id="categories">
          <div className="section-head">
            <h2>{home.categoriesTitle || 'Категории техники'}</h2>
            <p>{home.categoriesLead}</p>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <Link
                key={category.id}
                className="category"
                to={`/catalog?category=${category.id}`}
              >
                <img src={category.image} alt={category.title} />
                <div className="category-meta">
                  <h3>{category.title}</h3>
                  <span>{category.hint}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="section catalog" id="catalog">
          <div className="section-head">
            <h2>{home.catalogTitle || 'В наличии и под заказ'}</h2>
            <p>{home.catalogLead}</p>
          </div>
          {loading ? (
            <p>Загрузка…</p>
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
