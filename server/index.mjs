import express from 'express'
import { fileURLToPath } from 'node:url'
import { mediaHandler } from './media.mjs'
const app = express()
app.disable('x-powered-by')
app.get('/media', mediaHandler)
app.use(
  express.static(fileURLToPath(new URL('../dist', import.meta.url)), {
    setHeaders(res, path) {
      if (path.endsWith('sw.js') || path.endsWith('index.html') || path.endsWith('.webmanifest'))
        res.setHeader('Cache-Control', 'no-cache')
    },
  }),
)
app.get('/{*path}', (_req, res) =>
  res.sendFile(fileURLToPath(new URL('../dist/index.html', import.meta.url))),
)
const port = Number(process.env.PORT || 4173)
const server = app.listen(port, () => {
  const address = server.address()
  const listeningPort = typeof address === 'object' && address ? address.port : port
  console.log(`goodtags: http://localhost:${listeningPort}`)
  if (process.send) process.send({ port: listeningPort })
})
