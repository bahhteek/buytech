import { Navigate, useParams } from 'react-router-dom'
import {
  catalogCategoryPath,
  findCategoryBySlugOrId,
  findMachineBySlugOrId,
  machinePath,
} from '../categorySlug'
import { Footer, Header } from '../components/Layout'
import { CatalogSkeleton } from '../components/Skeleton'
import { useSite } from '../context/SiteContext'
import { NotFoundPage } from './NotFoundPage'
import './CatalogPage.css'

export function CatalogOrProduct() {
  const { id } = useParams()
  const { categories, machines, loading } = useSite()
  const slug = id || ''

  if (loading) {
    return (
      <div className="page catalog-page">
        <Header />
        <main className="catalog-main">
          <CatalogSkeleton />
        </main>
        <Footer />
      </div>
    )
  }

  const machine = findMachineBySlugOrId(machines, slug)
  if (machine) {
    return <Navigate to={machinePath(machine, categories, machines)} replace />
  }
  const category = findCategoryBySlugOrId(categories, slug)
  if (category) {
    return <Navigate to={catalogCategoryPath(category, categories)} replace />
  }
  return <NotFoundPage />
}
