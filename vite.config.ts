import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxy: ProxyOptions = {
  target: 'http://127.0.0.1:5174',
  changeOrigin: true,
  configure(proxy) {
    proxy.on('error', (_err, _req, res) => {
      const socket = res as { writeHead?: Function; end?: Function; headersSent?: boolean }
      if (socket.writeHead && socket.end && !socket.headersSent) {
        socket.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
        socket.end(
          JSON.stringify({
            error: 'API не запущен. Выполните yarn server (нужен PHP) и обновите страницу.',
          }),
        )
      }
    })
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': apiProxy,
      '/uploads': { target: 'http://127.0.0.1:5174', changeOrigin: true },
    },
  },
  preview: {
    host: '127.0.0.1',
    proxy: {
      '/api': apiProxy,
      '/uploads': { target: 'http://127.0.0.1:5174', changeOrigin: true },
    },
  },
})
