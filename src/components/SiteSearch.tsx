import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackSearch } from '../analytics'
import { brandPath, catalogCategoryPath, machinePath } from '../categorySlug'
import { useSite } from '../context/SiteContext'

type Hit = { to: string; title: string; meta: string }

export function SiteSearch() {
  const { machines, categories, brands } = useSite()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const q = query.trim().toLowerCase()

  const hits = useMemo(() => {
    if (q.length < 2) return []
    const categoryHits: Hit[] = []
    const brandHits: Hit[] = []
    const machineHits: Hit[] = []
    for (const category of categories) {
      if (!category.title.toLowerCase().includes(q)) continue
      categoryHits.push({
        to: catalogCategoryPath(category, categories),
        title: category.title,
        meta: 'Категория',
      })
      if (categoryHits.length >= 4) break
    }
    for (const brand of brands) {
      if (!brand.name.toLowerCase().includes(q)) continue
      brandHits.push({
        to: brandPath(brand, brands),
        title: brand.name,
        meta: 'Марка',
      })
      if (brandHits.length >= 4) break
    }
    for (const machine of machines) {
      const hay = `${machine.name} ${machine.brand} ${machine.category}`.toLowerCase()
      if (!hay.includes(q)) continue
      machineHits.push({
        to: machinePath(machine, categories, machines),
        title: machine.name,
        meta: `${machine.brand} · ${machine.category}`,
      })
      if (machineHits.length >= 6) break
    }
    return [...categoryHits, ...brandHits, ...machineHits]
  }, [q, categories, brands, machines])

  useEffect(() => {
    if (q.length < 2) return
    const timer = window.setTimeout(() => trackSearch(query), 700)
    return () => window.clearTimeout(timer)
  }, [q, query])

  useEffect(() => {
    if (!open) return
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function go(to: string) {
    setQuery('')
    setOpen(false)
    navigate(to)
  }

  return (
    <div className={`header-search${open && q.length >= 2 ? ' is-open' : ''}`} ref={rootRef}>
      <input
        value={query}
        placeholder="Поиск"
        aria-label="Поиск техники, марки или категории"
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && hits[0]) {
            event.preventDefault()
            go(hits[0].to)
          }
        }}
      />
      {open && q.length >= 2 ? (
        <div className="header-search-results" role="listbox">
          {hits.length ? (
            hits.map((hit) => (
              <button key={`${hit.meta}-${hit.to}`} type="button" onClick={() => go(hit.to)}>
                <strong>{hit.title}</strong>
                <span>{hit.meta}</span>
              </button>
            ))
          ) : (
            <p>Ничего не найдено</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
