export type Category = {
  id: string
  title: string
  count: string
  image: string
}

export type Machine = {
  id: string
  name: string
  category: string
  year: number
  hours: string
  price: string
  image: string
}

export const categories: Category[] = [
  {
    id: 'excavators',
    title: 'Экскаваторы',
    count: '48 единиц',
    image:
      'https://images.unsplash.com/photo-1581094271901-8022df4466f9?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'loaders',
    title: 'Погрузчики',
    count: '36 единиц',
    image:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'cranes',
    title: 'Краны',
    count: '22 единицы',
    image:
      'https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'trucks',
    title: 'Самосвалы',
    count: '31 единица',
    image:
      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=900&q=80',
  },
]

export const machines: Machine[] = [
  {
    id: '1',
    name: 'Caterpillar 320 GC',
    category: 'Экскаватор',
    year: 2021,
    hours: '3 420 м/ч',
    price: '18 900 000 ₸',
    image:
      'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: '2',
    name: 'Komatsu WA380-8',
    category: 'Погрузчик',
    year: 2020,
    hours: '4 180 м/ч',
    price: '24 500 000 ₸',
    image:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: '3',
    name: 'Liebherr LTM 1050',
    category: 'Автокран',
    year: 2019,
    hours: '2 960 м/ч',
    price: '41 200 000 ₸',
    image:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=80',
  },
]
