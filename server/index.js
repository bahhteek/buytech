import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import nodemailer from 'nodemailer'
import { readDb, updateDb } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const uploadsDir = path.join(rootDir, 'public', 'uploads')

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const app = express()
const PORT = process.env.PORT || 5174
const ADMIN_USER = process.env.ADMIN_USER || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'buytech-admin'
const tokens = new Set()

app.use(cors())
app.use(express.json({ limit: '5mb' }))
app.use((_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  next()
})
app.use('/uploads', express.static(uploadsDir))
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /\n')
})

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${Date.now()}-${randomUUID()}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype) || /^video\//.test(file.mimetype)) cb(null, true)
    else cb(new Error('Only images and videos allowed'))
  },
})

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

async function sendLeadEmail(lead) {
  const to = process.env.LEADS_EMAIL || process.env.SMTP_USER
  if (!process.env.SMTP_HOST || !to) {
    console.log('[mail] SMTP not configured. Lead saved:', lead.id)
    return { sent: false, reason: 'smtp_not_configured' }
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Заявка BuyTech: ${lead.name}`,
    text: [
      `Имя: ${lead.name}`,
      `Телефон: ${lead.phone}`,
      `Email: ${lead.email || '—'}`,
      `Техника: ${lead.need || '—'}`,
      `Дата: ${lead.createdAt}`,
    ].join('\n'),
  })

  return { sent: true }
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/public', (_req, res) => {
  const db = readDb()
  res.json({
    content: db.content,
    brands: db.brands,
    categories: db.categories,
    machines: db.machines,
  })
})

app.post('/api/leads', async (req, res) => {
  const { name, phone, email = '', need = '' } = req.body || {}
  if (!name || !phone) {
    return res.status(400).json({ error: 'name and phone are required' })
  }

  const lead = {
    id: randomUUID(),
    name: String(name).trim(),
    phone: String(phone).trim(),
    email: String(email).trim(),
    need: String(need).trim(),
    createdAt: new Date().toISOString(),
    status: 'new',
  }

  updateDb((db) => {
    db.leads.unshift(lead)
    return db
  })

  let mail = { sent: false }
  try {
    mail = await sendLeadEmail(lead)
  } catch (error) {
    console.error('[mail] failed', error)
    mail = { sent: false, reason: 'send_failed' }
  }

  res.status(201).json({ lead, mail })
})

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {}
  if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Неверный логин или пароль' })
  }
  const token = randomUUID()
  tokens.add(token)
  res.json({ token })
})

app.post('/api/admin/logout', auth, (req, res) => {
  const header = req.headers.authorization || ''
  const token = header.slice(7)
  tokens.delete(token)
  res.json({ ok: true })
})

app.get('/api/admin/leads', auth, (_req, res) => {
  const db = readDb()
  res.json(db.leads)
})

app.patch('/api/admin/leads/:id', auth, (req, res) => {
  const { status } = req.body || {}
  let updated = null
  updateDb((db) => {
    const lead = db.leads.find((item) => item.id === req.params.id)
    if (!lead) return db
    if (status) lead.status = status
    updated = lead
    return db
  })
  if (!updated) return res.status(404).json({ error: 'Not found' })
  res.json(updated)
})

app.delete('/api/admin/leads/:id', auth, (req, res) => {
  updateDb((db) => {
    db.leads = db.leads.filter((item) => item.id !== req.params.id)
    return db
  })
  res.json({ ok: true })
})

app.put('/api/admin/content', auth, (req, res) => {
  const content = req.body
  if (!content || typeof content !== 'object') {
    return res.status(400).json({ error: 'Invalid content' })
  }
  updateDb((db) => {
    db.content = content
    return db
  })
  res.json(content)
})

app.get('/api/admin/brands', auth, (_req, res) => {
  res.json(readDb().brands)
})

app.post('/api/admin/brands', auth, (req, res) => {
  const name = String(req.body?.name || '').trim()
  if (!name) return res.status(400).json({ error: 'name required' })
  const brand = { id: randomUUID(), name }
  updateDb((db) => {
    db.brands.push(brand)
    return db
  })
  res.status(201).json(brand)
})

app.put('/api/admin/brands/:id', auth, (req, res) => {
  const name = String(req.body?.name || '').trim()
  let updated = null
  updateDb((db) => {
    const brand = db.brands.find((item) => item.id === req.params.id)
    if (!brand) return db
    brand.name = name || brand.name
    updated = brand
    db.machines = db.machines.map((machine) =>
      machine.brandId === brand.id ? { ...machine, brand: brand.name } : machine,
    )
    return db
  })
  if (!updated) return res.status(404).json({ error: 'Not found' })
  res.json(updated)
})

app.delete('/api/admin/brands/:id', auth, (req, res) => {
  updateDb((db) => {
    db.brands = db.brands.filter((item) => item.id !== req.params.id)
    return db
  })
  res.json({ ok: true })
})

app.post('/api/admin/categories', auth, (req, res) => {
  const title = String(req.body?.title || '').trim()
  const hint = String(req.body?.hint || '').trim()
  const image = String(req.body?.image || '/images/excavator.jpg')
  if (!title) return res.status(400).json({ error: 'title required' })
  const category = {
    id: req.body?.id ? String(req.body.id) : randomUUID(),
    title,
    hint,
    image,
  }
  updateDb((db) => {
    db.categories.push(category)
    return db
  })
  res.status(201).json(category)
})

app.put('/api/admin/categories/:id', auth, (req, res) => {
  let updated = null
  updateDb((db) => {
    const category = db.categories.find((item) => item.id === req.params.id)
    if (!category) return db
    if (req.body.title != null) category.title = String(req.body.title)
    if (req.body.hint != null) category.hint = String(req.body.hint)
    if (req.body.image != null) category.image = String(req.body.image)
    updated = category
    return db
  })
  if (!updated) return res.status(404).json({ error: 'Not found' })
  res.json(updated)
})

app.delete('/api/admin/categories/:id', auth, (req, res) => {
  updateDb((db) => {
    db.categories = db.categories.filter((item) => item.id !== req.params.id)
    return db
  })
  res.json({ ok: true })
})

app.post('/api/admin/machines', auth, (req, res) => {
  const body = req.body || {}
  const db = readDb()
  const brand = db.brands.find((item) => item.id === body.brandId)
  const category = db.categories.find((item) => item.id === body.categoryId)
  if (!body.name || !brand || !category) {
    return res.status(400).json({ error: 'name, brandId, categoryId required' })
  }

  const machine = {
    id: randomUUID(),
    name: String(body.name),
    brandId: brand.id,
    brand: brand.name,
    category: String(body.category || category.title),
    categoryId: category.id,
    year: Number(body.year) || new Date().getFullYear(),
    condition: String(body.condition || 'Новый'),
    price: String(body.price || ''),
    priceFrom: Number(body.priceFrom) || 0,
    images: Array.isArray(body.images) && body.images.length ? body.images : ['/images/excavator.jpg'],
    videoUrl: String(body.videoUrl || ''),
    description: String(body.description || ''),
    specs: Array.isArray(body.specs)
      ? body.specs.map((spec) => ({
          id: spec.id || randomUUID(),
          label: String(spec.label || ''),
          value: String(spec.value || ''),
        }))
      : [],
    relatedIds: Array.isArray(body.relatedIds)
      ? [...new Set(body.relatedIds.map(String))].filter(Boolean)
      : [],
  }

  updateDb((store) => {
    store.machines.unshift(machine)
    return store
  })
  res.status(201).json(machine)
})

app.put('/api/admin/machines/:id', auth, (req, res) => {
  const body = req.body || {}
  let updated = null
  updateDb((db) => {
    const index = db.machines.findIndex((item) => item.id === req.params.id)
    if (index < 0) return db
    const current = db.machines[index]
    const brand = body.brandId
      ? db.brands.find((item) => item.id === body.brandId)
      : db.brands.find((item) => item.id === current.brandId)
    const category = body.categoryId
      ? db.categories.find((item) => item.id === body.categoryId)
      : db.categories.find((item) => item.id === current.categoryId)

    updated = {
      ...current,
      ...body,
      id: current.id,
      brandId: brand?.id || current.brandId,
      brand: brand?.name || current.brand,
      categoryId: category?.id || current.categoryId,
      category: body.category || category?.title || current.category,
      year: Number(body.year ?? current.year),
      priceFrom: Number(body.priceFrom ?? current.priceFrom),
      images:
        Array.isArray(body.images) && body.images.length ? body.images : current.images,
      specs: Array.isArray(body.specs)
        ? body.specs.map((spec) => ({
            id: spec.id || randomUUID(),
            label: String(spec.label || ''),
            value: String(spec.value || ''),
          }))
        : current.specs,
      relatedIds: Array.isArray(body.relatedIds)
        ? [...new Set(body.relatedIds.map(String))].filter((id) => id && id !== current.id)
        : current.relatedIds || [],
    }
    db.machines[index] = updated
    return db
  })
  if (!updated) return res.status(404).json({ error: 'Not found' })
  res.json(updated)
})

app.delete('/api/admin/machines/:id', auth, (req, res) => {
  updateDb((db) => {
    db.machines = db.machines.filter((item) => item.id !== req.params.id)
    return db
  })
  res.json({ ok: true })
})

app.post('/api/admin/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' })
  res.status(201).json({ url: `/uploads/${req.file.filename}` })
})

const distDir = path.join(rootDir, 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: error.message || 'Server error' })
})

const server = app.listen(PORT, () => {
  console.log(`BuyTech http://localhost:${PORT}`)
  console.log(`Admin user: ${ADMIN_USER}`)
})

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process and retry.`)
  } else {
    console.error(error)
  }
  process.exit(1)
})
