import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createSeed } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const dbPath = path.join(dataDir, 'db.json')

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(createSeed(), null, 2), 'utf8')
  }
}

export function readDb() {
  ensureDb()
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'))
}

export function writeDb(db) {
  ensureDb()
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8')
}

export function updateDb(mutator) {
  const db = readDb()
  const next = mutator(db) ?? db
  writeDb(next)
  return next
}
