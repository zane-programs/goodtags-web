import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { NativeIcon, nativeIcon } from '@/components/NativeIcon'
const Download = nativeIcon('download'), Search = nativeIcon('magnify'), SlidersHorizontal = nativeIcon('cog-outline'), Trash2 = nativeIcon('broom'), X = nativeIcon('close'), RefreshCw = nativeIcon('reload')
import { searchCatalog } from '@/lib/catalog'
import { useLibrary } from '@/lib/store'
import type { SearchParams, Sort, Tag } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Modal } from '@/components/Modal'
import { IconButton } from '@/components/IconButton'
import { TagPage } from './TagPage'
export function BrowsePage({ kind }: { kind: string }) {
  const { library, update } = useLibrary()
  const { label } = useParams()
  const location = useLocation(),
    navigate = useNavigate()
  const [url, setUrl] = useSearchParams()
  const [draft, setDraft] = useState(url.get('q') || '')
  const [filters, setFilters] = useState({
    collection: url.get('collection') || '',
    parts: url.get('parts') || '',
    sheet: url.get('sheet') !== '0',
    tracks: url.get('tracks') === '1',
  })
  const [filterOpen, setFilterOpen] = useState(() => kind === 'search' && !url.has('q') && window.matchMedia('(max-width: 1023px)').matches),
    [menuOpen, setMenuOpen] = useState(false),
    [confirmClear, setConfirmClear] = useState(false)
  const menuTrigger = useRef<HTMLButtonElement | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const searchSubmitted = kind !== 'search' || url.has('q')
  useEffect(() => {
    const openMenu = () => {
      menuTrigger.current = document.querySelector('.native-list-menu-trigger')
      setMenuOpen(true)
    }
    window.addEventListener('goodtags:list-menu', openMenu)
    return () => window.removeEventListener('goodtags:list-menu', openMenu)
  }, [])
  const [tags, setTags] = useState<Tag[]>([]),
    [total, setTotal] = useState(0),
    [limit, setLimit] = useState(33)
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0)
  const selectedId = Number(location.pathname.match(/\/tag\/(\d+)/)?.[1]) || undefined
  const [lastSelectedId, setLastSelectedId] = useState(selectedId)
  const [cleared, setCleared] = useState(false)
  const isCollection = ['popular', 'classic', 'easy', 'new'].includes(kind)
  useLayoutEffect(() => {
    if (selectedId) setLastSelectedId(selectedId)
    else if (lastSelectedId)
      document
        .querySelector(`[data-tag-id="${lastSelectedId}"]`)
        ?.scrollIntoView({ block: 'nearest' })
  }, [selectedId, lastSelectedId])
  useEffect(() => {
    setDraft(url.get('q') || '')
  }, [url])
  const base = kind === 'label' ? `/labels/${encodeURIComponent(label || '')}` : `/${kind}`
  const defaultSort: Sort =
    ['popular', 'search'].includes(kind) ? 'downloads' : ['new', 'history', 'favorites'].includes(kind) ? 'newest' : 'alpha'
  const sort = (
    ['alpha', 'downloads', 'newest', 'id'].includes(url.get('sort') || '')
      ? url.get('sort')
      : defaultSort
  ) as Sort
  const favoriteIds = library.favorites.map(f => f.id).join(','),
    labelIds = library.labels.find(l => l.name === label)?.ids.join(',') || ''
  // Keep history order stable while stepping through its scores.
  const [historyIds, setHistoryIds] = useState(() => [...library.history])
  const params = useMemo<SearchParams>(
    () => ({
      query: kind === 'search' ? url.get('q') || '' : undefined,
      collection:
        kind === 'classic'
          ? 'classic'
          : kind === 'easy'
            ? 'easytags'
            : url.get('collection') || undefined,
      sheetMusic: ['popular', 'classic', 'easy', 'new'].includes(kind) || (kind === 'search' && url.get('sheet') !== '0'),
      learningTracks: url.get('tracks') === '1',
      parts: Number(url.get('parts')) || undefined,
      ids:
        kind === 'favorites'
          ? favoriteIds.split(',').filter(Boolean).map(Number)
          : kind === 'history'
            ? historyIds
            : kind === 'label'
              ? labelIds.split(',').filter(Boolean).map(Number)
              : undefined,
      sort: kind === 'popular' ? 'downloads' : kind === 'new' ? 'newest' : sort,
      limit:
        kind === 'popular'
          ? 50
          : kind === 'new'
            ? 100
            : ['favorites', 'history', 'label'].includes(kind)
              ? 100000
              : kind === 'search'
                ? limit
                : 125,
    }),
    [kind, url, sort, limit, favoriteIds, labelIds, historyIds],
  )
  useEffect(() => {
    let active = true
    if (cleared || !searchSubmitted) {
      setTags([])
      setTotal(0)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    searchCatalog(params)
      .then(result => {
        if (active) {
          setTags(result.tags)
          setTotal(
            ['popular', 'new', 'classic', 'easy'].includes(kind)
              ? Math.min(result.total, params.limit!)
              : result.total,
          )
        }
      })
      .catch(e => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [params, kind, retry, cleared, searchSubmitted])
  const ordered = useMemo(() => {
    const result = [...tags]
    if (sort === 'alpha') result.sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'id') result.sort((a, b) => a.id - b.id)
    if (sort === 'downloads') result.sort((a, b) => b.downloaded - a.downloaded)
    if (sort === 'newest' && !['favorites', 'history'].includes(kind))
      result.sort((a, b) => b.posted.localeCompare(a.posted) || b.id - a.id)
    if (sort === 'newest' && kind === 'favorites')
      result.sort((a, b) =>
        (library.favorites.find(f => f.id === b.id)?.addedDate || '').localeCompare(
          library.favorites.find(f => f.id === a.id)?.addedDate || '',
        ),
      )
    if (sort === 'newest' && kind === 'history')
      result.sort((a, b) => historyIds.indexOf(a.id) - historyIds.indexOf(b.id))
    return result
  }, [tags, sort, kind, library.favorites, historyIds])
  function setParam(name: string, value: string) {
    const next = new URLSearchParams(url)
    if (value) next.set(name, value)
    else next.delete(name)
    setLimit(33)
    setUrl(next)
  }
  const sortOptions: Sort[] = kind === 'popular' ? ['alpha', 'downloads'] : kind === 'new' ? ['alpha', 'newest'] : ['classic', 'easy', 'label'].includes(kind) ? ['alpha', 'id'] : ['favorites', 'history'].includes(kind) ? ['alpha', 'newest', 'id'] : ['alpha', 'downloads', 'newest', 'id']
  const sortLabels = { alpha: 'sort alphabetically', downloads: 'sort by downloads', newest: 'sort by newest', id: 'sort by id' }
  const sortIcons = { alpha: 'sort-alphabetical-ascending', downloads: 'sort-numeric-descending', newest: 'sort-calendar-descending', id: 'sort-numeric-ascending' } as const
  const showSearch = (fresh = false) => {
    setDraft(fresh ? '' : url.get('q') || '')
    setFilters({ collection: url.get('collection') || '', parts: url.get('parts') || '', sheet: url.get('sheet') !== '0', tracks: url.get('tracks') === '1' })
    setFilterOpen(true)
  }
  const submitSearch = () => {
    const next = new URLSearchParams(url)
    next.set('q', draft.trim())
    next.set('sheet', filters.sheet ? '1' : '0')
    for (const [key, value] of Object.entries({ collection: filters.collection, parts: filters.parts, tracks: filters.tracks ? '1' : '' })) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setCleared(false)
    setLimit(33)
    setUrl(next)
    setFilterOpen(false)
  }
  useEffect(() => {
    if (kind !== 'search' || loading || tags.length >= total || !loadMoreRef.current || selectedId) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) setLimit(n => n + 33)
    }, { rootMargin: '250px' })
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [kind, loading, tags.length, total, selectedId])
  const select = (id: number) => navigate(`${base}/tag/${id}${location.search}`)
  return (
    <div className={`browse-layout native-browse native-browse-${kind} ${selectedId ? 'selected' : ''}`}>
      <section className="browse-list" aria-label={`${kind} tags`}>
        {kind === 'search' && (
          <form
            className="search-bar desktop-search-bar"
            onSubmit={e => {
              e.preventDefault()
              const next = new URLSearchParams(url)
              next.set('q', draft.trim())
              if (!next.has('sheet')) next.set('sheet', '1')
              setLimit(33)
              setUrl(next)
            }}
          >
            <Input
              aria-label="Search tags"
              placeholder="title, lyrics, arranger, or tag id"
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />
            <IconButton label="Search" type="submit">
              <Search />
            </IconButton>
            <IconButton
              label="Search filters"
              type="button"
              onClick={() => {
                setFilters({
                  collection: url.get('collection') || '',
                  parts: url.get('parts') || '',
                  sheet: url.get('sheet') !== '0',
                  tracks: url.get('tracks') === '1',
                })
                setFilterOpen(true)
              }}
            >
              <SlidersHorizontal />
            </IconButton>
          </form>
        )}
        {kind === 'search' && url.get('q') && (
          <div className="native-query-holder"><Button variant="secondary" onClick={() => showSearch()}><Search />{url.get('q')}</Button></div>
        )}
        <div className="list-toolbar">
          <span aria-live="polite">{loading ? 'loading…' : `${total.toLocaleString()} tags`}</span>
          <label className="sort-label">
            <span className="sr-only">Sort tags</span>
            <select
              aria-label="Sort tags"
              value={sort}
              onChange={e => setParam('sort', e.target.value)}
            >
              <option value="alpha">alphabetically</option>
              <option value="id">by id</option>
              <option value="newest">
                {['favorites', 'history'].includes(kind) ? 'most recent' : 'newest'}
              </option>
              {!['favorites', 'history', 'label'].includes(kind) && (
                <option value="downloads">most downloaded</option>
              )}
            </select>
          </label>
          {kind === 'search' && (
            <IconButton
              label="Clear search"
              onClick={() => {
                setDraft('')
                setUrl({})
                setLimit(33)
              }}
            >
              <X />
            </IconButton>
          )}
          {['favorites', 'history'].includes(kind) && (
            <IconButton
              label={`Clear ${kind}`}
              disabled={!tags.length}
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 />
            </IconButton>
          )}
          {isCollection && (
            <>
              <IconButton
                label={`Reload ${kind} tags`}
                onClick={() => {
                  setCleared(false)
                  setRetry(n => n + 1)
                }}
              >
                <RefreshCw />
              </IconButton>
              <IconButton
                label={`Clear ${kind} tags`}
                disabled={!tags.length}
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 />
              </IconButton>
            </>
          )}
        </div>
        {kind === 'search' &&
          (url.get('collection') || url.get('parts') || url.get('sheet') || url.get('tracks')) && (
            <div className="filter-chips">
              {url.get('collection') && (
                <span>{url.get('collection') === 'easytags' ? 'easy' : url.get('collection')}</span>
              )}
              {url.get('parts') && <span>{url.get('parts')} parts</span>}
              
              {url.get('tracks') && <span>tracks</span>}
            </div>
          )}
        {error ? (
          <div className="empty-state" role="alert">
            <p>{error}</p>
            <Button onClick={() => setRetry(n => n + 1)}>Retry</Button>
          </div>
        ) : !loading && !tags.length ? (
          <div className="empty-state">
            <p>
              {kind === 'favorites'
                ? 'to add favorites,\ntap the heart icon in sheet music'
                : kind === 'history'
                  ? 'tags you have viewed will show up here'
                  : kind === 'search' && !searchSubmitted ? 'tap the search button below to find tags' : isCollection ? 'no tags found' : 'no matching tags found'}
            </p>
            <p className="muted desktop-empty-help">
              {kind === 'favorites'
                ? 'Tap the heart on a tag to save it here.'
                : kind === 'label'
                  ? 'Add this label from any tag’s label menu.'
                  : 'Find a tag in search or explore a collection.'}
            </p>
          </div>
        ) : (
          <div className="tag-list">
            {ordered.map(tag => (
              <Link
                key={tag.id}
                data-tag-id={tag.id}
                to={`${base}/tag/${tag.id}${location.search}`}
                className={`tag-row ${kind !== 'history' && (selectedId || lastSelectedId) === tag.id ? 'current' : ''}`}
                aria-current={selectedId === tag.id ? 'true' : undefined}
              >
                <span className="selection-dot">
                  {kind !== 'history' && (selectedId || lastSelectedId) === tag.id ? '•' : ''}
                </span>
                <span className="tag-row-body">
                  <span className="tag-title">
                    {tag.title} {tag.aka && <small>aka {tag.aka}</small>}
                  </span>
                  <span className="tag-meta">
                    <span>
                      {tag.arranger || 'anon'}{' '}
                      {!['favorites', 'label'].includes(kind) && (
                        <small>
                          <Download size={13} />
                          {tag.downloaded}
                        </small>
                      )}
                    </span>
                    <span className="tag-id">
                      <span className="tag-id-hash">#</span>{tag.id}
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
        {kind === 'search' && tags.length < total && (
          <div ref={loadMoreRef}><Button
            variant="secondary"
            className="load-more"
            disabled={loading}
            onClick={() => setLimit(n => n + 33)}
          >
            Load more
          </Button></div>
        )}
        {kind === 'search' && <div className="native-new-search"><Button variant="secondary" onClick={() => showSearch(true)}><NativeIcon name="shimmer" />new search</Button></div>}
      </section>
      {selectedId && (
        <TagPage
          key={selectedId}
          id={selectedId}
          list={ordered}
          onSelect={select}
          onClose={() => navigate(base + location.search)}
        />
      )}
      <Modal title="list actions" variant="score-menu" open={menuOpen} returnFocus={menuTrigger} onClose={() => setMenuOpen(false)}>
        <div className="score-menu-actions">
          {sortOptions.filter(order => order !== sort).map(order => (
            <Button key={order} variant="ghost" onClick={() => { setParam('sort', order); setMenuOpen(false) }}><NativeIcon name={sortIcons[order]} />{sortLabels[order]}</Button>
          ))}
          {isCollection && <Button variant="ghost" onClick={() => { setCleared(false); setRetry(n => n + 1); setMenuOpen(false) }}><RefreshCw />reload {kind} tags</Button>}
          {kind !== 'label' && <Button variant="ghost" onClick={() => {
            setMenuOpen(false)
            if (kind === 'favorites') setConfirmClear(true)
            else if (kind === 'history') { update(s => ({ ...s, history: [] })); setHistoryIds([]) }
            else if (kind === 'search') { setDraft(''); setUrl({}); setLimit(33) }
            else setCleared(true)
          }}><Trash2 />{kind === 'favorites' ? 'remove all favorites' : kind === 'search' ? 'clear search' : kind === 'history' ? 'clear history' : `clear ${kind} tags`}</Button>}
        </div>
      </Modal>
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="native-search-dialog" showCloseButton={false}>
          <DialogTitle className="sr-only">search for tags</DialogTitle>
          <DialogDescription className="sr-only">Search by title, lyrics, arranger, or tag id; choose collection, parts, and media.</DialogDescription>
          <form onSubmit={e => { e.preventDefault(); submitSearch() }}>
            <div className="native-search-input">
              <IconButton label="Close search" type="button" onClick={() => setFilterOpen(false)}><NativeIcon name="chevron-left" /></IconButton>
              <Input autoFocus aria-label="Search tags" placeholder="search for tags" value={draft} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" onChange={e => setDraft(e.target.value)} />
              {draft && <IconButton label="Clear query" type="button" onClick={() => setDraft('')}><X /></IconButton>}
            </div>
            <fieldset className="native-segment-section">
              <legend>collection</legend>
              <div className="native-segments">
                {[['', 'all'], ['classic', 'classic'], ['easytags', 'easy']].map(([value, title]) => <Button type="button" variant="ghost" key={value} aria-pressed={filters.collection === value} onClick={() => setFilters(f => ({ ...f, collection: value }))}>{title}</Button>)}
              </div>
            </fieldset>
            <fieldset className="native-segment-section">
              <legend>parts</legend>
              <div className="native-segments">
                {[['', 'any'], ['4', '4'], ['5', '5'], ['6', '6']].map(([value, title]) => <Button type="button" variant="ghost" key={value} aria-pressed={filters.parts === value} onClick={() => setFilters(f => ({ ...f, parts: value }))}>{title}</Button>)}
              </div>
            </fieldset>
            <fieldset className="native-segment-section">
              <legend>media</legend>
              <div className="native-segments">
                <Button type="button" variant="ghost" aria-pressed={filters.sheet} onClick={() => setFilters(f => ({ ...f, sheet: !f.sheet }))}>sheet music</Button>
                <Button type="button" variant="ghost" aria-pressed={filters.tracks} onClick={() => setFilters(f => ({ ...f, tracks: !f.tracks }))}>tracks</Button>
              </div>
            </fieldset>
            <Button type="submit" className="native-submit-search"><Search />search</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Modal
        title={`clear ${kind}?`}
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        description={
          kind === 'favorites'
            ? 'Your labels will be kept.'
            : isCollection
              ? 'Clear this list. Reload to bring it back.'
              : 'Remove your recently viewed tags.'
        }
      >
        <Button
          variant="destructive"
          onClick={() => {
            if (isCollection) setCleared(true)
            else update(s => ({ ...s, [kind]: [] }))
            if (kind === 'history') {
              setHistoryIds([])
              setTags([])
              setTotal(0)
            }
            setConfirmClear(false)
          }}
        >
          Clear {kind}
        </Button>
        <Button variant="outline" onClick={() => setConfirmClear(false)}>
          Cancel
        </Button>
      </Modal>
    </div>
  )
}
