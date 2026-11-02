import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { deviceKind, isStaffBrowser, sessionId, trackSearch, trafficSource, visitorId } from '../analytics'
import { findBrandBySlugOrId, findCategoryBySlugOrId, findMachineBySlugOrId } from '../categorySlug'
import { useSite } from '../context/SiteContext'

const STATIC = new Set(['catalog', 'about', 'contacts', 'faq', 'privacy', 'terms'])

export function AnalyticsTracker() {
  const location = useLocation()
  const { loading, allMachines, categories, brands } = useSite()

  useEffect(() => {
    if (loading || isStaffBrowser() || location.pathname.startsWith('/admin')) return
    const query = new URLSearchParams(location.search).get('q') || ''
    if (query.trim().length < 2) return
    const timer = window.setTimeout(() => trackSearch(query), 500)
    return () => window.clearTimeout(timer)
  }, [location.pathname, location.search, loading])

  useEffect(() => {
    if (loading || isStaffBrowser() || location.pathname.startsWith('/admin')) return
    const timer = window.setTimeout(() => {
      const parts = location.pathname.split('/').filter(Boolean)
      let machineId = ''
      let categoryId = ''
      let brandId = ''
      if (parts[0] === 'brand' && parts[1]) {
        brandId = findBrandBySlugOrId(brands, parts[1])?.id || ''
      } else if (parts.length >= 2) {
        const machine = findMachineBySlugOrId(allMachines, parts[1])
        if (machine) {
          machineId = machine.id
          categoryId = machine.categoryId
          brandId = machine.brandId
        }
      } else if (parts.length === 1 && !STATIC.has(parts[0])) {
        categoryId = findCategoryBySlugOrId(categories, parts[0])?.id || ''
      }
      void fetch('/api/index.php/analytics/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          path: location.pathname,
          title: document.title,
          visitor: visitorId(),
          session: sessionId(),
          source: trafficSource(),
          device: deviceKind(),
          machineId,
          categoryId,
          brandId,
        }),
      }).catch(() => undefined)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [location.pathname, loading, allMachines, categories, brands])

  return null
}
