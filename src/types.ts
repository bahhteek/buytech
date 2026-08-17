export type Spec = {
  id: string
  label: string
  value: string
}

export type Brand = {
  id: string
  name: string
}

export type Category = {
  id: string
  title: string
  hint: string
  image: string
}

export type Machine = {
  id: string
  name: string
  brandId: string
  brand: string
  category: string
  categoryId: string
  year: number
  condition: string
  price: string
  priceFrom: number
  images: string[]
  videoUrl?: string
  description: string
  specs: Spec[]
  /** Explicit related machines for the product page; empty → auto by category/brand. */
  relatedIds?: string[]
}

export type Lead = {
  id: string
  name: string
  phone: string
  email: string
  need: string
  createdAt: string
  status: 'new' | 'done' | 'deleted' | string
}

export type AboutRole = {
  id: string
  kicker: string
  title: string
  text: string
  points: string[]
}

export type AboutFact = {
  id: string
  value: string
  label: string
}

export type AboutStep = {
  id: string
  n: string
  title: string
  text: string
}

export type AboutContent = {
  title: string
  lead: string
  roles: AboutRole[]
  facts: AboutFact[]
  stepsTitle: string
  stepsLead: string
  steps: AboutStep[]
  ctaTitle: string
  ctaLead: string
  ctaButton: string
}

export const defaultAbout: AboutContent = {
  title: 'Продаём технику. Поставляет ТОО «Спецтехkz»',
  lead:
    'BuyTech — коммерческий бренд отдела продаж. Договор, таможня, гарантия и логистика идут через действующего поставщика с 2013 года.',
  roles: [
    {
      id: 'sales',
      kicker: 'BuyTech',
      title: 'Продажи и подбор',
      text: 'Мы принимаем заявку, уточняем задачу объекта, подбираем марку и модель и считаем ориентир по цене и срокам.',
      points: ['Подбор техники под задачу', 'Расчёт поставки в Казахстан', 'Сопровождение до договора'],
    },
    {
      id: 'supply',
      kicker: 'ТОО «Спецтехkz»',
      title: 'Договор и поставка',
      text: 'Юрлицо, склад и сервис — в Павлодаре, на рынке с 2013 года. Через компанию оформляются контракт, документы на ввоз, гарантия и доставка на объект.',
      points: ['Контракт и оплата', 'Таможня и пакет документов', 'Гарантия и склад запчастей'],
    },
  ],
  facts: [
    { id: 'year', value: '2013', label: 'Год основания поставщика' },
    { id: 'city', value: 'Павлодар', label: 'Юрлицо и склад' },
    { id: 'origin', value: 'Китай', label: 'Новая техника с завода' },
    { id: 'warranty', value: '12 мес.', label: 'Гарантия на технику' },
  ],
  stepsTitle: 'Как устроена работа',
  stepsLead: 'Продажи через BuyTech, договор и поставка — через ТОО «Спецтехkz».',
  steps: [
    { id: 's1', n: '01', title: 'Заявка', text: 'Пишете в BuyTech — модель, бюджет, город поставки.' },
    { id: 's2', n: '02', title: 'Подбор', text: 'Присылаем 2–3 варианта и ориентир по срокам.' },
    { id: 's3', n: '03', title: 'Договор', text: 'Сделку оформляет ТОО «Спецтехkz» — счёт, контракт, документы.' },
    { id: 's4', n: '04', title: 'Поставка', text: 'Техника едет в Казахстан и передаётся на ваш объект.' },
  ],
  ctaTitle: 'Нужна техника под объект?',
  ctaLead: 'Оставьте заявку — подберём модель и посчитаем поставку в Казахстан.',
  ctaButton: 'Связаться',
}

export function normalizeAbout(raw?: Partial<AboutContent> | null): AboutContent {
  const source = raw || {}
  return {
    title: source.title || defaultAbout.title,
    lead: source.lead || defaultAbout.lead,
    roles: Array.isArray(source.roles) && source.roles.length ? source.roles : defaultAbout.roles,
    facts: Array.isArray(source.facts) && source.facts.length ? source.facts : defaultAbout.facts,
    stepsTitle: source.stepsTitle || defaultAbout.stepsTitle,
    stepsLead: source.stepsLead || defaultAbout.stepsLead,
    steps: Array.isArray(source.steps) && source.steps.length ? source.steps : defaultAbout.steps,
    ctaTitle: source.ctaTitle || defaultAbout.ctaTitle,
    ctaLead: source.ctaLead || defaultAbout.ctaLead,
    ctaButton: source.ctaButton || defaultAbout.ctaButton,
  }
}

export type SiteContent = {
  home: Record<string, string>
  about: AboutContent
  catalog: Record<string, string>
  contacts: Record<string, string>
  footer: Record<string, string>
  faq: { id: string; question: string; answer: string }[]
}

export type PublicPayload = {
  content: SiteContent
  brands: Brand[]
  categories: Category[]
  machines: Machine[]
}

export function machineCover(machine: Machine) {
  return machine.images?.[0] || '/images/excavator.jpg'
}

export function formatPrice(value: number) {
  return `${value.toLocaleString('ru-RU')} ₸`
}

export function priceBoundsOf(machines: Machine[]) {
  if (!machines.length) return { min: 0, max: 0 }
  return {
    min: Math.min(...machines.map((m) => m.priceFrom)),
    max: Math.max(...machines.map((m) => m.priceFrom)),
  }
}
