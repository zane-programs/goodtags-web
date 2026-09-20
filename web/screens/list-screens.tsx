import { useCallback, useEffect, useRef, useState } from 'react'
import {
  mdiBroom,
  mdiHeartOutline,
  mdiHistory,
  mdiLeaf,
  mdiPillar,
  mdiReload,
  mdiStar,
  mdiTagOutline,
  mdiTeddyBear,
} from '@mdi/js'
import { searchCatalog } from '@/lib/catalog'
import { useLibrary } from '@/lib/store'
import type { SearchParams, Sort } from '@/lib/types'
import { getTagList, readSort, setTagList, sortTags, writeSort } from '@/lib/tag-lists'
import { useIsFocused, useRoute } from '@/navigation/navigator'
import type { CollectionKind } from '@/navigation/routes'
import { ListScreen, sortActions, sortIcons, sortLabels } from '@/components/list-screen'
import { ConfirmDrawer } from '@/components/ui/drawer'

const getTags = (listPath: string) => getTagList(listPath).tags

function useSort(listPath: string, fallback: Sort) {
  const [sort, setSortState] = useState(() => readSort(listPath, fallback))
  const setSort = useCallback(
    (next: Sort) => {
      writeSort(listPath, next)
      setSortState(next)
    },
    [listPath],
  )
  return [sort, setSort] as const
}

/** Loads `params` into the shared list at `listPath`, then keeps it ordered by `sort`. */
function useLoadedList(listPath: string, params: SearchParams | null, sort: Sort, reloads = 0) {
  const key = JSON.stringify(params)
  const sortRef = useRef(sort)
  sortRef.current = sort
  useEffect(() => {
    if (!params) {
      setTagList(listPath, { tags: [], total: 0, status: 'idle', error: '' })
      return
    }
    let active = true
    setTagList(listPath, { status: 'pending', error: '' })
    searchCatalog(params)
      .then(result => {
        if (active)
          setTagList(listPath, {
            tags: sortTags(result.tags, sortRef.current),
            total: result.total,
            status: 'succeeded',
          })
      })
      .catch(error => {
        if (active) setTagList(listPath, { status: 'failed', error: error.message })
      })
    return () => {
      active = false
    }
    // `key` stands in for `params`
  }, [listPath, key, reloads])
}

const collections: Record<
  CollectionKind,
  { icon: string; sorts: [Sort, Sort]; params: SearchParams }
> = {
  popular: { icon: mdiStar, sorts: ['downloads', 'alpha'], params: { sort: 'downloads', limit: 50 } },
  classic: { icon: mdiPillar, sorts: ['alpha', 'id'], params: { collection: 'classic', limit: 125 } },
  easy: { icon: mdiTeddyBear, sorts: ['alpha', 'id'], params: { collection: 'easytags', limit: 125 } },
  new: { icon: mdiLeaf, sorts: ['newest', 'alpha'], params: { sort: 'newest', limit: 100 } },
}

/** PopularScreen / ClassicScreen / EasyScreen / NewScreen */
export function CollectionScreen() {
  const { route } = useRoute()
  const kind = route.params.kind as CollectionKind
  const { icon, sorts, params } = collections[kind]
  const listPath = `/${kind}`
  const [sort, setSort] = useSort(listPath, sorts[0])
  const [cleared, setCleared] = useState(false)
  const [reloads, setReloads] = useState(0)
  // Classic and easy are fetched in the order in force at load time, as natively.
  const fetchSort = useRef(sort).current
  useLoadedList(
    listPath,
    cleared ? null : { sheetMusic: true, sort: fetchSort, ...params },
    sort,
    reloads,
  )
  const other = sort === sorts[0] ? sorts[1] : sorts[0]
  return (
    <ListScreen
      listPath={listPath}
      title={kind}
      icon={icon}
      showBack
      emptyText={cleared ? '' : 'no tags found'}
      actions={[
        {
          icon: sortIcons[other],
          label: sortLabels[other],
          onPress: () => {
            setSort(other)
            setTagList(listPath, { tags: sortTags(getTags(listPath), other) })
          },
        },
        {
          icon: mdiReload,
          label: `reload ${kind} tags`,
          onPress: () => {
            setCleared(false)
            setReloads(n => n + 1)
          },
        },
        { icon: mdiBroom, label: `clear ${kind} tags`, onPress: () => setCleared(true) },
      ]}
    />
  )
}

/** Lists backed by ids in the user's library: favorites, history and labels. */
function useIdList(listPath: string, ids: number[], sort: Sort, order: (sort: Sort) => void) {
  const key = ids.join(',')
  useEffect(() => {
    let active = true
    if (!ids.length) {
      setTagList(listPath, { tags: [], total: 0, status: 'succeeded', error: '' })
      return
    }
    searchCatalog({ ids, limit: ids.length })
      .then(result => {
        if (!active) return
        setTagList(listPath, { tags: result.tags, total: result.total, status: 'succeeded' })
        order(sort)
      })
      .catch(error => {
        if (active) setTagList(listPath, { status: 'failed', error: error.message })
      })
    return () => {
      active = false
    }
    // `key` stands in for `ids`; `order` reads current values when called
  }, [listPath, key, sort])
}

export function FavoritesScreen() {
  const listPath = '/favorites'
  const { library, update } = useLibrary()
  const [sort, setSort] = useSort(listPath, 'alpha')
  const [confirm, setConfirm] = useState(false)
  const favorites = library.favorites
  useIdList(
    listPath,
    favorites.map(f => f.id),
    sort,
    current => {
      const tags = getTags(listPath)
      const added = new Map(favorites.map(f => [f.id, f.addedDate]))
      setTagList(listPath, {
        tags:
          current === 'newest'
            ? [...tags].sort((a, b) => (added.get(b.id) || '0').localeCompare(added.get(a.id) || '0'))
            : sortTags(tags, current),
      })
    },
  )
  return (
    <>
      <ListScreen
        listPath={listPath}
        title="faves"
        icon={mdiHeartOutline}
        showDownloads={false}
        emptyText={'to add favorites,\ntap the heart icon in sheet music'}
        actions={[
          ...sortActions(['alpha', 'newest', 'id'], sort, setSort),
          { icon: mdiBroom, label: 'remove all favorites', onPress: () => setConfirm(true) },
        ]}
      />
      <ConfirmDrawer
        open={confirm}
        onOpenChange={setConfirm}
        action="remove all favorites"
        onConfirm={() => update(s => ({ ...s, favorites: [] }))}
      />
    </>
  )
}

export function HistoryScreen() {
  const listPath = '/history'
  const { library, update } = useLibrary()
  const [sort, setSort] = useSort(listPath, 'newest')
  // History is only folded into the list while this screen is focused, so viewing tags
  // from history does not reshuffle the list beneath the tag screen.
  const focused = useIsFocused()
  const [history, setHistory] = useState(library.history)
  useEffect(() => {
    if (focused) setHistory(library.history)
  }, [focused, library.history])
  useIdList(listPath, history, sort, current => {
    const tags = getTags(listPath)
    setTagList(listPath, {
      tags:
        current === 'newest'
          ? [...tags].sort((a, b) => history.indexOf(a.id) - history.indexOf(b.id))
          : sortTags(tags, current),
    })
  })
  return (
    <ListScreen
      listPath={listPath}
      title="history"
      icon={mdiHistory}
      showDot={false}
      emptyText="tags you have viewed will show up here"
      actions={[
        ...sortActions(['alpha', 'newest', 'id'], sort, setSort),
        { icon: mdiBroom, label: 'clear history', onPress: () => update(s => ({ ...s, history: [] })) },
      ]}
    />
  )
}

export function LabeledScreen() {
  const { route } = useRoute()
  const label = route.params.label
  const listPath = route.path
  const { library } = useLibrary()
  const [sort, setSort] = useSort('/label', 'alpha')
  const ids = library.labels.find(l => l.name === label)?.ids ?? []
  useIdList(listPath, ids, sort, current =>
    setTagList(listPath, { tags: sortTags(getTags(listPath), current) }),
  )
  const other: Sort = sort === 'id' ? 'alpha' : 'id'
  return (
    <ListScreen
      listPath={listPath}
      title={label}
      icon={mdiTagOutline}
      showBack
      showDownloads={false}
      emptyText="no tags with this label yet"
      actions={[{ icon: sortIcons[other], label: sortLabels[other], onPress: () => setSort(other) }]}
    />
  )
}
