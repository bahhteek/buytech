import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api/client'
import type { Brand, Category, Machine, PublicPayload, SiteContent } from '../types'
import { defaultAbout, machineCover, normalizeAbout, priceBoundsOf } from '../types'

type SiteContextValue = {
  loading: boolean
  error: string | null
  content: SiteContent
  brands: Brand[]
  categories: Category[]
  machines: Machine[]
  refresh: () => Promise<void>
  getMachineById: (id: string) => Machine | undefined
  getRelatedMachines: (machine: Machine, limit?: number) => Machine[]
  priceBounds: { min: number; max: number }
}

const emptyContent: SiteContent = {
  home: {},
  about: defaultAbout,
  catalog: {},
  contacts: {},
  footer: {},
  faq: [],
}

const SiteContext = createContext<SiteContextValue | null>(null)

export function SiteProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PublicPayload>({
    content: emptyContent,
    brands: [],
    categories: [],
    machines: [],
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await api.getPublic()
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<SiteContextValue>(() => {
    const machines = data.machines.map((machine) => ({
      ...machine,
      images: machine.images?.length ? machine.images : [machineCover(machine)],
    }))

    return {
      loading,
      error,
      content: {
        ...(data.content || emptyContent),
        about: normalizeAbout(data.content?.about),
        faq: data.content?.faq || [],
      },
      brands: data.brands,
      categories: data.categories,
      machines,
      refresh,
      getMachineById: (id: string) => machines.find((item) => item.id === id),
      getRelatedMachines: (machine: Machine, limit = 3) => {
        const exclude = new Set([machine.id])
        const pick = (list: Machine[]) =>
          list.filter((item) => !exclude.has(item.id)).slice(0, limit)

        const manual = (machine.relatedIds || [])
          .map((id) => machines.find((item) => item.id === id))
          .filter((item): item is Machine => Boolean(item))
        if (manual.length) return manual.slice(0, limit)

        const sameCategory = pick(
          machines.filter((item) => item.categoryId === machine.categoryId),
        )
        if (sameCategory.length >= limit) return sameCategory

        const used = new Set(sameCategory.map((item) => item.id))
        const sameBrand = machines.filter(
          (item) =>
            item.brandId === machine.brandId &&
            item.id !== machine.id &&
            !used.has(item.id),
        )
        const merged = [...sameCategory, ...sameBrand]
        if (merged.length >= limit) return merged.slice(0, limit)

        const rest = machines.filter(
          (item) => item.id !== machine.id && !merged.some((m) => m.id === item.id),
        )
        return [...merged, ...rest].slice(0, limit)
      },
      priceBounds: priceBoundsOf(machines),
    }
  }, [data, error, loading, refresh])

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite() {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite must be used within SiteProvider')
  return ctx
}
