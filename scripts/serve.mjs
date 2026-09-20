// Serves the production build exactly as it is deployed: the real Worker and its static
// assets on workerd, through `wrangler dev`. Used by `yarn start` and the browser tests.
// PORT=0 picks a free port; the chosen port is reported to a parent process, if any.
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

const port = Number(process.env.PORT ?? 4173) || (await freePort())
const wrangler = spawn(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url)),
    'dev',
    '--port',
    String(port),
    '--inspector-port',
    String(await freePort()),
    '--show-interactive-dev-session=false',
  ],
  {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  },
)
wrangler.once('exit', code => process.exit(code ?? 1))
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => wrangler.kill(signal))
}

for (let attempt = 0; attempt < 300; attempt++) {
  try {
    await fetch(`http://localhost:${port}/manifest.webmanifest`)
    console.log(`goodtags: http://localhost:${port}`)
    if (process.send) process.send({ port })
    break
  } catch {
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
