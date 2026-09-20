import { useCallback, useEffect, useRef, useState } from 'react'
import {
  mdiAccountMultipleCheckOutline,
  mdiBroom,
  mdiFilterCheckOutline,
  mdiMagnify,
  mdiPlaylistCheck,
  mdiShimmer,
} from '@mdi/js'
import { searchCatalog } from '@/lib/catalog'
import type { Sort } from '@/lib/types'
import { getTagList, readSort, setTagList, useTagList, writeSort } from '@/lib/tag-lists'
import { ListScreen, sortActions } from '@/components/list-screen'
import {
  SearchDialog,
  initialFilters,
  partCounts,
  type SearchFilters,
} from '@/components/search-dialog'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Spinner } from '@/components/ui/spinner'

const listPath = '/search'
const PAGE = 33

function Chip({ icon, children }: { icon: string; children: string }) {
  return (
    <span className="m-[3px] flex items-center gap-2 px-2 py-1 text-label-lg text-primary">
      <Icon path={icon} size={18} className="text-on-secondary-container" />
      {children}
    </span>
  )
}

/** SearchScreen.tsx */
export function SearchScreen() {
  const [dialogOpen, setDialogOpen] = useState(true)
  const [search, setSearch] = useState<{ query: string; filters: SearchFilters } | null>(null)
  const [sort, setSortState] = useState<Sort>(() => readSort(listPath, 'downloads'))
  const [limit, setLimit] = useState(PAGE)
  const request = useRef(0)

  useEffect(() => {
    if (!search) {
      setTagList(listPath, { tags: [], total: 0, status: 'idle', error: '', selectedId: undefined })
      return
    }
    const id = ++request.current
    setTagList(listPath, { status: limit > PAGE ? 'morePending' : 'pending', error: '' })
    searchCatalog({
      query: search.query,
      collection: search.filters.collection === 'All' ? undefined : search.filters.collection,
      parts: partCounts[search.filters.parts],
      sheetMusic: search.filters.sheetMusic,
      learningTracks: search.filters.learningTracks,
      sort,
      limit,
    })
      .then(result => {
        if (id === request.current)
          setTagList(listPath, { tags: result.tags, total: result.total, status: 'succeeded' })
      })
      .catch(error => {
        if (id === request.current) setTagList(listPath, { status: 'failed', error: error.message })
      })
  }, [search, sort, limit])

  const loadMore = useCallback(() => {
    const { tags, total, status } = getTagList(listPath)
    if (status === 'succeeded' && tags.length < total) setLimit(tags.length + PAGE)
  }, [])
  const { status } = useTagList(listPath)
  const filters = search?.filters
  return (
    <>
      <ListScreen
        listPath={listPath}
        title=""
        emptyText={
          status === 'idle'
            ? 'tap the search button below to find tags'
            : status === 'succeeded'
              ? 'no matching tags found'
              : ''
        }
        onEndReached={loadMore}
        actions={[
          ...sortActions(['alpha', 'downloads', 'id', 'newest'], sort, next => {
            writeSort(listPath, next)
            setSortState(next)
            setLimit(PAGE)
          }),
          {
            icon: mdiBroom,
            label: 'clear search',
            onPress: () => {
              setSearch(null)
              setLimit(PAGE)
            },
          },
        ]}
        above={
          search && (
            <>
              <div className="z-10 -mt-5 flex justify-center">
                <Button
                  variant="elevated"
                  className="mx-[5px] h-10 max-w-[200px] min-w-[150px] py-0"
                  onClick={() => setDialogOpen(true)}
                >
                  <Icon path={mdiMagnify} size={22} />
                  <span className="truncate">{search.query}</span>
                </Button>
              </div>
              <div className="pointer-events-none flex flex-wrap justify-center p-[3px]">
                {filters && filters.collection !== 'All' && (
                  <Chip icon={mdiPlaylistCheck}>{filters.collection}</Chip>
                )}
                {filters?.learningTracks && <Chip icon={mdiFilterCheckOutline}>tracks</Chip>}
                {filters && filters.parts !== 'any' && (
                  <Chip icon={mdiAccountMultipleCheckOutline}>{`${filters.parts} parts`}</Chip>
                )}
              </div>
            </>
          )
        }
        footer={
          <div className="grid h-[60px] place-content-center">
            {status === 'morePending' && <Spinner size="small" />}
          </div>
        }
        overlay={
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center py-2">
            <Button
              variant="elevated"
              className="pointer-events-auto mx-[5px] h-10 min-w-[150px] py-0"
              onClick={() => {
                setSearch(null)
                setLimit(PAGE)
                setDialogOpen(true)
              }}
            >
              <Icon path={mdiShimmer} size={22} />
              new search
            </Button>
          </div>
        }
      />
      <SearchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        query={search?.query ?? ''}
        filters={search?.filters ?? initialFilters}
        onSearch={(query, nextFilters) => {
          setDialogOpen(false)
          setLimit(PAGE)
          setSearch({ query, filters: nextFilters })
        }}
      />
    </>
  )
}
