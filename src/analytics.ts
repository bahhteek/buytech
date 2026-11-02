const VISITOR_KEY = 'buytech_vid'
const SESSION_KEY = 'buytech_sid'
const SESSION_AT_KEY = 'buytech_sid_at'
const SOURCE_KEY = 'buytech_src'
const SESSION_MS = 30 * 60 * 1000

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `v-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function visitorId() {
  const current = localStorage.getItem(VISITOR_KEY)
  if (current) return current
  const next = randomId()
  localStorage.setItem(VISITOR_KEY, next)
  return next
}

export function sessionId() {
  const now = Date.now()
  const current = sessionStorage.getItem(SESSION_KEY)
  const at = Number(sessionStorage.getItem(SESSION_AT_KEY) || 0)
  if (current && now - at < SESSION_MS) {
    sessionStorage.setItem(SESSION_AT_KEY, String(now))
    return current
  }
  const next = randomId()
  sessionStorage.setItem(SESSION_KEY, next)
  sessionStorage.setItem(SESSION_AT_KEY, String(now))
  return next
}

export function trafficSource() {
  const saved = sessionStorage.getItem(SOURCE_KEY)
  if (saved) return saved
  const source = classifySource(document.referrer)
  sessionStorage.setItem(SOURCE_KEY, source)
  return source
}

export function classifySource(referrer: string) {
  if (!referrer) return 'direct'
  let host = ''
  try {
    host = new URL(referrer).hostname.toLowerCase()
  } catch {
    return 'direct'
  }
  if (host === window.location.hostname) return 'direct'
  if (/google\.|yandex\.|bing\.|duckduckgo\.|mail\.ru|yahoo\./.test(host)) return 'search'
  if (/facebook\.|instagram\.|t\.me|telegram\.|vk\.com|ok\.ru|tiktok\.|youtube\.|youtu\.be/.test(host)) return 'social'
  return 'referral'
}

export function deviceKind() {
  const width = window.innerWidth
  if (width < 720) return 'mobile'
  if (width < 1100) return 'tablet'
  return 'desktop'
}

export function isStaffBrowser() {
  return localStorage.getItem('buytech_admin_token') !== null && localStorage.getItem('buytech_admin_token') !== ''
}

export function leadMeta(extra: { page?: string; machineId?: string } = {}) {
  return {
    page: extra.page || window.location.pathname,
    machineId: extra.machineId || '',
    visitor: visitorId(),
    session: sessionId(),
    source: trafficSource(),
    staff: isStaffBrowser(),
  }
}

let lastSearch = ''
let lastSearchAt = 0

export function trackSearch(query: string) {
  const text = query.trim().replace(/\s+/g, ' ')
  if (text.length < 2 || isStaffBrowser() || window.location.pathname.startsWith('/admin')) return
  const key = text.toLowerCase()
  const now = Date.now()
  if (key === lastSearch && now - lastSearchAt < 20000) return
  lastSearch = key
  lastSearchAt = now
  void fetch('/api/index.php/analytics/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      query: text.slice(0, 80),
      path: window.location.pathname,
      visitor: visitorId(),
      staff: false,
    }),
  }).catch(() => undefined)
}
