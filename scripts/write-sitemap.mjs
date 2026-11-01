import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = 'https://buytech.kz'

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function categorySlug(category, categories) {
  const titleMap = {
    самосвалы: 'dump-trucks',
    грузовики: 'trucks',
    экскаваторы: 'excavators',
    'мини-экскаваторы': 'mini-excavators',
    бульдозеры: 'bulldozers',
    погрузчики: 'loaders',
  }
  const id = String(category?.id || '')
  const explicit = String(category?.slug || '').trim().toLowerCase()
  const pretty = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && !/^[0-9a-f-]{36}$/i.test(id)
  if (explicit && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(explicit)) return explicit
  if (pretty) return id
  const title = String(category?.title || '').trim().toLowerCase()
  if (titleMap[title]) return titleMap[title]
  const slug = title
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
  const used = new Set(
    categories.map((item) => String(item.id || '')).filter((item) => item && item !== id),
  )
  return slug && !used.has(slug) ? slug : `${slug || 'category'}-${id.slice(0, 8)}`
}

export function buildSitemapXml(dbPath) {
  let machines = []
  let categories = []
  let lastmod = new Date().toISOString().slice(0, 10)
  if (dbPath && fs.existsSync(dbPath)) {
    try {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'))
      machines = Array.isArray(db.machines) ? db.machines : []
      categories = Array.isArray(db.categories) ? db.categories : []
      const mtime = fs.statSync(dbPath).mtime
      lastmod = mtime.toISOString().slice(0, 10)
    } catch (error) {
      console.warn('sitemap: cannot parse db.json, using static pages only:', error.message)
    }
  }

  const pages = [
    { loc: `${base}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${base}/catalog`, changefreq: 'daily', priority: '0.9' },
    { loc: `${base}/about`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${base}/contacts`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${base}/faq`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${base}/privacy`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${base}/terms`, changefreq: 'yearly', priority: '0.3' },
  ]

  for (const category of categories) {
    if (!category?.id || !category?.title) continue
    pages.push({
      loc: `${base}/catalog/${encodeURIComponent(categorySlug(category, categories))}`,
      changefreq: 'weekly',
      priority: '0.85',
    })
  }

  for (const machine of machines) {
    if (!machine?.id) continue
    pages.push({
      loc: `${base}/catalog/${encodeURIComponent(String(machine.id))}`,
      changefreq: 'weekly',
      priority: '0.8',
    })
  }

  let xml = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  for (const page of pages) {
    xml += '  <url>\n'
    xml += `    <loc>${escapeXml(page.loc)}</loc>\n`
    xml += `    <lastmod>${lastmod}</lastmod>\n`
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`
    xml += `    <priority>${page.priority}</priority>\n`
    xml += '  </url>\n'
  }
  xml += '</urlset>'
  return xml
}

export function buildSitemapTxt(dbPath) {
  const xml = buildSitemapXml(dbPath)
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  return locs.join('\n') + '\n'
}

const isMain = process.argv[1] && path.basename(process.argv[1].replace(/\\/g, '/')) === 'write-sitemap.mjs'
if (isMain) {
  const dbCandidates = [
    path.join(root, 'data', 'db.json'),
    path.join(root, 'php', 'seed.json'),
  ]
  const dbPath = dbCandidates.find((item) => fs.existsSync(item))
  const xml = buildSitemapXml(dbPath || '')
  fs.writeFileSync(path.join(root, 'public', 'sitemap.xml'), xml)
  fs.writeFileSync(path.join(root, 'public', 'sitemap.txt'), buildSitemapTxt(dbPath || ''))
  console.log('Wrote public/sitemap.xml and public/sitemap.txt')
}
