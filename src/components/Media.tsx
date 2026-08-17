import { useState } from 'react'

type ImageSliderProps = {
  images: string[]
  alt: string
}

export function ImageSlider({ images, alt }: ImageSliderProps) {
  const slides = images.length ? images : ['/images/excavator.jpg']
  const [index, setIndex] = useState(0)
  const current = slides[Math.min(index, slides.length - 1)]

  function prev() {
    setIndex((value) => (value - 1 + slides.length) % slides.length)
  }

  function next() {
    setIndex((value) => (value + 1) % slides.length)
  }

  return (
    <div className="product-gallery">
      <img src={current} alt={alt} />
      {slides.length > 1 && (
        <>
          <button type="button" className="slider-btn slider-prev" onClick={prev} aria-label="Предыдущее фото">
            ‹
          </button>
          <button type="button" className="slider-btn slider-next" onClick={next} aria-label="Следующее фото">
            ›
          </button>
          <div className="slider-dots">
            {slides.map((url, i) => (
              <button
                key={url + i}
                type="button"
                className={i === index ? 'is-active' : undefined}
                onClick={() => setIndex(i)}
                aria-label={`Фото ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function VideoEmbed({ url }: { url: string }) {
  if (!url) return null

  const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/)
  if (yt) {
    return (
      <div className="product-video">
        <iframe
          src={`https://www.youtube.com/embed/${yt[1]}`}
          title="Видео техники"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div className="product-video">
      <video src={url} controls playsInline />
    </div>
  )
}
