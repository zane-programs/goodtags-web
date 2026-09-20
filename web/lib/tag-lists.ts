import { useSyncExternalStore } from 'react'
import type { Sort, Tag } from './types'

/**
 * Shared tag-list state, the web counterpart of the native redux list slices. A list screen
 * publishes its ordered tags here; the tag screen pushed above it reads the same list to
 * step to the previous/next tag and to mark which row was last opened.
 */
export type LoadingState = 'idle' | 'pending' | 'morePending' | 'succeeded' | 'failed'

export interface TagListState {
  tags: Tag[]
  total: number
  status: LoadingState
  error: string
  selectedId?: number
  /** Set when the tag screen closes, so the list can bring the selected row into view. */
  closedAt?: number
}

const empty: TagListState = { tags: [], total: 0, status: 'idle', error: '' }
const lists = new Map<string, TagListState>()
const listeners = new Set<() => void>()

export function getTagList(path: string) {
  return lists.get(path) ?? empty
}

export function setTagList(path: string, patch: Partial<TagListState>) {
  lists.set(path, { ...getTagList(path), ...patch })
  listeners.forEach(listener => listener())
}

export function useTagList(path: string) {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => getTagList(path),
  )
}

/** Sort orders persist between sessions, as they do natively. */
const SORT_KEY = 'goodtags.sort.v1'

export function readSort(path: string, fallback: Sort): Sort {
  try {
    const saved = JSON.parse(localStorage.getItem(SORT_KEY) || '{}')[path]
    return ['alpha', 'downloads', 'newest', 'id'].includes(saved) ? saved : fallback
  } catch {
    return fallback
  }
}

export function writeSort(path: string, sort: Sort) {
  try {
    const saved = JSON.parse(localStorage.getItem(SORT_KEY) || '{}')
    localStorage.setItem(SORT_KEY, JSON.stringify({ ...saved, [path]: sort }))
  } catch {
    /* the preference simply is not remembered */
  }
}

export function sortTags(tags: Tag[], sort: Sort): Tag[] {
  const result = [...tags]
  if (sort === 'alpha')
    result.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
  if (sort === 'id') result.sort((a, b) => a.id - b.id)
  if (sort === 'downloads') result.sort((a, b) => b.downloaded - a.downloaded || a.id - b.id)
  if (sort === 'newest') result.sort((a, b) => b.posted.localeCompare(a.posted) || b.id - a.id)
  return result
}
