import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  Heart,
  Info,
  FileText,
  Tag as TagIcon,
  Tags,
  Share2,
  Video,
  Headphones,
  Play,
  Pause,
  Download,
  Shuffle,
  X,
  Music,
  RotateCcw,
  ChevronLeft,
  Menu,
} from 'lucide-react'
import { toast } from 'sonner'
import { searchCatalog } from '@/lib/catalog'
import type { Tag } from '@/lib/types'
import { useLibrary } from '@/lib/store'
import { toggleFavorite, visit } from '@/lib/library'
import { downloadFile, mediaUrl, noteName, safeUrl, shareTag } from '@/lib/media'
import { useWakeLock } from '@/hooks/useWakeLock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { IconButton } from '@/components/IconButton'
import { Modal } from '@/components/Modal'
const Score = lazy(() => import('@/components/Score'))
export function TagPage({
  id,
  list = [],
  onSelect,
  onClose,
  randomNext,
  randomPrev,
}: {
  id: number
  list?: Tag[]
  onSelect?: (id: number) => void
  onClose?: () => void
  randomNext?: () => void
  randomPrev?: () => void
}) {
  const { library, update } = useLibrary()
  const [tag, setTag] = useState<Tag | undefined>(() => list.find(t => t.id === id))
  const [error, setError] = useState(''),
    [retry, setRetry] = useState(0)
  const [modal, setModal] = useState(''),
    [newLabel, setNewLabel] = useState('')
  const [playing, setPlaying] = useState(false),
    [saving, setSaving] = useState(false)
  const audio = useRef<HTMLAudioElement>(null),
    pitch = useRef<HTMLAudioElement>(null)
  const [dimmed, setDimmed] = useState(false)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const dimTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useWakeLock(library.options.keepAwake)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])
  useEffect(() => {
    let active = true
    setError('')
    searchCatalog({ id, limit: 1 })
      .then(result => {
        if (active) {
          if (!result.tags[0]) setError(`Tag #${id} was not found in this catalog.`)
          else setTag(result.tags[0])
        }
      })
      .catch(e => {
        if (active) setError(e.message)
      })
    return () => {
      active = false
    }
  }, [id, retry])
  useEffect(() => {
    if (tag) update(s => visit(s, tag.id))
  }, [tag?.id, update])
  const tracks = tag?.tracks || []
  const track =
    tracks.find(t => t.part === library.selectedPart) ||
    tracks.find(t => t.part === 'AllParts') ||
    tracks[0]
  const pitchName = noteName(tag?.key || '')
  useEffect(() => {
    const audioElement = audio.current,
      pitchElement = pitch.current
    return () => {
      audioElement?.pause()
      pitchElement?.pause()
      clearTimeout(dimTimer.current)
    }
  }, [track?.url, pitchName])
  const index = list.findIndex(t => t.id === id)
  const togglePlay = () => {
    if (!audio.current) return
    if (audio.current.paused)
      void audio.current
        .play()
        .catch(() => toast.error('Unable to play this track. Check your connection and try again.'))
    else audio.current.pause()
  }
  const playPitch = () => {
    if (pitch.current) {
      pitch.current.currentTime = 0
      void pitch.current.play().catch(() => toast.error('Pitch playback is unavailable'))
    }
  }
  const stopPitch = () => {
    pitch.current?.pause()
  }
  const showControls = () => {
    setDimmed(false)
    clearTimeout(dimTimer.current)
    dimTimer.current = setTimeout(() => setDimmed(true), 8000)
  }
  async function saveTracks() {
    if (!tag) return
    setSaving(true)
    try {
      if (!('caches' in window)) throw new Error('Offline media needs HTTPS or localhost')
      const cache = await caches.open('goodtags-media-v1')
      const urls = [...new Set([tag.uri, ...tracks.map(t => t.url)].filter(Boolean).map(mediaUrl))]
      for (const url of urls) {
        if (await cache.match(url)) continue
        const response = await fetch(url)
        if (!response.ok || response.type === 'opaque')
          throw new Error('Some media could not be saved. Reconnect and retry.')
        await cache.put(url, response)
      }
      toast.success('Sheet music and learning tracks saved for offline use')
      void navigator.storage?.persist?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unable to save media')
    } finally {
      setSaving(false)
    }
  }
  if (error)
    return (
      <section className="tag-detail empty-state" role="alert">
        <p>{error}</p>
        <Button onClick={() => setRetry(n => n + 1)}>Retry</Button>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Back to tags
          </Button>
        )}
      </section>
    )
  if (!tag)
    return (
      <section className="tag-detail loading" role="status">
        loading tag…
      </section>
    )
  return (
    <section
      className={`tag-detail ${dimmed ? 'controls-dimmed' : ''}`}
      aria-label={tag.title}
      onPointerMove={showControls}
      onFocus={showControls}
    >
      <header className="mobile-score-header">
        <IconButton label="Back to tags" onClick={onClose}>
          <ChevronLeft />
        </IconButton>
        <span className="score-id">#{id}</span>
        <IconButton
          label={library.favorites.some(f => f.id === id) ? 'Remove favorite' : 'Add favorite'}
          aria-pressed={library.favorites.some(f => f.id === id)}
          onClick={() => update(s => toggleFavorite(s, id))}
        >
          <Heart fill={library.favorites.some(f => f.id === id) ? 'currentColor' : 'none'} />
        </IconButton>
        <IconButton
          ref={menuTrigger}
          label="Tag menu"
          aria-haspopup="dialog"
          aria-expanded={modal === 'menu'}
          onClick={() => setModal('menu')}
        >
          <Menu />
        </IconButton>
      </header>
      <header className="tag-heading">
        <div>
          <h2>{tag.title}</h2>
          <span>
            {tag.arranger || 'anon'} <span className="tag-id">#{tag.id}</span>
          </span>
        </div>
        {onClose && (
          <IconButton className="desktop-close" label="Close tag" onClick={onClose}>
            <X />
          </IconButton>
        )}
      </header>
      <div className="tag-actions" aria-label="Tag actions">
        <IconButton
          label={library.favorites.some(f => f.id === id) ? 'Remove favorite' : 'Add favorite'}
          aria-pressed={library.favorites.some(f => f.id === id)}
          onClick={() => update(s => toggleFavorite(s, id))}
        >
          <Heart fill={library.favorites.some(f => f.id === id) ? 'currentColor' : 'none'} />
        </IconButton>
        <IconButton label="Tag information" onClick={() => setModal('info')}>
          <Info />
        </IconButton>
        <IconButton label="Tag labels" onClick={() => setModal('labels')}>
          <Tags />
        </IconButton>
        <IconButton
          label="Share tag"
          onClick={() =>
            void shareTag(id, tag.title)
              .then(message => {
                if (message) toast.success(message)
              })
              .catch(e => {
                if (e.name !== 'AbortError') toast.error('Could not share this tag')
              })
          }
        >
          <Share2 />
        </IconButton>
        <IconButton
          label="Videos"
          disabled={!tag.videos.length}
          onClick={() => {
            audio.current?.pause()
            setModal('videos')
          }}
        >
          <Video />
        </IconButton>
        <IconButton
          label="Save media offline"
          disabled={saving || (!tag.uri && !tracks.length)}
          onClick={() => void saveTracks()}
        >
          <Download className={saving ? 'animate-pulse' : ''} />
        </IconButton>
      </div>
      <Suspense fallback={<p className="loading score-loading">loading score viewer…</p>}>
        <Score uri={tag.uri} title={tag.title} />
      </Suspense>
      <div className="player-bar">
        <Button
          className="pitch-button"
          variant="secondary"
          aria-label={`Play pitch ${tag.key.split(':')[1] || 'F'}; hold to play`}
          disabled={!pitchName}
          onPointerDown={e => {
            e.currentTarget.setPointerCapture(e.pointerId)
            playPitch()
          }}
          onPointerUp={stopPitch}
          onPointerCancel={stopPitch}
          onLostPointerCapture={stopPitch}
          onKeyDown={e => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault()
              playPitch()
            }
          }}
          onKeyUp={e => {
            if (e.key === ' ' || e.key === 'Enter') stopPitch()
          }}
          onBlur={stopPitch}
        >
          <Music />
          {tag.key.split(':')[1] || 'F'}
        </Button>
        <IconButton
          label="Choose learning track"
          disabled={!tracks.length}
          onClick={() => setModal('tracks')}
        >
          <Headphones />
        </IconButton>
        <IconButton
          label={playing ? 'Pause learning track' : 'Play learning track'}
          disabled={!track}
          onClick={togglePlay}
        >
          {playing ? <Pause /> : <Play />}
        </IconButton>
        <span className="player-spacer" />
        <IconButton
          label="Previous tag"
          disabled={!randomPrev && index <= 0}
          onClick={() => (randomPrev ? randomPrev() : onSelect?.(list[index - 1].id))}
        >
          <ArrowUp />
        </IconButton>
        <IconButton
          label={randomNext ? 'Another random tag' : 'Next tag'}
          disabled={!randomNext && (index < 0 || index >= list.length - 1)}
          onClick={() => (randomNext ? randomNext() : onSelect?.(list[index + 1].id))}
        >
          {randomNext ? <Shuffle /> : <ArrowDown />}
        </IconButton>
      </div>
      {track && (
        <div className="audio-controls">
          <span>{track.part.replace('AllParts', 'All Parts')}</span>
          <audio
            ref={audio}
            key={track.url}
            src={mediaUrl(track.url)}
            controls
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onEmptied={() => setPlaying(false)}
            onError={() =>
              toast.error(
                'This learning track could not be loaded. Reconnect or choose another part.',
              )
            }
          />
        </div>
      )}
      {pitchName && <audio ref={pitch} src={`/audio/${pitchName}.mp3`} preload="auto" loop />}
      <Modal
        title="tag actions"
        variant="score-menu"
        returnFocus={menuTrigger}
        open={modal === 'menu'}
        onClose={() => setModal('')}
      >
        <div className="score-menu-actions">
          <Button variant="ghost" aria-label="Tag information" onClick={() => setModal('info')}>
            <FileText />
            tag info
          </Button>
          <Button variant="ghost" aria-label="Tag labels" onClick={() => setModal('labels')}>
            <TagIcon />
            labels
          </Button>
          {tracks.length > 0 && (
            <Button
              variant="ghost"
              aria-label="Choose learning track"
              onClick={() => setModal('tracks')}
            >
              <Headphones />
              tracks
            </Button>
          )}
          {tag.videos.length > 0 && (
            <Button
              variant="ghost"
              aria-label="Videos"
              onClick={() => {
                audio.current?.pause()
                setModal('videos')
              }}
            >
              <Video />
              videos
            </Button>
          )}
        </div>
        <div className="score-menu-actions score-menu-extras">
          <Button
            variant="ghost"
            aria-label="Share tag"
            onClick={() => {
              setModal('')
              void shareTag(id, tag.title)
                .then(message => {
                  if (message) toast.success(message)
                })
                .catch(e => {
                  if (e.name !== 'AbortError') toast.error('Could not share this tag')
                })
            }}
          >
            <Share2 />
            share tag
          </Button>
          <Button
            variant="ghost"
            aria-label="Save media offline"
            disabled={saving || (!tag.uri && !tracks.length)}
            onClick={() => {
              setModal('')
              void saveTracks()
            }}
          >
            <Download />
            save media offline
          </Button>
        </div>
      </Modal>
      <Modal
        returnFocus={menuTrigger}
        title={tag.title}
        open={modal === 'info'}
        onClose={() => setModal('')}
      >
        <dl className="tag-info">
          {[
            ['aka', tag.aka],
            ['id', tag.id],
            ['arranger', tag.arranger || 'anon'],
            ['posted', tag.posted],
            ['parts', tag.parts],
            ['key', tag.key.replace(':', ': ')],
            ['lyrics', tag.lyrics],
          ]
            .filter(([, v]) => v)
            .map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          {tag.quartet && (
            <div>
              <dt>tracks</dt>
              <dd>
                {safeUrl(tag.quartetUrl) ? (
                  <a href={safeUrl(tag.quartetUrl)} target="_blank" rel="noreferrer">
                    {tag.quartet}
                  </a>
                ) : (
                  tag.quartet
                )}
              </dd>
            </div>
          )}
        </dl>
        <a href={`https://www.barbershoptags.com/tag-${id}`} target="_blank" rel="noreferrer">
          View on barbershoptags.com
        </a>
        {tag.uri && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const r = await fetch(mediaUrl(tag.uri))
                if (!r.ok) throw new Error()
                downloadFile(
                  await r.blob(),
                  `goodtags-${id}.${/\.pdf/i.test(tag.uri) ? 'pdf' : tag.uri.split('.').pop()?.split('?')[0] || 'png'}`,
                )
              } catch {
                toast.error('Unable to download sheet music')
              }
            }}
          >
            Download sheet music
          </Button>
        )}
      </Modal>
      <Modal
        returnFocus={menuTrigger}
        title="learning tracks"
        open={modal === 'tracks'}
        onClose={() => setModal('')}
        description="Choose a part to practice."
      >
        <div className="track-options">
          {tracks.map(t => (
            <Button
              key={t.part}
              variant={track?.part === t.part ? 'secondary' : 'ghost'}
              onClick={() => {
                audio.current?.pause()
                setPlaying(false)
                update(s => ({ ...s, selectedPart: t.part }))
                setModal('')
              }}
            >
              {t.part.replace('AllParts', 'All Parts')}
            </Button>
          ))}
        </div>
      </Modal>
      <Modal
        returnFocus={menuTrigger}
        title="labels"
        open={modal === 'labels'}
        onClose={() => setModal('')}
        description="Organize this tag. Labels are independent of favorites."
      >
        {library.labels.map(l => (
          <label className="option-row" key={l.name}>
            {l.name}
            <Switch
              checked={l.ids.includes(id)}
              onCheckedChange={checked =>
                update(s => ({
                  ...s,
                  labels: s.labels.map(item =>
                    item.name === l.name
                      ? {
                          ...item,
                          ids: checked
                            ? [...new Set([...item.ids, id])]
                            : item.ids.filter(i => i !== id),
                        }
                      : item,
                  ),
                }))
              }
            />
          </label>
        ))}
        <form
          className="inline-form"
          onSubmit={e => {
            e.preventDefault()
            const name = newLabel.trim()
            if (!name) return
            if (library.labels.some(l => l.name === name)) {
              toast.error('That label already exists')
              return
            }
            update(s => ({ ...s, labels: [{ name, ids: [id] }, ...s.labels] }))
            setNewLabel('')
          }}
        >
          <Input
            placeholder="new label"
            aria-label="New label"
            maxLength={200}
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
          />
          <Button type="submit">Add</Button>
        </form>
      </Modal>
      <Modal
        returnFocus={menuTrigger}
        title="videos"
        open={modal === 'videos'}
        onClose={() => setModal('')}
      >
        <div className="videos">
          {tag.videos
            .filter(v => /^[a-zA-Z0-9_-]{11}$/.test(v.code))
            .map(v => (
              <div key={v.code}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${v.code}`}
                  title={v.sungBy || `${tag.title} performance`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="lazy"
                />
                <p>{v.sungBy}</p>
              </div>
            ))}
        </div>
      </Modal>
    </section>
  )
}
export function DirectTagPage() {
  const { id } = useParams(),
    navigate = useNavigate()
  return <TagPage key={id} id={Number(id)} onClose={() => navigate('/')} />
}
export function RandomPage() {
  const [ids, setIds] = useState<number[]>([]),
    [index, setIndex] = useState(-1),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const next = async () => {
    if (busy) return
    if (index < ids.length - 1) {
      setIndex(i => i + 1)
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await searchCatalog({ sheetMusic: true, random: true, limit: 1 })
      if (!result.tags[0]) throw new Error('No tags available')
      setIds(s => [...s, result.tags[0].id])
      setIndex(i => i + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load a random tag')
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    let active = true
    setBusy(true)
    searchCatalog({ sheetMusic: true, random: true, limit: 1 })
      .then(result => {
        if (active && result.tags[0]) {
          setIds([result.tags[0].id])
          setIndex(0)
        }
      })
      .catch(e => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setBusy(false)
      })
    return () => {
      active = false
    }
  }, [])
  return (
    <>
      {error && (
        <div className="notice error" role="alert">
          {error}
          <Button onClick={() => void next()}>
            <RotateCcw />
            Retry
          </Button>
        </div>
      )}
      {index >= 0 ? (
        <TagPage
          key={ids[index]}
          id={ids[index]}
          randomNext={() => void next()}
          randomPrev={index > 0 ? () => setIndex(i => i - 1) : undefined}
          onClose={() => navigate('/')}
        />
      ) : (
        !error && (
          <p className="loading" role="status">
            finding a random tag…
          </p>
        )
      )}
    </>
  )
}
