import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const phpSrc = path.join(root, 'php')
const apiDest = path.join(dist, 'api')
const dataDest = path.join(dist, 'data')
const uploadsDest = path.join(dist, 'uploads')

if (!fs.existsSync(dist)) {
  throw new Error('dist/ not found. Run vite build first.')
}

function copyDir(src, dest, skip = []) {
  fs.mkdirSync(dest, { recursive: true })
  for (const name of fs.readdirSync(src)) {
    if (skip.includes(name)) continue
    const from = path.join(src, name)
    const to = path.join(dest, name)
    const stat = fs.statSync(from)
    if (stat.isDirectory()) {
      copyDir(from, to, skip)
    } else {
      fs.copyFileSync(from, to)
    }
  }
}

copyDir(phpSrc, apiDest, ['dev-router.php'])

const example = path.join(apiDest, 'config.example.php')
const config = path.join(apiDest, 'config.php')
if (!fs.existsSync(config) && fs.existsSync(example)) {
  fs.copyFileSync(example, config)
}

fs.mkdirSync(dataDest, { recursive: true })
fs.copyFileSync(path.join(root, 'data', '.htaccess'), path.join(dataDest, '.htaccess'))

const dbCandidates = [
  path.join(root, 'data', 'db.json'),
  path.join(root, 'server', 'data', 'db.json'),
  path.join(root, 'php', 'seed.json'),
]
for (const candidate of dbCandidates) {
  if (fs.existsSync(candidate)) {
    fs.copyFileSync(candidate, path.join(dataDest, 'db.json'))
    break
  }
}

fs.mkdirSync(uploadsDest, { recursive: true })
const uploadsSrc = path.join(root, 'public', 'uploads')
if (fs.existsSync(uploadsSrc)) {
  copyDir(uploadsSrc, uploadsDest)
}

console.log('PHP API copied to dist/api')
