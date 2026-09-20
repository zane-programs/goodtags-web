import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiChevronLeft,
  mdiFileDocumentOutline,
  mdiHeadphones,
  mdiHeart,
  mdiHeartOutline,
  mdiMenu,
  mdiPause,
  mdiPlay,
  mdiPlus,
  mdiShuffle,
  mdiTagOutline,
  mdiVideoBox,
} from '@mdi/js'
import { cn } from '@/lib/utils'
import { searchCatalog } from '@/lib/catalog'
import { useLibrary } from '@/lib/store'
import { toggleFavorite, visit } from '@/lib/library'
import { mediaUrl, noteName, safeUrl } from '@/lib/media'
import { setTagList, useTagList } from '@/lib/tag-lists'
import type { Part, Tag } from '@/lib/types'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useIsFocused, useNavigation, useRoute } from '@/navigation/navigator'
import { ActionMenu, type MenuAction } from '@/components/action-menu'
import { AppHeader, BackButton } from '@/components/app-header'
import { NoteGlyph } from '@/components/note-glyph'
import { Button, IconButton } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { Icon } from '@/components/ui/icon'
import { Separator } from '@/components/ui/separator'
import { snackbar } from '@/components/ui/snackbar'
import { Spinner } from '@/components/ui/spinner'

const SheetMusic = lazy(() => import('@/components/sheet-music'))

const notFound: Tag = {
  id: 0,
  title: 'not found',
  aka: '',
  arranger: '',
  key: 'F:natural',
  lyrics: '',
  collection: '',
  downloaded: 0,
  parts: 0,
  posted: '',
  uri: '',
  quartet: '',
  quartetUrl: '',
  tracks: [],
  videos: [],
}

function useTag(id: number, known?: Tag) {
  const [tag, setTag] = useState<Tag | undefined>(known)
  useEffect(() => {
    let active = true
    if (known?.id === id) setTag(known)
    searchCatalog({ id, limit: 1 })
      .then(result => active && setTag(result.tags[0] ?? { ...notFound, id }))
      .catch(() => active && setTag(current => current ?? { ...notFound, id }))
    return () => {
      active = false
    }
    // `known` only seeds the first paint
  }, [id])
  return tag?.id === id ? tag : known?.id === id ? known : undefined
}

/** useButtonDimming.ts: controls sit at full strength for 4s after any touch, then at 50%. */
function useDimming() {
  const [dim, setDim] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const brighten = useCallback(() => {
    clearTimeout(timer.current)
    setDim(false)
  }, [])
  const brightenThenFade = useCallback(() => {
    brighten()
    timer.current = setTimeout(() => setDim(true), 4000)
  }, [brighten])
  const dimNow = useCallback(() => {
    clearTimeout(timer.current)
    setDim(true)
  }, [])
  useEffect(() => {
    brightenThenFade()
    return () => clearTimeout(timer.current)
  }, [brightenThenFade])
  return { dim, brighten, brightenThenFade, dimNow }
}

const partNames: Record<Part, string> = {
  AllParts: 'All Parts',
  Tenor: 'Tenor',
  Lead: 'Lead',
  Bari: 'Bari',
  Bass: 'Bass',
}

/** useTrackPlayer.ts: one learning track at a time, errors surfaced in a snackbar. */
function useTrackPlayer(url: string | undefined) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  if (!audio.current && typeof Audio !== 'undefined') audio.current = new Audio()
  useEffect(() => {
    const player = audio.current
    if (!player) return
    player.preload = 'none'
    const on = () => (setPlaying(true), setLoading(false))
    const off = () => setPlaying(false)
    const fail = () => {
      setLoading(false)
      setPlaying(false)
      if (player.src) snackbar('Failed to load track: check your connection', { duration: 4000, action: 'dismiss' })
    }
    player.addEventListener('playing', on)
    player.addEventListener('pause', off)
    player.addEventListener('ended', off)
    player.addEventListener('error', fail)
    return () => {
      player.pause()
      player.removeAttribute('src')
      player.removeEventListener('playing', on)
      player.removeEventListener('pause', off)
      player.removeEventListener('ended', off)
      player.removeEventListener('error', fail)
    }
  }, [])
  const pause = useCallback(() => audio.current?.pause(), [])
  const play = useCallback(
    (source = url) => {
      const player = audio.current
      if (!player) return
      if (!source) {
        snackbar('No track available', { duration: 4000, action: 'dismiss' })
        return
      }
      const next = new URL(mediaUrl(source), location.href).href
      if (player.src !== next || player.ended) {
        player.src = next
        player.currentTime = 0
      }
      setLoading(true)
      player.play().catch(error => {
        setLoading(false)
        if (error.name !== 'AbortError')
          snackbar(`Playback error: ${error.message}`, { duration: 4000, action: 'dismiss' })
      })
    },
    [url],
  )
  // A different tag or part never keeps playing the old audio.
  useEffect(() => pause, [url, pause])
  return { playing, loading: loading && !playing, play, pause }
}

/** Press-and-hold pitch pipe: restarts from the top on every press, stops on release. */
function usePitchPipe(note: string | undefined) {
  const audio = useRef<HTMLAudioElement | null>(null)
  useEffect(() => {
    if (!note) return
    const player = new Audio(`/audio/${note}.mp3`)
    player.preload = 'auto'
    audio.current = player
    return () => {
      player.pause()
      audio.current = null
    }
  }, [note])
  return {
    start: () => {
      if (!audio.current) return
      audio.current.currentTime = 0
      void audio.current.play().catch(() => {})
      navigator.vibrate?.(10)
    },
    stop: () => audio.current?.pause(),
  }
}

const barButton =
  'm-1.5 bg-inverse-on-surface text-primary disabled:bg-inverse-on-surface data-[dim=true]:opacity-50'

function InfoSheet({ tag }: { tag: Tag }) {
  const lyrics =
    tag.lyrics.length > 80
      ? `${tag.lyrics.slice(0, 80).replace(/\s+\S*$/, match => (80 - match.length > 60 ? '' : match))} …`
      : tag.lyrics
  const rows: [string, ReactNode][] = [
    ['aka:', tag.aka],
    ['id:', tag.id],
    ['arranger:', tag.arranger || 'anon'],
    ['posted:', tag.posted],
    ['parts:', tag.parts],
    ['lyrics:', lyrics],
  ]
  const quartetUrl = tag.quartetUrl.startsWith('http') ? safeUrl(tag.quartetUrl) : undefined
  return (
    <div className="flex justify-center px-[max(20px,calc(var(--spacing-safe-l)+20px))] landscape:px-[max(60px,calc(var(--spacing-safe-l)+20px))]">
      <div className="w-full max-w-[95%] pt-2.5 pb-[50px]">
        <h2 className="ml-[3px] text-title-lg font-normal">{tag.title}</h2>
        <Separator bold className="my-2.5" />
        <dl className="pt-2.5">
          {rows
            .filter(([, value]) => value)
            .map(([name, value]) => (
              <div key={name} className="flex gap-2.5 py-[3px] text-body-md">
                <dt className="min-w-[120px] truncate">{name}</dt>
                <dd className="line-clamp-2 min-w-0">{value}</dd>
              </div>
            ))}
          {tag.quartet && (
            <div className="flex gap-2.5 py-[3px] text-body-md">
              <dt className="min-w-[120px]">tracks:</dt>
              <dd className="line-clamp-2 min-w-0">
                {quartetUrl ? (
                  <a className="text-native-link underline" href={quartetUrl} target="_blank" rel="noreferrer">
                    {tag.quartet}
                  </a>
                ) : (
                  tag.quartet
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}

/** TagLayout.tsx */
function TagLayout({
  tag,
  favoritesList = false,
  navigation,
  onBack,
  basePath,
}: {
  tag: Tag
  favoritesList?: boolean
  /** Buttons on the right of the action bar: previous/next, or shuffle. */
  navigation: { icon: string; label: string; disabled?: boolean; onPress: () => void }[]
  onBack?: () => void
  basePath: string
}) {
  const { library, update } = useLibrary()
  const { push, back } = useNavigation()
  const focused = useIsFocused()
  const { dim, brighten, brightenThenFade, dimNow } = useDimming()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheet, setSheet] = useState<'info' | 'tracks' | null>(null)
  const [noteShown, setNoteShown] = useState(false)
  useWakeLock(library.options.keepAwake && focused)

  // useTagHistory.ts: a tag counts as viewed after seven seconds.
  useEffect(() => {
    if (!tag.id || !focused) return
    const timer = setTimeout(() => update(s => visit(s, tag.id)), 7000)
    return () => clearTimeout(timer)
  }, [tag.id, focused, update])

  const tracks = tag.tracks.filter(track => /mp3/i.test(track.fileType) || /\.mp3(\?|$)/i.test(track.url))
  const track =
    tracks.find(t => t.part === library.selectedPart) ??
    tracks.find(t => t.part === 'AllParts') ??
    tracks[0]
  const player = useTrackPlayer(track?.url)
  const note = tag.key.split(':')[1] || 'F'
  const pitch = usePitchPipe(noteName(tag.key))
  useEffect(() => {
    if (!focused) player.pause()
  }, [focused, player])

  const favorite = library.favorites.some(f => f.id === tag.id)
  const press = (action: () => void) => () => {
    action()
    setTimeout(brightenThenFade, 0)
  }
  const actions: MenuAction[] = [
    { icon: mdiFileDocumentOutline, label: 'tag info', onPress: () => setSheet('info') },
    { icon: mdiTagOutline, label: 'labels', onPress: () => push(`${basePath}/labels`) },
    ...(tracks.length
      ? [{ icon: mdiHeadphones, label: 'tracks', onPress: () => setSheet('tracks') }]
      : []),
    ...(tag.videos.length
      ? [
          {
            icon: mdiVideoBox,
            label: 'videos',
            onPress: () => {
              player.pause()
              push(`${basePath}/videos`)
            },
          },
        ]
      : []),
  ]
  const headerButton = 'size-12 text-primary'
  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-surface">
      <header
        className={cn(
          'z-20 flex h-header shrink-0 items-end pt-safe-t pr-[calc(var(--spacing-safe-r)+10px)] pl-[calc(var(--spacing-safe-l)+10px)] landscape:absolute landscape:inset-x-0 landscape:top-0 landscape:h-header-landscape',
          sheet && 'pointer-events-none',
        )}
      >
        <div className="flex h-12 min-w-[60px] items-center">
          <IconButton label="back" className={cn(headerButton, 'mx-1.5 mb-1.5')} onClick={onBack ?? back}>
            <Icon path={mdiChevronLeft} size={42} />
          </IconButton>
        </div>
        <div className="mb-2.5 flex h-12 min-w-0 flex-1 items-end">
          <span className="flex min-w-[50px] items-baseline rounded-sm bg-primary px-2 py-0.5 text-[18px] leading-[26px] text-on-primary tablet:min-w-20 tablet:rounded-[12px] tablet:px-3 tablet:py-1 tablet:text-[26px] tablet:leading-9">
            <span className="text-[14px] tracking-[3px] tablet:text-[16px]">#</span>
            <span className="mr-[7px]">{tag.id}</span>
          </span>
        </div>
        <div className="flex h-12 min-w-[60px] items-center justify-end">
          <IconButton
            label={favorite ? 'remove favorite' : 'add favorite'}
            aria-pressed={favorite}
            className={headerButton}
            onClick={() => {
              update(s => toggleFavorite(s, tag.id))
              if (favorite && favoritesList) (onBack ?? back)()
            }}
          >
            <Icon path={favorite ? mdiHeart : mdiHeartOutline} size={26} />
          </IconButton>
          <IconButton
            label="menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className={headerButton}
            onClick={() => setMenuOpen(open => !open)}
          >
            <Icon path={mdiMenu} size={26} />
          </IconButton>
        </div>
      </header>

      <Suspense fallback={<div className="min-h-0 flex-1 bg-score" />}>
        <SheetMusic uri={tag.uri} onTap={brightenThenFade} />
      </Suspense>

      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 z-10 grid place-content-center text-primary transition-opacity ease-in-out',
          noteShown ? 'opacity-100 duration-[80ms]' : 'opacity-0 duration-200',
        )}
      >
        <span className="opacity-25">
          <NoteGlyph note={note} size={200} />
        </span>
      </div>

      <div
        className={cn(
          'pointer-events-none z-20 mb-safe-b flex h-20 shrink-0 items-center justify-between landscape:absolute landscape:right-safe-r landscape:bottom-safe-b landscape:left-safe-l landscape:mb-0',
          menuOpen && 'landscape:opacity-0',
        )}
      >
        <IconButton
          label={`pitch ${note}, hold to play`}
          size="icon-xl"
          data-dim={dim}
          className={cn(barButton, 'pointer-events-auto touch-none')}
          onPointerDown={event => {
            event.currentTarget.setPointerCapture(event.pointerId)
            brighten()
            setNoteShown(true)
            pitch.start()
          }}
          onPointerUp={() => {
            pitch.stop()
            setNoteShown(false)
            brightenThenFade()
          }}
          onPointerCancel={() => {
            pitch.stop()
            setNoteShown(false)
          }}
          onContextMenu={event => event.preventDefault()}
          onKeyDown={event => {
            if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
              setNoteShown(true)
              pitch.start()
            }
          }}
          onKeyUp={() => {
            pitch.stop()
            setNoteShown(false)
          }}
        >
          <NoteGlyph note={note} />
        </IconButton>
        <IconButton
          label={player.playing ? 'pause' : 'play'}
          size="icon-xl"
          data-dim={dim}
          className={cn(barButton, 'pointer-events-auto')}
          disabled={!tracks.length || player.loading}
          onClick={press(() => (player.playing ? player.pause() : player.play()))}
        >
          {player.loading ? (
            <Spinner className="text-track-spinner" />
          ) : (
            <Icon path={player.playing ? mdiPause : mdiPlay} size={40} />
          )}
        </IconButton>
        <span className="flex-1" />
        {navigation.map(button => (
          <IconButton
            key={button.label}
            label={button.label}
            size="icon-xl"
            data-dim={dim}
            className={cn(barButton, 'pointer-events-auto')}
            disabled={button.disabled}
            onClick={press(() => {
              player.pause()
              button.onPress()
            })}
          >
            <Icon path={button.icon} size={40} />
          </IconButton>
        ))}
      </div>

      <ActionMenu
        title="tag menu"
        open={menuOpen}
        onOpenChange={open => {
          setMenuOpen(open)
          if (!open) dimNow()
        }}
        actions={actions}
        className="pt-[calc(var(--spacing-safe-t)+45px)] pr-safe-r"
      />
      <Drawer open={sheet === 'info'} onOpenChange={open => !open && setSheet(null)}>
        <DrawerContent title="tag info">
          <InfoSheet tag={tag} />
        </DrawerContent>
      </Drawer>
      <Drawer open={sheet === 'tracks'} onOpenChange={open => !open && setSheet(null)}>
        <DrawerContent title="tracks">
          <div className="flex justify-center px-[max(20px,calc(var(--spacing-safe-l)+20px))] pb-[max(20px,var(--spacing-safe-b))]">
            <div role="radiogroup" aria-label="part" className="-ml-[17px] py-3 pr-1 pl-2">
              {tracks.map(item => (
                <button
                  key={item.part}
                  type="button"
                  role="radio"
                  aria-checked={item.part === track?.part}
                  className="flex h-12 max-w-[280px] min-w-28 cursor-pointer touch-manipulation items-center px-3 text-body-lg outline-none select-none [-webkit-tap-highlight-color:transparent] focus-visible:bg-surface-variant active:bg-surface-variant"
                  onClick={() => {
                    update(s => ({ ...s, selectedPart: item.part }))
                    player.play(item.url)
                  }}
                >
                  <span className={cn('w-6', item.part !== track?.part && 'invisible')}>•</span>
                  {partNames[item.part]}
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

/** TagScreen.tsx: a tag opened from a list, with previous/next through that list. */
export function TagScreen() {
  const { route } = useRoute()
  const { back, replaceTop } = useNavigation()
  const id = Number(route.params.id)
  const listPath = route.params.list ?? ''
  const { tags } = useTagList(listPath)
  const index = tags.findIndex(t => t.id === id)
  const tag = useTag(id, tags[index])
  const go = (offset: number) => {
    const next = tags[index + offset]
    if (!next) return
    setTagList(listPath, { selectedId: next.id })
    replaceTop(`${listPath}/tag/${next.id}`, { id: String(next.id), list: listPath })
  }
  if (!tag) return <div className="min-h-0 flex-1 bg-score" />
  return (
    <TagLayout
      tag={tag}
      basePath={route.path}
      favoritesList={listPath === '/favorites'}
      onBack={() => {
        setTagList(listPath, { closedAt: Date.now() })
        back()
      }}
      navigation={[
        { icon: mdiArrowUp, label: 'previous tag', disabled: index <= 0, onPress: () => go(-1) },
        {
          icon: mdiArrowDown,
          label: 'next tag',
          disabled: index < 0 || index >= tags.length - 1,
          onPress: () => go(1),
        },
      ]}
    />
  )
}

/** RandomScreen.tsx */
export function RandomScreen() {
  const [tag, setTag] = useState<Tag>()
  const shuffle = useCallback(() => {
    searchCatalog({ sheetMusic: true, random: true, limit: 1 })
      .then(result => setTag(result.tags[0] ?? notFound))
      .catch(() => setTag(notFound))
  }, [])
  useEffect(shuffle, [shuffle])
  if (!tag) return <div className="min-h-0 flex-1 bg-score" />
  return (
    <TagLayout
      tag={tag}
      basePath={`/random/tag/${tag.id}`}
      navigation={[{ icon: mdiShuffle, label: 'random tag', onPress: shuffle }]}
    />
  )
}

/** TagLabels.tsx */
export function TagLabelsScreen() {
  const { route } = useRoute()
  const { push } = useNavigation()
  const { library, update } = useLibrary()
  const id = Number(route.params.id)
  return (
    <>
      <AppHeader title="labels" left={<BackButton />} />
      <div className="mx-[15px] my-2.5 flex min-h-0 flex-1 flex-col pr-safe-r pl-safe-l">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2.5">
          {library.labels.map(label => (
            <label key={label.name} className="flex cursor-pointer items-center py-[5px] pr-4 text-body-lg select-none">
              <Checkbox
                checked={label.ids.includes(id)}
                onCheckedChange={checked =>
                  update(s => ({
                    ...s,
                    labels: s.labels.map(item =>
                      item.name !== label.name
                        ? item
                        : {
                            ...item,
                            ids: checked === true ? [...new Set([...item.ids, id])] : item.ids.filter(i => i !== id),
                          },
                    ),
                  }))
                }
              />
              <span className="ml-[5px] min-w-0 truncate">{label.name}</span>
            </label>
          ))}
        </div>
        <Button variant="tonal" className="m-[15px] self-start" onClick={() => push(`/labels/new?tag=${id}`)}>
          <Icon path={mdiPlus} size={18} />
          new label
        </Button>
      </div>
    </>
  )
}

/** VideoView.tsx: one card per video, paged sideways; only the visible card loads a player. */
export function TagVideosScreen() {
  const { route, focused } = useRoute()
  const tag = useTag(Number(route.params.id))
  const [current, setCurrent] = useState(0)
  const videos = (tag?.videos ?? []).filter(video => /^[\w-]{11}$/.test(video.code))
  return (
    <>
      <AppHeader title="videos" left={<BackButton />} />
      <div className="flex min-h-0 flex-1 flex-col pr-safe-r pl-safe-l">
        <div
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none]"
          onScroll={event => {
            const { scrollLeft, clientWidth } = event.currentTarget
            setCurrent(Math.round(scrollLeft / clientWidth))
          }}
        >
          {videos.map((video, index) => (
            <div key={video.code} className="flex w-full shrink-0 snap-center snap-always items-center justify-center py-2.5">
              <div className="aspect-video max-h-[75dvh] w-full overflow-hidden rounded-[12px] border-2 border-outline bg-surface-variant desktop:w-auto desktop:h-[75dvh]">
                {index === current && focused && (
                  <iframe
                    className="size-full"
                    src={`https://www.youtube-nocookie.com/embed/${video.code}?playsinline=1`}
                    title={video.sungBy || `${tag?.title} video`}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        {videos.length > 1 && (
          <div className="flex justify-center py-3 pb-[max(12px,var(--spacing-safe-b))]">
            {videos.map((video, index) => (
              <span
                key={video.code}
                className={cn('mx-1 size-2 rounded-xs', index === current ? 'bg-primary' : 'bg-surface-variant')}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
