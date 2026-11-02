import './Skeleton.css'

function Status({ label }: { label: string }) {
  return <p className="skeleton-status">{label}</p>
}

export function MachineCardSkeleton() {
  return (
    <article className="machine skeleton-card" aria-hidden="true">
      <div className="machine-photo skeleton skeleton-photo" />
      <div className="machine-body">
        <div className="machine-top">
          <span className="skeleton skeleton-tag" />
          <span className="skeleton skeleton-type" />
        </div>
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-title is-short" />
        <div className="machine-foot">
          <span className="skeleton skeleton-line is-year" />
          <span className="skeleton skeleton-price" />
        </div>
      </div>
    </article>
  )
}

export function MachineGridSkeleton({
  count = 6,
  view = 'grid',
}: {
  count?: number
  view?: 'grid' | 'list'
}) {
  return (
    <div className={`machine-grid${view === 'list' ? ' is-list' : ''}`}>
      {Array.from({ length: count }, (_, index) => (
        <MachineCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function CategoryGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-category" key={index} aria-hidden="true">
          <span className="skeleton skeleton-fill" />
          <div className="skeleton-category-meta">
            <span className="skeleton skeleton-title" />
          </div>
        </div>
      ))}
    </>
  )
}

export function BrandSkeletons({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <li key={index} aria-hidden="true">
          <span className="skeleton skeleton-brand" />
        </li>
      ))}
    </>
  )
}

function FilterRows({ count, active = false }: { count: number; active?: boolean }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <span className={`skeleton-filter-row${active && index === 0 ? ' is-active' : ''}`} key={index}>
          <span className="skeleton skeleton-label" />
          <span className="skeleton skeleton-count" />
        </span>
      ))}
    </>
  )
}

export function CatalogTopSkeleton() {
  return (
    <div className="catalog-top skeleton-top" aria-hidden="true">
      <p className="catalog-kicker">
        <span className="skeleton skeleton-kicker" />
      </p>
      <span className="skeleton skeleton-h1" />
      <span className="skeleton skeleton-lead" />
      <span className="skeleton skeleton-lead is-short" />
    </div>
  )
}

export function CatalogSkeleton({ view = 'grid' }: { view?: 'grid' | 'list' }) {
  return (
    <div className="skeleton-catalog" aria-busy="true">
      <Status label="Загрузка каталога" />
      <aside className="skeleton-sidebar" aria-hidden="true">
        <div className="skeleton-panel">
          <span className="skeleton skeleton-heading" />
          <span className="skeleton-price-line">
            <span className="skeleton skeleton-mini" />
            <span className="skeleton skeleton-mini" />
          </span>
          <span className="skeleton skeleton-range" />
        </div>
        <div className="skeleton-panel">
          <span className="skeleton skeleton-heading" />
          <FilterRows count={17} active />
        </div>
        <div className="skeleton-panel">
          <span className="skeleton skeleton-heading" />
          {Array.from({ length: 3 }, (_, index) => (
            <span className="skeleton-check-row" key={index}>
              <span className="skeleton skeleton-box" />
              <span className="skeleton skeleton-label" />
              <span className="skeleton skeleton-count" />
            </span>
          ))}
        </div>
        <div className="skeleton-panel">
          <span className="skeleton skeleton-heading is-wide" />
        </div>
        <span className="skeleton skeleton-reset" />
      </aside>
      <div>
        <div className="skeleton-toolbar" aria-hidden="true">
          <span className="skeleton skeleton-launch" />
          <span className="skeleton skeleton-found" />
          <span className="skeleton-toolbar-controls">
            <span className="skeleton skeleton-select" />
            <span className="skeleton skeleton-select is-wide" />
            <span className="skeleton skeleton-view" />
          </span>
        </div>
        <MachineGridSkeleton count={view === 'list' ? 6 : 6} view={view} />
      </div>
    </div>
  )
}

export function ProductSkeleton() {
  return (
    <div aria-busy="true">
      <Status label="Загрузка техники" />
      <div className="skeleton-crumbs" aria-hidden="true">
        <span className="skeleton skeleton-crumb" />
        <span className="skeleton skeleton-crumb" />
        <span className="skeleton skeleton-crumb is-long" />
      </div>
      <div className="skeleton-product" aria-hidden="true">
        <div className="skeleton skeleton-gallery" />
        <div className="skeleton-summary">
          <div className="skeleton-tags">
            <span className="skeleton skeleton-tag" />
            <span className="skeleton skeleton-type" />
          </div>
          <span className="skeleton skeleton-title is-large" />
          <span className="skeleton skeleton-title is-large is-short" />
          <span className="skeleton skeleton-price is-large" />
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-line is-short" />
          <div className="skeleton-quick">
            <span className="skeleton skeleton-line" />
            <span className="skeleton skeleton-line" />
            <span className="skeleton skeleton-line" />
          </div>
          <div className="skeleton-actions">
            <span className="skeleton skeleton-button" />
            <span className="skeleton skeleton-button" />
          </div>
        </div>
      </div>
      <div className="skeleton-specs" aria-hidden="true">
        <span className="skeleton skeleton-heading" />
        {Array.from({ length: 6 }, (_, index) => (
          <span className="skeleton skeleton-spec" key={index} />
        ))}
      </div>
    </div>
  )
}
