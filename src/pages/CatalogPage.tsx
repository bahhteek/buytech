import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatPrice } from '../types'
import {
  brandsInPool,
  machineMatchesSpecs,
  machinesInCategory,
  pruneSpecFilters,
  specFacetsFromMachines,
  toggleListValue,
} from '../catalogFilters'
import { Footer, Header } from '../components/Layout'
import { MachineCard } from '../components/MachineCard'
import { useSite } from '../context/SiteContext'
import type { Category, Machine } from '../types'
import { childCategories } from '../categoryTree'
import './CatalogPage.css'

const STEP = 100_000

type SortKey = 'price-asc' | 'price-desc' | 'name' | 'brand' | 'year-desc'

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'price-asc', label: 'Цена: по возрастанию' },
  { value: 'price-desc', label: 'Цена: по убыванию' },
  { value: 'name', label: 'По названию' },
  { value: 'brand', label: 'По марке' },
  { value: 'year-desc', label: 'Сначала новее' },
]

function sortMachines(list: Machine[], sort: SortKey) {
  const next = [...list]
  next.sort((a, b) => {
    switch (sort) {
      case 'price-asc':
        return a.priceFrom - b.priceFrom
      case 'price-desc':
        return b.priceFrom - a.priceFrom
      case 'name':
        return a.name.localeCompare(b.name, 'ru')
      case 'brand':
        return a.brand.localeCompare(b.brand, 'ru') || a.priceFrom - b.priceFrom
      case 'year-desc':
        return b.year - a.year || a.priceFrom - b.priceFrom
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
        <span className="filter-arrow" aria-hidden="true" />
      </button>
      {open ? <div className="filter-block-body">{children}</div> : null}
    </div>
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
  return (
    <li>
      <button
        type="button"
        className={selectedCategory === category.id ? 'is-active' : undefined}
        onClick={() => onSelect(category.id)}
      >
        <span>{category.title}</span>
        <em>{counts[category.id] || 0}</em>
      </button>
      {children.length > 0 && (
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
      )}
    </li>
  )
}

export function CatalogPage() {
  const { categories, machines, content, priceBounds } = useSite()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryFromUrl = searchParams.get('category') ?? 'all'
  const [priceMin, setPriceMin] = useState(0)
  const [priceMax, setPriceMax] = useState(0)
  const [sort, setSort] = useState<SortKey>('price-asc')
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string[]>>({})
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({
    category: true,
    brand: true,
    price: true,
  })

  const bounds =
    priceBounds.min === priceBounds.max
      ? { min: priceBounds.min || 0, max: (priceBounds.min || 0) + STEP }
      : priceBounds

  useEffect(() => {
    setPriceMin(bounds.min)
    setPriceMax(bounds.max)
  }, [bounds.min, bounds.max])

  const selectedCategory = categories.some((c) => c.id === categoryFromUrl)
    ? categoryFromUrl
    : 'all'

  const categoryPool = useMemo(
    () => machinesInCategory(machines, selectedCategory, categories),
    [machines, selectedCategory, categories],
  )

  const brandOptions = useMemo(() => brandsInPool(categoryPool), [categoryPool])

  const specFacets = useMemo(() => specFacetsFromMachines(categoryPool), [categoryPool])

  useEffect(() => {
    setSelectedBrands((prev) =>
      prev.filter((id) => brandOptions.some((brand) => brand.id === id)),
    )
    setSelectedSpecs((prev) => pruneSpecFilters(prev, specFacets))
  }, [selectedCategory, brandOptions, specFacets])

  const filtered = useMemo(() => {
    const list = categoryPool.filter((machine) => {
      const byBrand =
        !selectedBrands.length ||
        selectedBrands.includes(machine.brandId) ||
        selectedBrands.includes(machine.brand)
      const byPrice = machine.priceFrom >= priceMin && machine.priceFrom <= priceMax
      const bySpecs = machineMatchesSpecs(machine, selectedSpecs)
      return byBrand && byPrice && bySpecs
    })
    return sortMachines(list, sort)
  }, [categoryPool, selectedBrands, priceMin, priceMax, selectedSpecs, sort])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: machines.length }
    for (const category of categories) {
      counts[category.id] = machinesInCategory(machines, category.id, categories).length
    }
    return counts
  }, [categories, machines])

  function selectCategory(id: string) {
    setSelectedBrands([])
    setSelectedSpecs({})
    if (id === 'all') {
      setSearchParams({})
      return
    }
    setSearchParams({ category: id })
  }

  function toggleBrand(id: string) {
    setSelectedBrands((prev) => toggleListValue(prev, id))
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
  }

  function resetFilters() {
    setPriceMin(bounds.min)
    setPriceMax(bounds.max)
    setSort('price-asc')
    setSelectedBrands([])
    setSelectedSpecs({})
    setSearchParams({})
  }

  function onMinChange(value: number) {
    const next = Math.min(value, priceMax - STEP)
    setPriceMin(Math.max(bounds.min, next))
  }

  function onMaxChange(value: number) {
    const next = Math.max(value, priceMin + STEP)
    setPriceMax(Math.min(bounds.max, next))
  }

  const rangePercentMin =
    ((priceMin - bounds.min) / (bounds.max - bounds.min)) * 100
  const rangePercentMax =
    ((priceMax - bounds.min) / (bounds.max - bounds.min)) * 100

  const hasExtraFilters =
    selectedBrands.length > 0 || Object.keys(selectedSpecs).length > 0

  return (
    <div className="page catalog-page">
      <Header />

      <main className="catalog-main">
        <div className="catalog-top">
          <p className="catalog-kicker">Каталог</p>
          <h1>{content.catalog?.title || 'Спецтехника из Китая'}</h1>
          <p>{content.catalog?.lead}</p>
        </div>

        <div className="catalog-layout">
          <aside className="catalog-sidebar">
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

            {specFacets.map((facet) => {
              const selectedCount = (selectedSpecs[facet.label] || []).length
              return (
                <FilterBlock
                  key={facet.label}
                  title={facet.label}
                  open={Boolean(openBlocks[`spec:${facet.label}`])}
                  hint={selectedCount ? String(selectedCount) : undefined}
                  onToggle={() =>
                    setOpenBlocks((prev) => ({
                      ...prev,
                      [`spec:${facet.label}`]: !prev[`spec:${facet.label}`],
                    }))
                  }
                >
                  <ul className="filter-checks">
                    {facet.values.map((value) => (
                      <li key={value}>
                        <label>
                          <input
                            type="checkbox"
                            checked={(selectedSpecs[facet.label] || []).includes(value)}
                            onChange={() => toggleSpec(facet.label, value)}
                          />
                          <span>{value}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </FilterBlock>
              )
            })}

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

            <button className="btn btn-ghost filter-reset" type="button" onClick={resetFilters}>
              Сбросить фильтры
            </button>
          </aside>

          <section className="catalog-results">
            <div className="catalog-toolbar">
              <p>
                Найдено: <strong>{filtered.length}</strong>
                {hasExtraFilters ? <span className="catalog-toolbar-hint"> · фильтры активны</span> : null}
              </p>
              <label className="catalog-sort">
                <span>Сортировка</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filtered.length > 0 ? (
              <div className="machine-grid">
                {filtered.map((machine) => (
                  <MachineCard key={machine.id} machine={machine} />
                ))}
              </div>
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
      </main>

      <Footer />
    </div>
  )
}
