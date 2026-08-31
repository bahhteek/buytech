import type { Category, Machine } from './types'

export function categoryParentId(category: Category) {
  return category.parentId ? String(category.parentId) : ''
}

export function childCategories(categories: Category[], parentId = '') {
  return categories
    .filter((category) => categoryParentId(category) === parentId)
    .sort((a, b) => a.title.localeCompare(b.title, 'ru'))
}

export function rootCategories(categories: Category[]) {
  return childCategories(categories, '')
}

export function descendantIds(categories: Category[], id: string) {
  const ids = [id]
  let added = true
  while (added) {
    added = false
    for (const category of categories) {
      const parent = categoryParentId(category)
      if (parent && ids.includes(parent) && !ids.includes(category.id)) {
        ids.push(category.id)
        added = true
      }
    }
  }
  return ids
}

export function isCategoryDescendant(
  categories: Category[],
  ancestorId: string,
  id: string,
) {
  return descendantIds(categories, ancestorId).includes(id)
}

export type CategoryNode = {
  category: Category
  depth: number
}

export function flattenCategoryTree(categories: Category[], parentId = '', depth = 0): CategoryNode[] {
  const nodes: CategoryNode[] = []
  for (const category of childCategories(categories, parentId)) {
    nodes.push({ category, depth })
    nodes.push(...flattenCategoryTree(categories, category.id, depth + 1))
  }
  return nodes
}

export function categoryPath(categories: Category[], id: string) {
  const map = new Map(categories.map((category) => [category.id, category]))
  const path: Category[] = []
  let current = map.get(id)
  const seen = new Set<string>()
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    path.unshift(current)
    const parent = categoryParentId(current)
    current = parent ? map.get(parent) : undefined
  }
  return path
}

export function categoryOptionLabel(title: string, depth: number) {
  return `${depth ? `${'— '.repeat(depth)}` : ''}${title}`
}

export function machinesInCategoryTree(
  machines: Machine[],
  categoryId: string,
  categories: Category[],
) {
  if (categoryId === 'all') return machines
  const ids = new Set(descendantIds(categories, categoryId))
  return machines.filter((machine) => ids.has(machine.categoryId))
}
