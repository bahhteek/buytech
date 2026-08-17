export type Category = {
  id: string
  title: string
  hint: string
  image: string
}

export type Machine = {
  id: string
  name: string
  brand: string
  category: string
  year: number
  condition: string
  price: string
  image: string
}

export const brands = ['HOWO', 'Hengte', 'SOVOL', 'Shantui', 'SHANMON'] as const

export const categories: Category[] = [
  {
    id: 'trucks',
    title: 'Самосвалы',
    hint: 'HOWO и аналоги',
    image: '/images/dump.jpg',
  },
  {
    id: 'excavators',
    title: 'Экскаваторы',
    hint: 'SOVOL, Shantui',
    image: '/images/excavator.jpg',
  },
  {
    id: 'bulldozers',
    title: 'Бульдозеры',
    hint: 'Shantui, SHANMON',
    image: '/images/dozer.jpg',
  },
  {
    id: 'loaders',
    title: 'Погрузчики',
    hint: 'Hengte и другие',
    image: '/images/loader.jpg',
  },
]

export const machines: Machine[] = [
  {
    id: '1',
    name: 'HOWO 371',
    brand: 'HOWO',
    category: 'Грузовик',
    year: 2025,
    condition: 'Новый',
    price: 'от 24 700 000 ₸',
    image: '/images/howo.jpg',
  },
  {
    id: '2',
    name: 'HOWO Tipper 6×4',
    brand: 'HOWO',
    category: 'Самосвал',
    year: 2025,
    condition: 'Новый',
    price: 'от 28 500 000 ₸',
    image: '/images/dump.jpg',
  },
  {
    id: '3',
    name: 'SOVOL SWE215',
    brand: 'SOVOL',
    category: 'Экскаватор',
    year: 2025,
    condition: 'Новый',
    price: 'от 32 900 000 ₸',
    image: '/images/excavator.jpg',
  },
  {
    id: '4',
    name: 'Shantui SD32',
    brand: 'Shantui',
    category: 'Бульдозер',
    year: 2025,
    condition: 'Новый',
    price: 'от 41 200 000 ₸',
    image: '/images/dozer.jpg',
  },
  {
    id: '5',
    name: 'Hengte HT956',
    brand: 'Hengte',
    category: 'Погрузчик',
    year: 2025,
    condition: 'Новый',
    price: 'от 19 800 000 ₸',
    image: '/images/loader.jpg',
  },
  {
    id: '6',
    name: 'SHANMON SM220',
    brand: 'SHANMON',
    category: 'Экскаватор',
    year: 2025,
    condition: 'Новый',
    price: 'от 29 400 000 ₸',
    image: '/images/excavator-2.jpg',
  },
]
