import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = process.argv[2] === 'dist' ? 'dist' : 'public'
const docRoot = path.join(root, target)
const port = process.env.PORT || '5174'
const host = process.env.HOST || '0.0.0.0'

const child = spawn('php', ['-S', `${host}:${port}`, '-t', docRoot, 'router.php'], {
  stdio: 'inherit',
  cwd: docRoot,
  windowsHide: true,
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
