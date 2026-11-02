import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { Fragment, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { Footer, Header } from '../components/Layout'
import { ProductSkeleton } from '../components/Skeleton'
import { MachineCard } from '../components/MachineCard'
import { ImageSlider, VideoEmbed } from '../components/Media'
import { QuoteModal } from '../components/QuoteModal'
import { useSite } from '../context/SiteContext'
import {
  catalogCategoryPath,
  findCategoryBySlugOrId,
  findMachineBySlugOrId,
  machinePath,
} from '../categorySlug'
import { machineVideos, type Machine } from '../types'
import { categoryPath } from '../categoryTree'
import './ProductPage.css'

function RelatedSlider({ machines }: { machines: Machine[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ x: 0, left: 0, moved: false, active: false })
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [dragging, setDragging] = useState(false)

  function sync() {
    const track = trackRef.current
    if (!track) return
    setCanPrev(track.scrollLeft > 8)
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 8)
  }

  useLayoutEffect(() => {
    sync()
    const track = trackRef.current
    if (!track) return
    track.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      track.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [machines])

  function move(direction: number) {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector('article')
    const width = card ? card.getBoundingClientRect().width + 16 : track.clientWidth * 0.8
    track.scrollBy({ left: direction * width, behavior: 'smooth' })
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    if (!track || track.scrollWidth <= track.clientWidth + 8) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    drag.current = { x: event.clientX, left: track.scrollLeft, moved: false, active: true }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    if (!track || !drag.current.active) return
    const dx = event.clientX - drag.current.x
    if (!drag.current.moved && Math.abs(dx) < 6) return
    if (!drag.current.moved) {
      drag.current.moved = true
      setDragging(true)
      track.setPointerCapture(event.pointerId)
    }
    track.scrollLeft = drag.current.left - dx
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    drag.current.active = false
    setDragging(false)
    if (track?.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId)
    window.setTimeout(() => {
      drag.current.moved = false
    }, 0)
  }

  function onClickCapture(event: ReactMouseEvent) {
    if (!drag.current.moved) return
    event.preventDefault()
    event.stopPropagation()
  }

  const slidable = canPrev || canNext

  return (
    <div className={`related-slider${slidable ? '' : ' is-static'}`}>
      {slidable ? (
        <button type="button" aria-label="Предыдущая техника" disabled={!canPrev} onClick={() => move(-1)}>
          ‹
        </button>
      ) : null}
      <div
        className={`related-slider-track${dragging ? ' is-dragging' : ''}`}
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        onDragStart={(event) => event.preventDefault()}
      >
        {machines.map((item) => (
          <MachineCard key={item.id} machine={item} />
        ))}
      </div>
      {slidable ? (
        <button type="button" aria-label="Следующая техника" disabled={!canNext} onClick={() => move(1)}>
          ›
        </button>
      ) : null}
    </div>
  )
}

export function ProductPage() {
  const { id, productSlug } = useParams()
  const location = useLocation()
  const { getMachineById, getRelatedMachines, categories, allMachines, loading } = useSite()
  const [quoteOpen, setQuoteOpen] = useState(false)
  const machine = productSlug
    ? findMachineBySlugOrId(allMachines, productSlug)
    : id
      ? getMachineById(id)
      : undefined
  const prettyPath = machine ? machinePath(machine, categories, allMachines) : ''

  if (loading) {
    return (
      <div className="page product-page">
        <Header />
        <main className="product-main">
          <ProductSkeleton />
        </main>
        <Footer />
      </div>
    )
  }

  if (machine && prettyPath && location.pathname !== prettyPath) {
    return <Navigate to={prettyPath} replace />
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

  const related = getRelatedMachines(machine, (machine.relatedIds || []).length ? 12 : 3)
  const requestLink = `/contacts?need=${encodeURIComponent(machine.name)}`
  const videos = machineVideos(machine)
  const crumbs = categoryPath(categories, machine.categoryId)
  const fallbackCategory = findCategoryBySlugOrId(categories, machine.categoryId)

  return (
    <div className="page product-page">
      <Header />

      <main className="product-main">
        <nav className="product-breadcrumbs" aria-label="Навигация">
          <Link to="/">Главная</Link>
          <span>/</span>
          <Link to="/catalog">Каталог</Link>
          {crumbs.map((item) => (
            <Fragment key={item.id}>
              <span>/</span>
              <Link to={catalogCategoryPath(item, categories)}>{item.title}</Link>
            </Fragment>
          ))}
          {crumbs.length === 0 && (
            <>
              <span>/</span>
              {fallbackCategory ? (
                <Link to={catalogCategoryPath(fallbackCategory, categories)}>
                  {fallbackCategory.title}
                </Link>
              ) : (
                <span>{machine.category}</span>
              )}
            </>
          )}
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
              <button className="btn btn-primary" type="button" onClick={() => setQuoteOpen(true)}>
                Запросить КП
              </button>
              <a className="btn btn-dark" href="tel:+77001234567">
                Позвонить
              </a>
            </div>
          </div>
        </section>

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

        {videos.length > 0 ? (
          <section className="product-specs">
            <h2>Видео</h2>
            <div className="product-videos">
              {videos.map((url) => (
                <VideoEmbed key={url} url={url} />
              ))}
            </div>
          </section>
        ) : null}

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
            <RelatedSlider machines={related} />
          </section>
        )}
      </main>

      {quoteOpen ? <QuoteModal machine={machine} onClose={() => setQuoteOpen(false)} /> : null}
      <Footer />
    </div>
  )
}
