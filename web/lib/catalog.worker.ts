import initSqlJs, { type Database } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { get, set } from 'idb-keyval'
import { search, validateDatabase } from './queries'
import type { SearchParams } from './types'
const REMOTE = 'https://kamatsuoka.github.io/goodtags'
interface Snapshot {
  bytes: Uint8Array
  timestamp: number
}
let database: Database | undefined
let timestamp = 0
let opening: Promise<Database> | undefined
let sqlPromise: ReturnType<typeof initSqlJs> | undefined
function getSql() {
  if (!sqlPromise)
    sqlPromise = initSqlJs({ locateFile: () => wasmUrl }).catch(error => {
      sqlPromise = undefined
      throw error
    })
  return sqlPromise
}
async function open() {
  if (database) return database
  if (opening) return opening
  opening = (async () => {
    const SQL = await getSql()
    const bundled = await fetch('/data/manifest.json').then(r => r.json())
    const cached = await get<Snapshot>('catalog').catch(() => undefined)
    if (cached && cached.timestamp >= bundled.generated_at_epoch_seconds) {
      let candidate: Database | undefined
      try {
        candidate = new SQL.Database(cached.bytes)
        validateDatabase(candidate)
        database = candidate
        timestamp = cached.timestamp
        return candidate
      } catch {
        candidate?.close()
      }
    }
    const response = await fetch('/data/tags_db.sqlite')
    if (!response.ok) throw new Error('Could not load the tag catalog. Reconnect and retry.')
    const candidate = new SQL.Database(new Uint8Array(await response.arrayBuffer()))
    try {
      validateDatabase(candidate)
    } catch (error) {
      candidate.close()
      throw error
    }
    database = candidate
    timestamp = bundled.generated_at_epoch_seconds
    return candidate
  })()
  try {
    return await opening
  } finally {
    opening = undefined
  }
}
async function refresh(force: boolean) {
  await open()
  const manifest = await fetch(`${REMOTE}/manifest.json`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  }).then(r => {
    if (!r.ok) throw new Error('Catalog server unavailable')
    return r.json()
  })
  if (
    !Number.isSafeInteger(manifest.generated_at_epoch_seconds) ||
    manifest.generated_at_epoch_seconds <= 0
  )
    throw new Error('Invalid catalog manifest')
  const filename = manifest.db_name_by_version?.['1']
  if (!filename || !/^tags_db_v1\.sqlite(?:\.otf)?$/.test(filename))
    throw new Error('No compatible catalog available')
  if (!force && manifest.generated_at_epoch_seconds <= timestamp) return 'up-to-date'
  const response = await fetch(`${REMOTE}/${filename}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(60000),
  })
  if (!response.ok) throw new Error('Catalog download failed')
  const bytes = new Uint8Array(await response.arrayBuffer())
  const SQL = await getSql()
  const candidate = new SQL.Database(bytes)
  try {
    validateDatabase(candidate)
    const oldCount = search(database!, { limit: 0 }).total
    if (search(candidate, { limit: 0 }).total < oldCount * 0.9)
      throw new Error('Downloaded catalog is incomplete')
    await set('catalog', { bytes, timestamp: manifest.generated_at_epoch_seconds })
  } catch (error) {
    candidate.close()
    throw error
  }
  // Background downloads are adopted next launch; explicit refresh adopts immediately.
  if (force) {
    database?.close()
    database = candidate
    timestamp = manifest.generated_at_epoch_seconds
  } else candidate.close()
  return 'updated'
}
let refreshQueue: Promise<unknown> = Promise.resolve()
function requestRefresh(force: boolean) {
  const next = refreshQueue.then(() => refresh(force))
  refreshQueue = next.catch(() => {})
  return next
}
// Serialize updates with queries so a database cannot be closed during a read.
let queue = Promise.resolve()
self.onmessage = (
  event: MessageEvent<{
    id: number
    action: 'search' | 'refresh'
    params: SearchParams
    force?: boolean
  }>,
) => {
  if (event.data.action === 'refresh' && !event.data.force) {
    // Download in parallel with reads. This path never swaps the live database.
    void requestRefresh(false)
      .then(result => self.postMessage({ id: event.data.id, result }))
      .catch(error => self.postMessage({ id: event.data.id, error: String(error) }))
    return
  }
  queue = queue.then(async () => {
    const { id, action, params, force } = event.data
    try {
      const result =
        action === 'refresh' ? await requestRefresh(Boolean(force)) : search(await open(), params)
      self.postMessage({ id, result })
    } catch (error) {
      self.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
    }
  })
}
