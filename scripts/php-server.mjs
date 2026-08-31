import fs from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = process.argv[2] === 'dist' ? 'dist' : 'public'
const docRoot = path.join(root, target)
const port = process.env.PORT || '5174'
const host = process.env.HOST || '0.0.0.0'
const router = path.join(docRoot, 'router.php')

const args = ['-S', `${host}:${port}`, '-t', docRoot]
if (target === 'dist' && fs.existsSync(router)) {
  args.push(router)
}

const child = spawn('php', args, {
  stdio: 'inherit',
  cwd: root,
  windowsHide: true,
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
