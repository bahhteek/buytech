import { Link, useParams } from 'react-router-dom'
import { Footer, Header } from '../components/Layout'
import { MachineCard } from '../components/MachineCard'
import { ImageSlider, VideoEmbed } from '../components/Media'
import { useSite } from '../context/SiteContext'
import './ProductPage.css'

export function ProductPage() {
  const { id } = useParams()
  const { getMachineById, getRelatedMachines, loading } = useSite()
  const machine = id ? getMachineById(id) : undefined

  if (loading) {
    return (
      <div className="page product-page">
        <Header />
        <main className="product-main">
          <p>Загрузка…</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!machine) {
    return (
      <div className="page product-page">
        <Header />
        <main className="product-main">
          <div className="product-empty">
            <h1>Товар не найден</h1>
            <p>Такой позиции нет в каталоге или ссылка устарела.</p>
            <Link className="btn btn-primary" to="/catalog">
              В каталог
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const related = getRelatedMachines(machine)
  const requestLink = `/contacts?need=${encodeURIComponent(machine.name)}`

  return (
    <div className="page product-page">
      <Header />

      <main className="product-main">
        <nav className="product-breadcrumbs" aria-label="Навигация">
          <Link to="/">Главная</Link>
          <span>/</span>
          <Link to="/catalog">Каталог</Link>
          <span>/</span>
          <Link to={`/catalog?category=${machine.categoryId}`}>{machine.category}</Link>
          <span>/</span>
          <span>{machine.name}</span>
        </nav>

        <section className="product-hero">
          <div className="product-media">
            <ImageSlider images={machine.images || []} alt={machine.name} />
            <span className="machine-badge product-badge">{machine.condition}</span>
          </div>

          <div className="product-summary">
            <div className="product-tags">
              <span className="machine-tag">{machine.brand}</span>
              <span className="machine-type">{machine.category}</span>
            </div>
            <h1>{machine.name}</h1>
            <p className="product-price">{machine.price}</p>
            <p className="product-lead">{machine.description}</p>

            <dl className="product-quick">
              <div>
                <dt>Год</dt>
                <dd>{machine.year}</dd>
              </div>
              <div>
                <dt>Статус</dt>
                <dd>{machine.condition}</dd>
              </div>
              <div>
                <dt>Марка</dt>
                <dd>{machine.brand}</dd>
              </div>
            </dl>

            <div className="product-actions">
              <Link className="btn btn-primary" to={requestLink}>
                Запросить цену
              </Link>
              <a className="btn btn-dark" href="tel:+77001234567">
                Позвонить
              </a>
            </div>
          </div>
        </section>

        {machine.videoUrl ? (
          <section className="product-specs">
            <h2>Видео</h2>
            <VideoEmbed url={machine.videoUrl} />
          </section>
        ) : null}

        <section className="product-specs">
          <h2>Характеристики</h2>
          <dl>
            {machine.specs.map((spec) => (
              <div key={spec.id || spec.label}>
                <dt>{spec.label}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="product-note">
          <h2>Поставка и документы</h2>
          <p>
            Техника новая, с завода Китая. Оформляем контракт, полный пакет документов
            на ввоз и доставку в Казахстан до вашего объекта.
          </p>
          <Link className="btn btn-primary" to={requestLink}>
            Оставить заявку
          </Link>
        </section>

        {related.length > 0 && (
          <section className="product-related">
            <div className="section-head">
              <h2>Похожая техника</h2>
              <p>
                {(machine.relatedIds || []).length
                  ? 'Подборка похожих позиций.'
                  : `Другие позиции из категории «${machine.category}».`}
              </p>
            </div>
            <div className="machine-grid">
              {related.map((item) => (
                <MachineCard key={item.id} machine={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
