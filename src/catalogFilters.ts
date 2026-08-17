import type { Machine } from './types'

export type SpecFacet = {
  label: string
  values: string[]
}

/** Labels that are usually the same for everyone and clutter the filter. */
const SPEC_FILTER_SKIP = new Set(['гарантия', 'поставка'])

function normalizeLabel(label: string) {
  return label.trim().toLowerCase()
}

export function machinesInCategory(machines: Machine[], categoryId: string) {
  if (categoryId === 'all') return machines
  return machines.filter((machine) => machine.categoryId === categoryId)
}

export function brandsInPool(machines: Machine[]) {
  const map = new Map<string, { id: string; name: string; count: number }>()
  for (const machine of machines) {
    const id = machine.brandId || machine.brand
    if (!id) continue
    const current = map.get(id)
    if (current) {
      current.count += 1
    } else {
      map.set(id, { id, name: machine.brand || id, count: 1 })
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

/** Build checkbox facets from specs that actually exist on machines in the pool. */
export function specFacetsFromMachines(machines: Machine[]): SpecFacet[] {
  const map = new Map<string, { label: string; values: Set<string> }>()

  for (const machine of machines) {
    for (const spec of machine.specs || []) {
      const label = spec.label?.trim()
      const value = spec.value?.trim()
      if (!label || !value) continue
      if (SPEC_FILTER_SKIP.has(normalizeLabel(label))) continue

      const key = normalizeLabel(label)
      const entry = map.get(key)
      if (entry) {
        entry.values.add(value)
      } else {
        map.set(key, { label, values: new Set([value]) })
      }
    }
  }

  return [...map.values()]
    .map((entry) => ({
      label: entry.label,
      values: [...entry.values].sort((a, b) => a.localeCompare(b, 'ru', { numeric: true })),
    }))
    .filter((facet) => facet.values.length > 1)
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'))
}

export function machineMatchesSpecs(
  machine: Machine,
  selected: Record<string, string[]>,
) {
  const entries = Object.entries(selected).filter(([, values]) => values.length > 0)
  if (!entries.length) return true

  return entries.every(([label, values]) => {
    const key = normalizeLabel(label)
    const spec = (machine.specs || []).find((item) => normalizeLabel(item.label) === key)
    if (!spec) return false
    return values.includes(spec.value.trim())
  })
}

export function pruneSpecFilters(
  selected: Record<string, string[]>,
  facets: SpecFacet[],
) {
  const allowed = new Map(facets.map((facet) => [normalizeLabel(facet.label), facet]))
  const next: Record<string, string[]> = {}

  for (const [label, values] of Object.entries(selected)) {
    const facet = allowed.get(normalizeLabel(label))
    if (!facet) continue
    const kept = values.filter((value) => facet.values.includes(value))
    if (kept.length) next[facet.label] = kept
  }

  return next
}

export function toggleListValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}
