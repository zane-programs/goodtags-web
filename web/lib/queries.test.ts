// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import initSqlJs, { type Database } from 'sql.js'
import { readFileSync } from 'node:fs'
import { search, validateDatabase } from './queries'
let db: Database
beforeAll(async () => {
  const SQL = await initSqlJs()
  db = new SQL.Database(readFileSync('src/assets/generated_db/tags_db.sqlite'))
})
afterAll(() => db.close())
describe('real bundled catalog', () => {
  it('validates schema, integrity, FTS, and the minimum record count', () => {
    expect(() => validateDatabase(db)).not.toThrow()
    expect(search(db, { limit: 0 }).total).toBeGreaterThan(7000)
  })
  it('loads tracks and videos with browser model field names', () => {
    const tag = search(db, { id: 1 }).tags[0]
    expect(tag.title).toBe('Smile')
    expect(tag.tracks).toHaveLength(5)
    expect(tag.tracks[0]).toMatchObject({ fileType: 'mp3', part: 'AllParts' })
    expect(tag.tracks[0].url).toContain('https:')
  })
  it('matches numeric IDs even if filters exclude them, like native search', () => {
    expect(
      search(db, { query: '1', parts: 6, collection: 'easytags' }).tags.some(t => t.id === 1),
    ).toBe(true)
  })
  it('supports partial full-text search and safely handles punctuation', () => {
    expect(search(db, { query: 'smil' }).total).toBeGreaterThan(0)
    expect(() => search(db, { query: "love'); DROP TABLE tags;--" })).not.toThrow()
    expect(search(db, { query: '!!!' }).total).toBeGreaterThan(7000)
  })
  it('combines collection, parts, scores, and learning track filters', () => {
    const { tags } = search(db, {
      collection: 'classic',
      parts: 4,
      sheetMusic: true,
      learningTracks: true,
      limit: 125,
    })
    expect(tags.length).toBeGreaterThan(0)
    expect(
      tags.every(t => t.collection === 'classic' && t.parts === 4 && t.uri && t.tracks.length),
    ).toBe(true)
  })
  it('paginates with stable sort order and correct totals', () => {
    const first = search(db, { sort: 'newest', limit: 33 }),
      next = search(db, { sort: 'newest', limit: 33, offset: 33 })
    expect(first.tags).toHaveLength(33)
    expect(next.tags).toHaveLength(33)
    expect(first.total).toBe(next.total)
    expect(first.tags.some(t => next.tags.some(n => n.id === t.id))).toBe(false)
  })
  it('returns no records for empty saved lists and exact records for IDs', () => {
    expect(search(db, { ids: [] })).toEqual({ tags: [], total: 0 })
    expect(search(db, { ids: [1, 2], sort: 'id' }).tags.map(t => t.id)).toEqual([1, 2])
  })
  it('only chooses random tags with scores when requested', () => {
    expect(search(db, { random: true, sheetMusic: true, limit: 1 }).tags[0].uri).toBeTruthy()
  })
})
