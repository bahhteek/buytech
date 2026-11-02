import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { resolveImageUrl, videoEmbed } from '../mediaUrl'

type ImageSliderProps = {
  images: string[]
  alt: string
}

export function ImageSlider({ images, alt }: ImageSliderProps) {
  const slides = (images.length ? images : ['/images/excavator.jpg']).map(resolveImageUrl)
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)
  const safeIndex = Math.min(index, slides.length - 1)

  function go(to: number) {
    const next = (to + slides.length) % slides.length
    setOffset(0)
    setIndex(next)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.id !== event.pointerId) return
    const dx = event.clientX - drag.current.x
    const dy = event.clientY - drag.current.y
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
    if (slides.length > 1 && Math.abs(dx) > Math.abs(dy)) {
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragging(true)
      setOffset(dx)
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.id !== event.pointerId) return
    const dx = event.clientX - drag.current.x
    const dy = event.clientY - drag.current.y
    drag.current = null
    setDragging(false)
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      setOffset(0)
      setOpen(true)
      return
    }
    if (slides.length > 1 && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      go(safeIndex + (dx < 0 ? 1 : -1))
      return
    }
    setOffset(0)
  }

  return (
    <div className="product-gallery">
      <div
        className={`product-gallery-stage${dragging ? ' is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Открыть фото: ${alt}`}
      >
        <div
          className="product-gallery-track"
          style={{
            transform: `translateX(calc(${-safeIndex * 100}% + ${offset}px))`,
          }}
        >
          {slides.map((src, i) => (
            <img key={`${src}-${i}`} src={src} alt="" draggable={false} />
          ))}
        </div>
        <span className="product-gallery-zoom" aria-hidden="true">
          <svg viewBox="0 0 16 16">
            <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10.2 10.2 L13.2 13.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M7 5.2v3.6M5.2 7h3.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      </div>
      {slides.length > 1 && (
        <>
          <button type="button" className="slider-btn slider-prev" onClick={() => go(safeIndex - 1)} aria-label="Предыдущее фото">
            ‹
          </button>
          <button type="button" className="slider-btn slider-next" onClick={() => go(safeIndex + 1)} aria-label="Следующее фото">
            ›
          </button>
          <div className="slider-dots">
            {slides.map((url, i) => (
              <button
                key={url + i}
                type="button"
                className={i === safeIndex ? 'is-active' : undefined}
                onClick={() => go(i)}
                aria-label={`Фото ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
      {open
        ? createPortal(
            <PhotoLightbox
              slides={slides}
              index={safeIndex}
              alt={alt}
              onIndex={(next) => setIndex(next)}
              onClose={() => setOpen(false)}
            />,
            document.body,
          )
        : null}
    </div>
  )
}

function PhotoLightbox({
  slides,
  index,
  alt,
  onIndex,
  onClose,
}: {
  slides: string[]
  index: number
  alt: string
  onIndex: (next: number) => void
  onClose: () => void
}) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dir, setDir] = useState<0 | 1 | -1>(0)
  const [dragging, setDragging] = useState(false)
  const scaleRef = useRef(1)
  const offsetRef = useRef({ x: 0, y: 0 })
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null)
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; scale: number } | null>(null)
  const base = useRef({ w: 0, h: 0 })
  const closeRef = useRef<HTMLButtonElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<(nextScale: number, origin?: { x: number; y: number }) => void>(() => {})

  scaleRef.current = scale
  offsetRef.current = offset

  function resetView() {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  function limit(x: number, y: number, nextScale: number) {
    if (nextScale <= 1) return { x: 0, y: 0 }
    const maxX = (base.current.w * (nextScale - 1)) / 2
    const maxY = (base.current.h * (nextScale - 1)) / 2
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    }
  }

  function applyZoom(nextScale: number, origin?: { x: number; y: number }) {
    const prev = scaleRef.current
    const next = Math.min(4, Math.max(1, nextScale))
    let point = offsetRef.current
    if (origin && prev > 0) {
      const frame = document.querySelector('.lightbox-frame')?.getBoundingClientRect()
      if (frame) {
        const cx = origin.x - frame.left - frame.width / 2
        const cy = origin.y - frame.top - frame.height / 2
        const k = next / prev
        point = { x: cx - (cx - point.x) * k, y: cy - (cy - point.y) * k }
      }
    }
    const placed = limit(point.x, point.y, next)
    setScale(next)
    setOffset(placed)
  }

  zoomRef.current = applyZoom

  function jump(next: number, direction?: 1 | -1) {
    if (slides.length < 2 || next === index) return
    resetView()
    setDir(direction ?? (next > index ? 1 : -1))
    onIndex(next)
  }

  function change(direction: 1 | -1) {
    jump((index + direction + slides.length) % slides.length, direction)
  }

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const node = stageRef.current
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12
      zoomRef.current(scaleRef.current * factor, { x: event.clientX, y: event.clientY })
    }
    node?.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      document.body.style.overflow = previous
      node?.removeEventListener('wheel', onWheel)
    }
  }, [])

  useEffect(() => {
    if (!dir) return
    const timer = window.setTimeout(() => setDir(0), 320)
    return () => window.clearTimeout(timer)
  }, [dir, index])

  useEffect(() => {
    thumbRef.current?.querySelector<HTMLButtonElement>('.is-active')?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
    })
  }, [index])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') change(1)
      if (event.key === 'ArrowLeft') change(-1)
      if (event.key === '+' || event.key === '=') applyZoom(scaleRef.current * 1.25)
      if (event.key === '-' || event.key === '_') applyZoom(scaleRef.current / 1.25)
      if (event.key === '0') resetView()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)
    press.current = { x: event.clientX, y: event.clientY, moved: false }
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: scaleRef.current,
      }
      drag.current = null
      setDragging(false)
      return
    }
    if (scaleRef.current > 1 && event.button === 0) {
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        ox: offsetRef.current.x,
        oy: offsetRef.current.y,
      }
      setDragging(true)
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (press.current) {
      const dx = event.clientX - press.current.x
      const dy = event.clientY - press.current.y
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) press.current.moved = true
    }
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      applyZoom(pinch.current.scale * (dist / pinch.current.dist))
      return
    }
    if (!drag.current || drag.current.id !== event.pointerId) return
    const next = limit(
      drag.current.ox + event.clientX - drag.current.x,
      drag.current.oy + event.clientY - drag.current.y,
      scaleRef.current,
    )
    setOffset(next)
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = press.current
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (drag.current?.id === event.pointerId) {
      drag.current = null
      setDragging(false)
    }
    press.current = null
    if (!start || start.moved) {
      if (start && scaleRef.current <= 1 && slides.length > 1) {
        const dx = event.clientX - start.x
        const dy = event.clientY - start.y
        if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) change(dx < 0 ? 1 : -1)
      }
      return
    }
    const nextScale = scaleRef.current <= 1 ? 2 : Math.min(4, scaleRef.current * 1.5)
    if (scaleRef.current >= 3.9) resetView()
    else applyZoom(nextScale, { x: event.clientX, y: event.clientY })
  }

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Фото: ${alt}`}>
      <button type="button" className="lightbox-backdrop" aria-label="Закрыть просмотр" onClick={onClose} />
      <div
        ref={stageRef}
        className={`lightbox-stage${scale > 1 ? ' is-zoomed' : ''}${dragging ? ' is-dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          key={index}
          src={slides[index]}
          alt={alt}
          className={dir > 0 ? 'lightbox-frame is-next' : dir < 0 ? 'lightbox-frame is-prev' : 'lightbox-frame'}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          draggable={false}
          onLoad={(event) => {
            base.current = {
              w: event.currentTarget.clientWidth,
              h: event.currentTarget.clientHeight,
            }
          }}
        />
      </div>
      <button ref={closeRef} type="button" className="lightbox-close" onClick={onClose}>
        Закрыть
      </button>
      {slides.length > 1 ? (
        <>
          <button type="button" className="lightbox-nav is-prev" onClick={() => change(-1)} aria-label="Предыдущее фото">
            ‹
          </button>
          <button type="button" className="lightbox-nav is-next" onClick={() => change(1)} aria-label="Следующее фото">
            ›
          </button>
        </>
      ) : null}
      {slides.length > 1 ? (
        <div className="lightbox-thumbs" ref={thumbRef}>
          {slides.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              className={i === index ? 'is-active' : undefined}
              onClick={() => jump(i)}
              aria-label={`Фото ${i + 1}`}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="lightbox-bar">
        <span className="lightbox-count">
          {index + 1} / {slides.length}
        </span>
        <div className="lightbox-zoom">
          <button type="button" onClick={() => applyZoom(scale / 1.25)} aria-label="Уменьшить">
            −
          </button>
          <span>{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => applyZoom(scale * 1.25)} aria-label="Увеличить">
            +
          </button>
          <button type="button" onClick={resetView} aria-label="Вписать в экран">
            Вписать
          </button>
        </div>
      </div>
    </div>
  )
}

export function VideoEmbed({ url }: { url: string }) {
  if (!url) return null
  const media = videoEmbed(url)
  if (media.kind === 'file') {
    return (
      <div className="product-video">
        <video src={media.src} controls playsInline />
      </div>
    )
  }
  return (
    <div className="product-video">
      <iframe
        src={media.src}
        title="Видео техники"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
