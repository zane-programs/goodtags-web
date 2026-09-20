import { cp, mkdir } from 'node:fs/promises'
for (const [source, destination] of [['audio', 'audio'], ['fonts', 'fonts'], ['generated_db', 'data']]) {
  await mkdir(`public/${destination}`, { recursive: true })
  await cp(`src/assets/${source}`, `public/${destination}`, { recursive: true })
}
