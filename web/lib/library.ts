import { emptyLibrary, type Library, type Tag } from './types'
export interface Backup {
  favorites: { id: number; title: string }[]
  labels: { label: string; tags: { id: number; title: string }[] }[]
  date: string
}
function idsFrom(value: unknown): number[] {
  if (!Array.isArray(value)) throw new Error('Expected a list of tags')
  return [
    ...new Set(
      value.map(item => {
        if (!item || !Number.isSafeInteger(item.id) || item.id <= 0)
          throw new Error('A tag has an invalid ID')
        return item.id as number
      }),
    ),
  ]
}
export function importBackup(text: string, current: Library): Library {
  if (text.length > 5_000_000) throw new Error('Backup is too large (maximum 5 MB)')
  const data = JSON.parse(text)
  if (!data || typeof data !== 'object' || (!('favorites' in data) && !('labels' in data)))
    throw new Error('This is not a goodtags backup')
  const favorites = idsFrom(data.favorites ?? [])
  if (!Array.isArray(data.labels ?? [])) throw new Error('Invalid labels')
  const next = structuredClone(current)
  for (const id of favorites)
    if (!next.favorites.some(f => f.id === id))
      next.favorites.push({ id, addedDate: new Date().toISOString() })
  for (const entry of data.labels ?? []) {
    if (typeof entry?.label !== 'string' || !entry.label.trim() || entry.label.length > 200)
      throw new Error('Invalid label name')
    const name = entry.label.trim(),
      ids = idsFrom(entry.tags)
    const existing = next.labels.find(l => l.name === name)
    if (existing) existing.ids = [...new Set([...existing.ids, ...ids])]
    else next.labels.push({ name, ids })
  }
  return next
}
export function exportBackup(library: Library, tags: Tag[]): Backup {
  const byId = new Map(tags.map(t => [t.id, t.title]))
  const tag = (id: number) => ({ id, title: byId.get(id) || `Tag ${id}` })
  return {
    favorites: library.favorites.map(f => tag(f.id)),
    labels: library.labels.map(l => ({ label: l.name, tags: l.ids.map(tag) })),
    date: new Date().toISOString(),
  }
}
export function visit(library: Library, id: number): Library {
  return { ...library, history: [id, ...library.history.filter(i => i !== id)].slice(0, 50) }
}
export function toggleFavorite(library: Library, id: number): Library {
  return {
    ...library,
    favorites: library.favorites.some(f => f.id === id)
      ? library.favorites.filter(f => f.id !== id)
      : [...library.favorites, { id, addedDate: new Date().toISOString() }],
  }
}
export function renameLabel(library: Library, name: string, newName: string): Library {
  const clean = newName.trim()
  if (!clean || clean.length > 200) throw new Error('Enter a label name (up to 200 characters)')
  if (clean !== name && library.labels.some(l => l.name === clean))
    throw new Error('That label already exists')
  return {
    ...library,
    labels: library.labels.map(l => (l.name === name ? { ...l, name: clean } : l)),
  }
}
export function readLibrary(raw: string | null): Library {
  if (!raw) return emptyLibrary()
  const value = JSON.parse(raw)
  if (
    value?.version !== 1 ||
    !Array.isArray(value.favorites) ||
    !Array.isArray(value.labels) ||
    !Array.isArray(value.history)
  )
    throw new Error('Saved library could not be read')
  idsFrom(value.favorites)
  if (
    value.favorites.some(
      (favorite: { addedDate: unknown }) => typeof favorite.addedDate !== 'string',
    )
  )
    throw new Error('Invalid saved favorite dates')
  for (const label of value.labels) {
    if (typeof label.name !== 'string' || !Array.isArray(label.ids))
      throw new Error('Invalid saved labels')
    idsFrom(label.ids.map((id: number) => ({ id })))
  }
  idsFrom(value.history.map((id: number) => ({ id })))
  const defaults = emptyLibrary()
  const options = { ...defaults.options, ...value.options }
  if (Object.values(options).some(option => typeof option !== 'boolean'))
    throw new Error('Invalid saved preferences')
  if (!['AllParts', 'Tenor', 'Lead', 'Bari', 'Bass'].includes(value.selectedPart ?? 'AllParts'))
    throw new Error('Invalid saved voice part')
  return { ...defaults, ...value, options }
}
