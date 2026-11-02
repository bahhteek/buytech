import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { formatPrice, machinePriceAmount } from '../types'
import {
  brandsInPool,
  machineMatchesSpecs,
  machinesInCategory,
  pruneSpecFilters,
  specFacetsFromMachines,
  toggleListValue,
} from '../catalogFilters'
import { Footer, Header } from '../components/Layout'
import { NotFoundPage } from './NotFoundPage'
import { MachineCard } from '../components/MachineCard'
import { CatalogSkeleton, CatalogTopSkeleton, MachineGridSkeleton } from '../components/Skeleton'
import { useSite } from '../context/SiteContext'
import type { Category, Machine } from '../types'
import { catalogCategoryPath, findCategoryBySlugOrId } from '../categorySlug'
import { childCategories, isCategoryDescendant } from '../categoryTree'
import './CatalogPage.css'

const STEP = 100_000
const PAGE_SIZE = 18

type SortKey = 'price-asc' | 'price-desc' | 'name' | 'brand' | 'year-desc'

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'price-asc', label: 'Цена: по возрастанию' },
  { value: 'price-desc', label: 'Цена: по убыванию' },
  { value: 'name', label: 'По названию' },
  { value: 'brand', label: 'По марке' },
  { value: 'year-desc', label: 'Сначала новее' },
]

function ToolbarSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string; disabled?: boolean }[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`catalog-select-wrap${open ? ' is-open' : ''}`} ref={rootRef}>
        <button
          type="button"
          className="catalog-select"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${label}: ${current?.label ?? ''}`}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span>{current?.label}</span>
          <svg className="catalog-select-chevron" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M2.5 4.25 L6 7.75 L9.5 4.25"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {open ? (
          <ul className="catalog-select-menu" role="listbox" aria-label={label}>
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  disabled={option.disabled}
                  className={option.value === value ? 'is-selected' : undefined}
                  onClick={() => {
                    if (option.disabled) return
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
    </div>
  )
}

function machineBrand(machine: Machine) {
  return (machine.brand || machine.brandId || '').trim()
}

function compareId(a: Machine, b: Machine) {
  return a.id.localeCompare(b.id)
}

function compareByPrice(a: Machine, b: Machine, direction: 'asc' | 'desc') {
  const left = machinePriceAmount(a)
  const right = machinePriceAmount(b)
  if (left == null && right == null) {
    return a.name.localeCompare(b.name, 'ru', { numeric: true }) || compareId(a, b)
  }
  if (left == null) return 1
  if (right == null) return -1
  const diff = direction === 'desc' ? right - left : left - right
  return diff || a.name.localeCompare(b.name, 'ru', { numeric: true }) || compareId(a, b)
}

function sortMachines(list: Machine[], sort: SortKey) {
  const next = [...list]
  next.sort((a, b) => {
    switch (sort) {
      case 'price-asc':
        return compareByPrice(a, b, 'asc')
      case 'price-desc':
        return compareByPrice(a, b, 'desc')
      case 'name':
        return a.name.localeCompare(b.name, 'ru', { numeric: true }) || compareId(a, b)
      case 'brand':
        return (
          machineBrand(a).localeCompare(machineBrand(b), 'ru', { sensitivity: 'base' }) ||
          a.name.localeCompare(b.name, 'ru', { numeric: true }) ||
          compareId(a, b)
        )
      case 'year-desc':
        return b.year - a.year || a.name.localeCompare(b.name, 'ru', { numeric: true }) || compareId(a, b)
      default:
        return 0
    }
  })
  return next
}

function FilterBlock({
  title,
  open,
  onToggle,
  hint,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  hint?: string
  children: ReactNode
}) {
  return (
    <div className={`filter-block${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="filter-toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        <h2>{title}</h2>
        {hint ? <em className="filter-toggle-hint">{hint}</em> : null}
        <svg className="filter-arrow" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2.5 4.25 L6 7.75 L9.5 4.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? <div className="filter-block-body">{children}</div> : null}
    </div>
  )
}

function SpecFacetGroup({
  facet,
  selected,
  onToggle,
}: {
  facet: { label: string; values: string[] }
  selected: string[]
  onToggle: (label: string, value: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`filter-spec${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="filter-spec-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <h3>{facet.label}</h3>
        {selected.length > 0 ? <em className="filter-toggle-hint">{selected.length}</em> : null}
        <svg className="filter-arrow" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M2.5 4.25 L6 7.75 L9.5 4.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <ul className="filter-checks">
          {facet.values.map((value) => (
            <li key={value}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(value)}
                  onChange={() => onToggle(facet.label, value)}
                />
                <span>{value}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function readSort(value: string | null): SortKey {
  return sortOptions.some((option) => option.value === value) ? (value as SortKey) : 'price-asc'
}

function pageItems(current: number, total: number) {
  const pages = [1, current - 1, current, current + 1, total].filter(
    (page, index, list) => page >= 1 && page <= total && list.indexOf(page) === index,
  )
  const items: Array<number | 'gap'> = []
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) items.push('gap')
    items.push(page)
  })
  return items
}

function selectionInside(categories: Category[], categoryId: string, selectedCategory: string) {
  return (
    selectedCategory !== 'all' &&
    selectedCategory !== categoryId &&
    isCategoryDescendant(categories, categoryId, selectedCategory)
  )
}

function CategoryFilterNode({
  category,
  categories,
  selectedCategory,
  counts,
  onSelect,
}: {
  category: Category
  categories: Category[]
  selectedCategory: string
  counts: Record<string, number>
  onSelect: (id: string) => void
}) {
  const children = childCategories(categories, category.id)
  const hasChildren = children.length > 0
  const [open, setOpen] = useState(() => selectionInside(categories, category.id, selectedCategory))

  useEffect(() => {
    if (selectionInside(categories, category.id, selectedCategory)) {
      setOpen(true)
    }
  }, [categories, category.id, selectedCategory])

  return (
    <li>
      {hasChildren ? (
        <div className={`filter-category-row${open ? ' is-open' : ''}${selectedCategory === category.id ? ' is-active' : ''}`}>
          <button
            type="button"
            className="filter-category-select"
            onClick={() => onSelect(category.id)}
          >
            <span>{category.title}</span>
            <em>{counts[category.id] || 0}</em>
          </button>
          <button
            type="button"
            className="filter-category-expand"
            aria-expanded={open}
            aria-label={open ? `Скрыть подкатегории: ${category.title}` : `Показать подкатегории: ${category.title}`}
            onClick={() => setOpen((value) => !value)}
          >
            <svg className="filter-category-arrow" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M2.5 4.25 L6 7.75 L9.5 4.25"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={selectedCategory === category.id ? 'is-active' : undefined}
          onClick={() => onSelect(category.id)}
        >
          <span>{category.title}</span>
          <em>{counts[category.id] || 0}</em>
        </button>
      )}
      {hasChildren && open ? (
        <ul className="filter-categories-nested">
          {children.map((child) => (
            <CategoryFilterNode
              key={child.id}
              category={child}
              categories={categories}
              selectedCategory={selectedCategory}
              counts={counts}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function CatalogPage() {
  const { categories, machines, brands, content, priceBounds, loading } = useSite()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { categorySlug: routeSlug, id: legacyId } = useParams()
  const routeId = routeSlug || legacyId
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryFromQuery = searchParams.get('category')
  const brandQuery = searchParams.get('brand') || ''
  const query = (searchParams.get('q') || '').trim()
  const [queryDraft, setQueryDraft] = useState(query)
  const sort = readSort(searchParams.get('sort'))
  const view = searchParams.get('view') === 'list' ? 'list' : 'grid'
  const requestedPage = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const requestedBrands = useMemo(
    () => brandQuery.split(',').map((item) => item.trim()).filter(Boolean),
    [brandQuery],
  )
  const [priceOverride, setPriceOverride] = useState<{ min: number; max: number } | null>(null)
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string[]>>({})
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({
    category: true,
    brand: true,
    price: true,
    specs: false,
  })
  const [filterOpen, setFilterOpen] = useState(false)
  const [resultsPending, setResultsPending] = useState(false)

  const bounds =
    priceBounds.min === priceBounds.max
      ? { min: priceBounds.min || 0, max: (priceBounds.min || 0) + STEP }
      : priceBounds
  const priceMin = priceOverride?.min ?? bounds.min
  const priceMax = priceOverride?.max ?? bounds.max

  const categoryFromRoute = routeId ? findCategoryBySlugOrId(categories, routeId) : undefined
  const selectedCategory = categoryFromRoute?.id || 'all'

  function patchParams(patch: Record<string, string | null>, replace = false) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    }, { replace })
  }

  useEffect(() => {
    if (!categoryFromQuery || categoryFromQuery === 'all') return
    const category = findCategoryBySlugOrId(categories, categoryFromQuery)
    if (!category) return
    const next = new URLSearchParams(searchParams)
    next.delete('category')
    navigate(
      { pathname: catalogCategoryPath(category, categories), search: next.toString() },
      { replace: true },
    )
  }, [categoryFromQuery, categories, navigate, searchParams])

  useEffect(() => {
    if (!routeId || !categoryFromRoute) return
    const pretty = catalogCategoryPath(categoryFromRoute, categories)
    if (pretty !== `/${routeId}`) {
      navigate({ pathname: pretty, search: searchParams.toString() }, { replace: true })
    }
  }, [routeId, categoryFromRoute, categories, navigate, searchParams])

  const categoryPool = useMemo(
    () => machinesInCategory(machines, selectedCategory, categories),
    [machines, selectedCategory, categories],
  )

  const brandOptions = useMemo(() => {
    const pool = brandsInPool(categoryPool)
    const extras: { id: string; name: string; count: number }[] = []
    for (const raw of requestedBrands) {
      const query = raw.toLowerCase()
      const known = brands.find(
        (brand) => brand.id.toLowerCase() === query || brand.name.toLowerCase() === query,
      )
      if (!known || pool.some((brand) => brand.id === known.id) || extras.some((brand) => brand.id === known.id)) {
        continue
      }
      extras.push({ id: known.id, name: known.name, count: 0 })
    }
    if (!extras.length) return pool
    return [...pool, ...extras].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [categoryPool, requestedBrands, brands])

  const selectedBrands = useMemo(() => {
    const ids = requestedBrands.flatMap((raw) => {
      const query = raw.toLowerCase()
      const known = brandOptions.find(
        (brand) => brand.id.toLowerCase() === query || brand.name.toLowerCase() === query,
      )
      return known ? [known.id] : []
    })
    return [...new Set(ids)]
  }, [requestedBrands, brandOptions])

  const specFacets = useMemo(() => specFacetsFromMachines(categoryPool), [categoryPool])

  useEffect(() => {
    setSelectedSpecs((prev) => pruneSpecFilters(prev, specFacets))
  }, [selectedCategory, specFacets])

  useEffect(() => {
    if (loading || !requestedBrands.length) return
    const canonical = [...new Set(selectedBrands)]
    if (canonical.join(',') === requestedBrands.join(',')) return
    patchParams({ brand: canonical.join(',') || null }, true)
  }, [loading, requestedBrands, selectedBrands])

  const filtered = useMemo(() => {
    const needle = query.toLowerCase()
    const list = categoryPool.filter((machine) => {
      const byBrand =
        !selectedBrands.length ||
        selectedBrands.includes(machine.brandId) ||
        selectedBrands.includes(machine.brand)
      const amount = machinePriceAmount(machine)
      const byPrice = amount == null || (amount >= priceMin && amount <= priceMax)
      const bySpecs = machineMatchesSpecs(machine, selectedSpecs)
      const hay = `${machine.name} ${machine.brand} ${machine.category}`.toLowerCase()
      const byQuery = !needle || hay.includes(needle)
      return byBrand && byPrice && bySpecs && byQuery
    })
    return sortMachines(list, sort)
  }, [categoryPool, selectedBrands, priceMin, priceMax, selectedSpecs, sort, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, pageCount)
  const pageMachines = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const seenPage = useRef<number | null>(null)

  useEffect(() => {
    if (loading || machines.length === 0 || requestedPage === currentPage) return
    patchParams({ page: currentPage <= 1 ? null : String(currentPage) }, true)
  }, [loading, machines.length, requestedPage, currentPage])

  useEffect(() => {
    if (seenPage.current === null || seenPage.current === requestedPage) {
      seenPage.current = requestedPage
      return
    }
    seenPage.current = requestedPage
    document.querySelector('.catalog-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [requestedPage])

  useLayoutEffect(() => {
    if (loading) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }
    document.querySelector('.catalog-toolbar')?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }, [pathname, loading])

  const resultsKey = `${selectedCategory}|${selectedBrands.join(',')}|${sort}|${requestedPage}|${JSON.stringify(selectedSpecs)}`
  const coldStart = useRef(loading)

  useEffect(() => {
    if (loading) return
    if (coldStart.current) {
      coldStart.current = false
      return
    }
    setResultsPending(true)
    const timer = window.setTimeout(() => setResultsPending(false), 700)
    return () => window.clearTimeout(timer)
  }, [loading, resultsKey])

  useEffect(() => {
    if (!filterOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [filterOpen])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: machines.length }
    for (const category of categories) {
      counts[category.id] = machinesInCategory(machines, category.id, categories).length
    }
    return counts
  }, [categories, machines])

  function queryWithoutFilters(keepSort = true) {
    const params = new URLSearchParams()
    const sortValue = searchParams.get('sort')
    if (keepSort && sortValue && sortValue !== 'price-asc') params.set('sort', sortValue)
    if (searchParams.get('view') === 'list') params.set('view', 'list')
    const search = params.toString()
    return search ? `?${search}` : ''
  }

  function selectCategory(id: string) {
    setSelectedSpecs({})
    const search = queryWithoutFilters()
    if (id === 'all') {
      navigate({ pathname: '/catalog', search })
      return
    }
    const category = findCategoryBySlugOrId(categories, id)
    navigate({
      pathname: category ? catalogCategoryPath(category, categories) : '/catalog',
      search,
    })
  }

  function toggleBrand(id: string) {
    const next = toggleListValue(selectedBrands, id)
    patchParams({ brand: next.join(',') || null, page: null })
  }

  function changeSort(next: SortKey) {
    patchParams({ sort: next === 'price-asc' ? null : next, page: null })
  }

  function setView(next: 'grid' | 'list') {
    patchParams({ view: next === 'grid' ? null : next })
  }

  function setPage(next: number) {
    patchParams({ page: next <= 1 ? null : String(next) })
  }

  function toggleSpec(label: string, value: string) {
    setSelectedSpecs((prev) => {
      const current = prev[label] || []
      const nextValues = toggleListValue(current, value)
      if (!nextValues.length) {
        const { [label]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [label]: nextValues }
    })
    clearPage()
  }

  function resetFilters() {
    setPriceOverride(null)
    setSelectedSpecs({})
    const params = new URLSearchParams()
    if (searchParams.get('view') === 'list') params.set('view', 'list')
    const rawSearch = params.toString()
    const search = rawSearch ? `?${rawSearch}` : ''
    if (selectedCategory !== 'all') {
      const category = findCategoryBySlugOrId(categories, selectedCategory)
      if (category) {
        navigate({ pathname: catalogCategoryPath(category, categories), search })
        return
      }
    }
    navigate({ pathname: '/catalog', search })
  }

  useEffect(() => {
    setQueryDraft(query)
  }, [query])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (queryDraft.trim() === query) return
      patchParams({ q: queryDraft.trim() || null, page: null }, true)
    }, 160)
    return () => window.clearTimeout(timer)
  }, [queryDraft, query])

  function clearPage() {
    if (searchParams.get('page')) patchParams({ page: null }, true)
  }

  function onMinChange(value: number) {
    const next = Math.min(value, priceMax - STEP)
    setPriceOverride({ min: Math.max(bounds.min, next), max: priceMax })
    clearPage()
  }

  function onMaxChange(value: number) {
    const next = Math.max(value, priceMin + STEP)
    setPriceOverride({ min: priceMin, max: Math.min(bounds.max, next) })
    clearPage()
  }

  const rangePercentMin =
    ((priceMin - bounds.min) / (bounds.max - bounds.min)) * 100
  const rangePercentMax =
    ((priceMax - bounds.min) / (bounds.max - bounds.min)) * 100

  const specSelectedCount = Object.values(selectedSpecs).reduce((sum, values) => sum + values.length, 0)
  const activeFilterCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    selectedBrands.length +
    specSelectedCount +
    (priceMin > bounds.min || priceMax < bounds.max ? 1 : 0)

  if (!loading && routeId && !categoryFromRoute) {
    return <NotFoundPage />
  }

  return (
    <div className="page catalog-page">
      <Header />

      <main className="catalog-main">
        {loading ? (
          <CatalogTopSkeleton />
        ) : (
          <div className="catalog-top">
            <p className="catalog-kicker">Каталог</p>
            <h1>
              {categoryFromRoute
                ? categoryFromRoute.title
                : content.catalog?.title || 'Купить спецтехнику из Китая'}
            </h1>
            <p>
              {categoryFromRoute
                ? `Купить ${categoryFromRoute.title.toLowerCase()} из Китая в Казахстан — новые машины, документы и доставка на объект.`
                : content.catalog?.lead}
            </p>
          </div>
        )}

        {loading ? (
          <CatalogSkeleton view={view} />
        ) : (
        <div className={`catalog-layout${filterOpen ? ' is-filter-open' : ''}`}>
          <button
            type="button"
            className="catalog-filter-backdrop"
            aria-label="Закрыть фильтр"
            onClick={() => setFilterOpen(false)}
          />
          <aside className="catalog-sidebar">
            <div className="catalog-filter-head">
              <strong>Фильтр</strong>
              <button type="button" onClick={() => setFilterOpen(false)}>
                Закрыть
              </button>
            </div>
            <div className="catalog-filter-scroll">
            <FilterBlock
              title="Цена, ₸"
              open={openBlocks.price !== false}
              onToggle={() =>
                setOpenBlocks((prev) => ({ ...prev, price: prev.price === false }))
              }
            >
              <div className="price-values">
                <span>от {formatPrice(priceMin)}</span>
                <span>до {formatPrice(priceMax)}</span>
              </div>
              <div
                className="price-range"
                style={{
                  ['--range-min' as string]: `${rangePercentMin}%`,
                  ['--range-max' as string]: `${rangePercentMax}%`,
                }}
              >
                <input
                  type="range"
                  min={bounds.min}
                  max={bounds.max}
                  step={STEP}
                  value={priceMin}
                  onChange={(event) => onMinChange(Number(event.target.value))}
                  aria-label="Минимальная цена"
                />
                <input
                  type="range"
                  min={bounds.min}
                  max={bounds.max}
                  step={STEP}
                  value={priceMax}
                  onChange={(event) => onMaxChange(Number(event.target.value))}
                  aria-label="Максимальная цена"
                />
              </div>
            </FilterBlock>

            <FilterBlock
              title="Категории"
              open={openBlocks.category !== false}
              onToggle={() =>
                setOpenBlocks((prev) => ({ ...prev, category: prev.category === false }))
              }
            >
              <ul className="filter-categories">
                <li>
                  <button
                    type="button"
                    className={selectedCategory === 'all' ? 'is-active' : undefined}
                    onClick={() => selectCategory('all')}
                  >
                    <span>Вся техника</span>
                    <em>{categoryCounts.all}</em>
                  </button>
                </li>
                {childCategories(categories).map((category) => (
                  <CategoryFilterNode
                    key={category.id}
                    category={category}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    counts={categoryCounts}
                    onSelect={selectCategory}
                  />
                ))}
              </ul>
            </FilterBlock>

            {brandOptions.length > 0 && (
              <FilterBlock
                title="Марка"
                open={openBlocks.brand !== false}
                hint={selectedBrands.length ? String(selectedBrands.length) : undefined}
                onToggle={() =>
                  setOpenBlocks((prev) => ({ ...prev, brand: prev.brand === false }))
                }
              >
                <ul className="filter-checks">
                  {brandOptions.map((brand) => (
                    <li key={brand.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand.id)}
                          onChange={() => toggleBrand(brand.id)}
                        />
                        <span>{brand.name}</span>
                        <em>{brand.count}</em>
                      </label>
                    </li>
                  ))}
                </ul>
              </FilterBlock>
            )}

            {specFacets.length > 0 ? (
              <FilterBlock
                title="Характеристики"
                open={Boolean(openBlocks.specs)}
                hint={specSelectedCount ? String(specSelectedCount) : undefined}
                onToggle={() => setOpenBlocks((prev) => ({ ...prev, specs: !prev.specs }))}
              >
                {specFacets.map((facet) => (
                  <SpecFacetGroup
                    key={facet.label}
                    facet={facet}
                    selected={selectedSpecs[facet.label] || []}
                    onToggle={toggleSpec}
                  />
                ))}
              </FilterBlock>
            ) : null}

            </div>
            <div className="catalog-filter-actions">
              <button className="btn filter-reset" type="button" onClick={resetFilters}>
                Сбросить фильтры
              </button>
              <button
                className="btn btn-primary catalog-filter-apply"
                type="button"
                onClick={() => setFilterOpen(false)}
              >
                Показать {filtered.length}
              </button>
            </div>
          </aside>

          <section className="catalog-results">
            <div className="catalog-toolbar">
              <label className="catalog-search">
                <input
                  value={queryDraft}
                  placeholder="Поиск техники"
                  aria-label="Поиск техники"
                  onChange={(event) => setQueryDraft(event.target.value)}
                />
              </label>
              <button type="button" className="catalog-filter-launch" onClick={() => setFilterOpen(true)}>
                Фильтр
                {activeFilterCount > 0 ? <em>{activeFilterCount}</em> : null}
              </button>
              <p>
                Найдено: <strong>{filtered.length}</strong>
              </p>
              <div className="catalog-toolbar-controls">
                {brandOptions.length > 0 ? (
                  <ToolbarSelect
                    label="Марка"
                    value={
                      selectedBrands.length === 1
                        ? selectedBrands[0]
                        : selectedBrands.length > 1
                          ? '__multi'
                          : ''
                    }
                    options={[
                      { value: '', label: 'Все марки' },
                      ...(selectedBrands.length > 1
                        ? [{ value: '__multi', label: 'Несколько марок', disabled: true }]
                        : []),
                      ...brandOptions.map((brand) => ({ value: brand.id, label: brand.name })),
                    ]}
                    onChange={(id) => {
                      if (id === '__multi') return
                      patchParams({ brand: id || null, page: null })
                    }}
                  />
                ) : null}
                <ToolbarSelect
                  label="Сортировка"
                  value={sort}
                  options={sortOptions}
                  onChange={(next) => changeSort(next as SortKey)}
                />
                <div className="catalog-view" role="group" aria-label="Вид каталога">
                  <button
                    type="button"
                    className={view === 'grid' ? 'is-active' : undefined}
                    aria-pressed={view === 'grid'}
                    aria-label="Сетка"
                    onClick={() => setView('grid')}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path fill="currentColor" d="M1 1h6v6H1V1Zm8 0h6v6H9V1ZM1 9h6v6H1V9Zm8 0h6v6H9V9Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={view === 'list' ? 'is-active' : undefined}
                    aria-pressed={view === 'list'}
                    aria-label="Список"
                    onClick={() => setView('list')}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path fill="currentColor" d="M1 2h4v4H1V2Zm6 0.6h8v2.8H7V2.6ZM1 10h4v4H1v-4Zm6 0.6h8v2.8H7v-2.8Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {resultsPending ? (
              <div className="catalog-results-pending" aria-busy="true">
                <p className="catalog-pending-note">
                  <i />
                  Загрузка
                </p>
                <MachineGridSkeleton count={Math.max(pageMachines.length, 4)} view={view} />
              </div>
            ) : filtered.length > 0 ? (
              <>
                <div className={`machine-grid${view === 'list' ? ' is-list' : ''}`}>
                  {pageMachines.map((machine) => (
                    <MachineCard key={machine.id} machine={machine} />
                  ))}
                </div>
                {pageCount > 1 ? (
                  <nav className="catalog-pager" aria-label="Страницы каталога">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      Назад
                    </button>
                    {pageItems(currentPage, pageCount).map((item, index) =>
                      item === 'gap' ? (
                        <span key={`gap-${index}`} aria-hidden="true">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          className={item === currentPage ? 'is-current' : undefined}
                          aria-current={item === currentPage ? 'page' : undefined}
                          onClick={() => setPage(item)}
                        >
                          {item}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      disabled={currentPage >= pageCount}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      Дальше
                    </button>
                  </nav>
                ) : null}
              </>
            ) : (
              <div className="catalog-empty">
                <h2>Ничего не найдено</h2>
                <p>Попробуйте другую категорию, марку или характеристики.</p>
                <button className="btn btn-primary" type="button" onClick={resetFilters}>
                  Сбросить фильтры
                </button>
              </div>
            )}
          </section>
        </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
