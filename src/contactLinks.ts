export const DEFAULT_CONTACTS = {
  phone: '+7 (777) 651-79-70',
  phone2: '+7 (705) 464-54-55',
  whatsapp: '+7 (707) 778-77-21',
  whatsapp2: '+7 (705) 464-54-55',
}

export function phoneDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function telHref(value: string) {
  return `tel:+${phoneDigits(value)}`
}

export function waHref(value: string) {
  return `https://wa.me/${phoneDigits(value)}`
}
