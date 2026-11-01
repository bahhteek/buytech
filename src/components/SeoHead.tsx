import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  catalogCategoryPath,
  findCategoryBySlugOrId,
  findMachineBySlugOrId,
  machinePath,
} from '../categorySlug'
import { useSite } from '../context/SiteContext'

function setMeta(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

export function SeoHead() {
  const location = useLocation()
  const { content, categories, machines, loading } = useSite()

  useEffect(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (loading && parts.length > 0 && parts[0] !== 'admin') return

    const origin = window.location.origin
    const pathname = location.pathname
    const canonical = origin + (pathname === '/' ? '/' : pathname)
    const category = parts[0] ? findCategoryBySlugOrId(categories, parts[0]) : undefined
    const machine = parts[1] ? findMachineBySlugOrId(machines, parts[1]) : undefined

    let title = 'Страница не найдена | BuyTech'
    let description = 'Такой страницы нет на BuyTech.'
    let href = canonical

    if (pathname.startsWith('/admin')) {
      title = 'Админка BuyTech'
      description = 'Служебный раздел сайта BuyTech.'
    } else if (pathname === '/') {
      title = `${content.home?.heroTitle || 'Купить спецтехнику из Китая в Казахстан'} | BuyTech`
      description =
        content.home?.heroLead ||
        'Новая спецтехника HOWO, Hengte, SOVOL, Shantui и SHANMON — документы и доставка.'
    } else if (pathname === '/catalog') {
      title = 'Купить спецтехнику из Китая | BuyTech'
      description =
        content.catalog?.lead ||
        'Каталог новой спецтехники из Китая: самосвалы, экскаваторы, бульдозеры и погрузчики с поставкой в Казахстан.'
    } else if (machine) {
      const heading = [machine.brand, machine.name].filter(Boolean).join(' ')
      title = `${heading} — купить в Казахстане | BuyTech`
      description =
        machine.description ||
        `${machine.brand} ${machine.category}: новая техника из Китая, документы и доставка.`.trim()
      href = origin + machinePath(machine, categories, machines)
    } else if (category && parts.length === 1) {
      title = `${category.title} — купить в Казахстане | BuyTech`
      description = `Купить ${category.title.toLowerCase()} из Китая в Казахстан: новые машины, документы и доставка на объект.`
      href = origin + catalogCategoryPath(category, categories)
    } else if (pathname === '/about') {
      title = `${content.about?.title || 'О компании'} | BuyTech`
      description = content.about?.lead || 'BuyTech поставляет новую спецтехнику из Китая в Казахстан.'
    } else if (pathname === '/contacts') {
      title = `${content.contacts?.title || 'Контакты'} | BuyTech`
      description = content.contacts?.lead || 'Свяжитесь с BuyTech по поставке спецтехники.'
    } else if (pathname === '/faq') {
      title = 'Вопросы и ответы | BuyTech'
      description = 'Сроки, документы и поставка новой спецтехники из Китая в Казахстан.'
    } else if (pathname === '/privacy') {
      title = 'Политика конфиденциальности | BuyTech'
      description = 'Как BuyTech обрабатывает персональные данные.'
    } else if (pathname === '/terms') {
      title = 'Пользовательское соглашение | BuyTech'
      description = 'Условия использования сайта BuyTech.'
    }

    document.title = title
    setMeta('description', description)
    setCanonical(href)
  }, [location.pathname, content, categories, machines, loading])

  return null
}
