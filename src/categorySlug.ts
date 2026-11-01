import type { Category, Machine } from './types'
import { categoryPath } from './categoryTree'

const TITLE_SLUGS: Record<string, string> = {
  самосвал: 'dump-truck',
  самосвалы: 'dump-truck',
  грузовики: 'truck',
  экскаватор: 'excavator',
  экскаваторы: 'excavator',
  'мини-экскаваторы': 'mini-excavator',
  'мини экскаваторы': 'mini-excavator',
  бульдозер: 'bulldozer',
  бульдозеры: 'bulldozer',
  погрузчик: 'loader',
  погрузчики: 'loader',
  'фронтальные погрузчики': 'wheel-loader',
  катки: 'roller',
  автокраны: 'truck-crane',
}

const SLUG_ALIASES: Record<string, string[]> = {
  bulldozer: ['bulldozers', 'buldozer'],
  excavator: ['excavators', 'ekskavatory', 'ekskavator'],
  loader: ['loaders', 'pogruzchiki', 'pogruzchik'],
  'dump-truck': ['dump-trucks', 'samosvaly', 'samosval', 'trucks'],
}

const CYRILLIC: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'j',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string) {
  return UUID_RE.test(value)
}

export function isPrettySlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && !isUuid(value)
}

export function slugifyPath(text: string) {
  const translit = text
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => (char in CYRILLIC ? CYRILLIC[char] : char))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return translit || 'item'
}

export function slugifyTitle(title: string) {
  const mapped = TITLE_SLUGS[title.trim().toLowerCase()]
  if (mapped) return mapped
  return slugifyPath(title)
}

function preferredSlug(category: Category) {
  const explicit = category.slug?.trim().toLowerCase()
  if (explicit && isPrettySlug(explicit)) return explicit
  if (isPrettySlug(category.id)) return category.id
  return slugifyTitle(category.title || '')
}

export function categorySlugMap(categories: Category[]) {
  const used = new Set<string>()
  const map = new Map<string, string>()
  const ordered = [...categories].sort((a, b) => a.id.localeCompare(b.id))
  for (const category of ordered) {
    let slug = preferredSlug(category)
    if (!slug || used.has(slug)) {
      slug = `${slug || 'category'}-${category.id.slice(0, 8).toLowerCase()}`
    }
    used.add(slug)
    map.set(category.id, slug)
  }
  return map
}

export function categorySlug(category: Category, categories: Category[]) {
  return categorySlugMap(categories).get(category.id) || preferredSlug(category)
}

export function rootCategoryOf(category: Category, categories: Category[]) {
  const trail = categoryPath(categories, category.id)
  return trail[0] || category
}

export function catalogCategoryPath(category: Category, categories: Category[]) {
  return `/${categorySlug(category, categories)}`
}

function categorySlugKeys(category: Category, slugs: Map<string, string>) {
  const primary = slugs.get(category.id) || preferredSlug(category)
  const fromTitle = slugifyTitle(category.title || '')
  return new Set([
    primary,
    fromTitle,
    ...(SLUG_ALIASES[primary] || []),
    ...(SLUG_ALIASES[fromTitle] || []),
  ])
}

export function findCategoryBySlugOrId(categories: Category[], value: string) {
  if (!value) return undefined
  const byId = categories.find((category) => category.id === value)
  if (byId) return byId
  const slugs = categorySlugMap(categories)
  for (const category of categories) {
    if (categorySlugKeys(category, slugs).has(value)) return category
  }
  return undefined
}

function preferredMachineSlug(machine: Machine) {
  const explicit = machine.slug?.trim().toLowerCase()
  if (explicit && isPrettySlug(explicit)) return explicit
  return slugifyPath([machine.brand, machine.name].filter(Boolean).join(' '))
}

export function machineSlugMap(machines: Machine[]) {
  const used = new Set<string>()
  const map = new Map<string, string>()
  const ordered = [...machines].sort((a, b) => a.id.localeCompare(b.id))
  for (const machine of ordered) {
    let slug = preferredMachineSlug(machine)
    if (!slug || used.has(slug)) {
      slug = `${slug || 'machine'}-${machine.id.slice(0, 8).toLowerCase()}`
    }
    used.add(slug)
    map.set(machine.id, slug)
  }
  return map
}

export function machineSlug(machine: Machine, machines: Machine[]) {
  return machineSlugMap(machines).get(machine.id) || preferredMachineSlug(machine)
}

export function machineRootCategory(machine: Machine, categories: Category[]) {
  const current = findCategoryBySlugOrId(categories, machine.categoryId)
  if (!current) {
    return {
      id: machine.categoryId,
      title: machine.category || 'catalog',
      hint: '',
      image: '',
    }
  }
  return rootCategoryOf(current, categories)
}

export function machinePath(machine: Machine, categories: Category[], machines: Machine[]) {
  const root = machineRootCategory(machine, categories)
  return `${catalogCategoryPath(root, categories)}/${machineSlug(machine, machines)}`
}

export function findMachineBySlugOrId(machines: Machine[], value: string) {
  if (!value) return undefined
  const byId = machines.find((machine) => machine.id === value)
  if (byId) return byId
  const slugs = machineSlugMap(machines)
  return machines.find((machine) => slugs.get(machine.id) === value)
}
