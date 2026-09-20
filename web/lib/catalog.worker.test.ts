// @vitest-environment node
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Database, SqlJsStatic } from 'sql.js'
const storage = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }))
vi.mock('idb-keyval', () => storage)
vi.mock('sql.js', async importOriginal => {
  const actual = await importOriginal<typeof import('sql.js')>()
  return {
    default: () =>
      actual.default({ locateFile: () => resolve('node_modules/sql.js/dist/sql-wasm.wasm') }),
  }
})
let SQL: SqlJsStatic
let bytes: Uint8Array
let responder: ReturnType<typeof vi.fn>
let host: {
  onmessage?: (event: { data: Record<string, unknown> }) => void
  postMessage: ReturnType<typeof vi.fn>
}
let sequence = 0
const manifest = {
  generated_at_epoch_seconds: 1,
  db_name_by_version: { '1': 'tags_db_v1.sqlite.otf' },
}
beforeAll(async () => {
  const { default: init } = await import('sql.js')
  SQL = await init()
  bytes = new Uint8Array(readFileSync('src/assets/generated_db/tags_db.sqlite'))
})
beforeEach(async () => {
  vi.resetModules()
  storage.get.mockReset().mockResolvedValue(undefined)
  storage.set.mockReset().mockResolvedValue(undefined)
  host = { postMessage: vi.fn() }
  vi.stubGlobal('self', host)
  responder = vi.fn(async (url: string) => {
    if (url.endsWith('manifest.json')) return new Response(JSON.stringify(manifest))
    return new Response(bytes.slice())
  })
  vi.stubGlobal('fetch', responder)
  await import('./catalog.worker')
})
afterEach(() => vi.unstubAllGlobals())
async function request(action: string, params = {}, force = false) {
  const id = ++sequence
  host.onmessage!({ data: { id, action, params, force } })
  await vi.waitFor(
    () => expect(host.postMessage.mock.calls.some(([message]) => message.id === id)).toBe(true),
    { timeout: 5000 },
  )
  return host.postMessage.mock.calls.find(([message]) => message.id === id)![0]
}
describe('catalog worker recovery and atomic updates', () => {
  it('falls back to the bundled catalog when the stored database cannot open', async () => {
    storage.get.mockResolvedValue({ bytes: new Uint8Array([0, 1, 2]), timestamp: 2 })
    expect((await request('search', { id: 1 })).result.tags[0].title).toBe('Smile')
  })
  it('allows retry after a failed first catalog download', async () => {
    responder.mockImplementationOnce(async () => {
      throw new Error('Network unavailable')
    })
    expect((await request('search', { id: 1 })).error).toContain('Network unavailable')
    expect((await request('search', { id: 1 })).result.tags[0].id).toBe(1)
  })
  it('keeps the working catalog if a refreshed download is invalid', async () => {
    await request('search', { id: 1 })
    responder.mockImplementation(async (url: string) =>
      url.endsWith('manifest.json')
        ? new Response(JSON.stringify({ ...manifest, generated_at_epoch_seconds: 2 }))
        : new Response('broken database'),
    )
    expect((await request('refresh', {}, true)).error).toBeTruthy()
    expect((await request('search', { id: 1 })).result.tags[0].title).toBe('Smile')
    expect(storage.set).not.toHaveBeenCalled()
  })
  it('keeps the current catalog when IndexedDB cannot commit an update', async () => {
    await request('search', { id: 1 })
    storage.set.mockRejectedValue(new Error('Quota exceeded'))
    expect((await request('refresh', {}, true)).error).toContain('Quota exceeded')
    expect((await request('search', { id: 1 })).result.tags[0].title).toBe('Smile')
  })
  it('adopts a validated forced update only after persistence succeeds', async () => {
    await request('search', { id: 1 })
    const next: Database = new SQL.Database(bytes)
    next.run("UPDATE tags SET title = 'Updated Smile' WHERE id = 1")
    next.run("INSERT INTO tags_fts(tags_fts) VALUES ('rebuild')")
    const updated = next.export()
    next.close()
    responder.mockImplementation(async (url: string) =>
      url.endsWith('manifest.json')
        ? new Response(JSON.stringify({ ...manifest, generated_at_epoch_seconds: 2 }))
        : new Response(new Uint8Array(updated)),
    )
    expect((await request('refresh', {}, true)).result).toBe('updated')
    expect(storage.set).toHaveBeenCalledOnce()
    expect((await request('search', { id: 1 })).result.tags[0].title).toBe('Updated Smile')
  })
})
