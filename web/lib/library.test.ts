import { describe, expect, it } from 'vitest'
import { emptyLibrary } from './types'
import {
  exportBackup,
  importBackup,
  readLibrary,
  renameLabel,
  toggleFavorite,
  visit,
} from './library'
describe('native-compatible backups', () => {
  it('merges favorites and independent labels without losing existing data', () => {
    const initial = toggleFavorite(emptyLibrary(), 1)
    initial.labels = [{ name: 'Quartet', ids: [2] }]
    const merged = importBackup(
      JSON.stringify({
        favorites: [{ id: 3, title: 'New' }],
        labels: [
          { label: 'Quartet', tags: [{ id: 4 }] },
          { label: '__proto__', tags: [{ id: 5 }] },
        ],
      }),
      initial,
    )
    expect(merged.favorites.map(f => f.id)).toEqual([1, 3])
    expect(merged.labels).toEqual([
      { name: 'Quartet', ids: [2, 4] },
      { name: '__proto__', ids: [5] },
    ])
    expect(initial.labels[0].ids).toEqual([2])
    const roundTrip = importBackup(JSON.stringify(exportBackup(merged, [])), emptyLibrary())
    expect(roundTrip.labels).toEqual(merged.labels)
    expect(roundTrip.favorites.map(f => f.id)).toEqual([1, 3])
  })
  it('supports labels-only and favorites-only backups', () => {
    expect(importBackup('{"labels":[]}', emptyLibrary()).favorites).toEqual([])
    expect(importBackup('{"favorites":[{"id":7}]}', emptyLibrary()).favorites[0].id).toBe(7)
  })
  it.each([
    '{}',
    'null',
    '{"favorites":[{"id":-2}]}',
    '{"favorites":[{"id":"1"}]}',
    '{"labels":[{"label":" ","tags":[]}]}',
    '{"labels":{}}',
    'bad json',
  ])('rejects malformed backups atomically: %s', raw => {
    const initial = toggleFavorite(emptyLibrary(), 10)
    expect(() => importBackup(raw, initial)).toThrow()
    expect(initial.favorites.map(f => f.id)).toEqual([10])
  })
  it('preserves unavailable IDs rather than silently discarding them', () => {
    const next = importBackup('{"favorites":[{"id":999999}]}', emptyLibrary())
    expect(exportBackup(next, []).favorites[0].id).toBe(999999)
  })
})
describe('library behavior', () => {
  it('keeps labels when a favorite is removed', () => {
    const state = toggleFavorite(emptyLibrary(), 1)
    state.labels = [{ name: 'Learn', ids: [1] }]
    expect(toggleFavorite(state, 1).labels).toEqual(state.labels)
  })
  it('deduplicates and caps history at the native limit of 50', () => {
    let state = emptyLibrary()
    for (let id = 1; id <= 60; id++) state = visit(state, id)
    state = visit(state, 22)
    expect(state.history).toHaveLength(50)
    expect(state.history[0]).toBe(22)
    expect(new Set(state.history).size).toBe(50)
  })
  it('rejects label collisions and trims renamed labels', () => {
    const state = emptyLibrary()
    state.labels = [
      { name: 'One', ids: [1] },
      { name: 'Two', ids: [2] },
    ]
    expect(() => renameLabel(state, 'One', 'Two')).toThrow('already exists')
    expect(renameLabel(state, 'One', ' Three ').labels[0]).toEqual({ name: 'Three', ids: [1] })
  })
  it('rejects corrupted storage and retains defaults for absent options', () => {
    expect(() => readLibrary('{"version":3}')).toThrow()
    expect(readLibrary(null)).toEqual(emptyLibrary())
    expect(readLibrary(JSON.stringify(emptyLibrary())).options.serifs).toBe(true)
  })
})
