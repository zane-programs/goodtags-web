import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Download, Maximize, Check } from 'lucide-react'
import { nativeIcon } from '@/components/NativeIcon'
const ExportIcon = nativeIcon('database-export')
const ImportIcon = nativeIcon('database-import')
const RefreshCw = nativeIcon('database-refresh')
const Trash2 = nativeIcon('trash-can-outline')
const Broom = nativeIcon('broom')
const FileText = nativeIcon('file-document-multiple-outline')
const ArrowLeft = nativeIcon('arrow-left')
import { toast } from 'sonner'
import { useLibrary } from '@/lib/store'
import { exportBackup, importBackup } from '@/lib/library'
import { refreshCatalog, searchCatalog } from '@/lib/catalog'
import { downloadFile } from '@/lib/media'
import { clearLogs, getLogs, log, subscribeLogs } from '@/lib/logs'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/IconButton'
import '@/styles/native-settings.css'
export function OptionsPage() {
  const { library, update } = useLibrary()
  const options = [
    { key: 'serifs' as const, title: 'use serif fonts' },
    { key: 'showStatusBar' as const, title: 'show system status bar' },
    { key: 'keepAwake' as const, title: 'keep screen awake' },
  ]
  return (
    <div className="native-options options-page">
      <div className="native-options-list">
        {options.map(({ key, title }) => (
          <label
            className={`native-option ${key === 'showStatusBar' ? 'native-option-unavailable' : ''}`}
            key={key}
          >
            <span className="native-checkbox">
              <input
                type="checkbox"
                checked={library.options[key]}
                disabled={key === 'showStatusBar'}
                aria-describedby={key === 'showStatusBar' ? 'status-bar-explanation' : undefined}
                onChange={event =>
                  update(s => ({ ...s, options: { ...s.options, [key]: event.target.checked } }))
                }
              />
              <Check aria-hidden="true" />
            </span>
            <span>{title}</span>
          </label>
        ))}
      </div>
      <details className="native-web-options">
        <summary>web app options</summary>
        <p id="status-bar-explanation">
          Your browser controls the system status bar. Install goodtags to open it without browser
          controls.
        </p>
        <Button
          variant="outline"
          onClick={() => window.dispatchEvent(new Event('goodtags:install'))}
        >
          <Download />
          install goodtags
        </Button>
        {document.fullscreenEnabled && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                if (document.fullscreenElement) await document.exitFullscreen()
                else await document.documentElement.requestFullscreen()
              } catch {
                toast.error('Full screen is unavailable in this browser')
              }
            }}
          >
            <Maximize />
            toggle full screen
          </Button>
        )}
      </details>
    </div>
  )
}
export function DataPage() {
  const { library, update } = useLibrary()
  const picker = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState('')
  async function action(name: string, work: () => Promise<string>) {
    setBusy(name)
    try {
      const message = await work()
      log(message)
      toast.success(message)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete this action'
      log(message)
      toast.error(message)
    } finally {
      setBusy('')
    }
  }
  return (
    <div className="page-pad native-data">
      <div className="data-grid">
        <section>
          <h2>faves + labels</h2>
          <div className="home-group">
            <button
              className="menu-row"
              disabled={!!busy}
              onClick={() =>
                void action('backup', async () => {
                  const ids = [
                    ...new Set([
                      ...library.favorites.map(f => f.id),
                      ...library.labels.flatMap(l => l.ids),
                    ]),
                  ]
                  const { tags } = await searchCatalog({ ids, limit: ids.length || 1 })
                  const backup = exportBackup(library, tags)
                  downloadFile(
                    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
                    `faves-labels-${new Date().toISOString().slice(0, 16).replace(':', '-')}.json`,
                  )
                  return `Exported ${backup.favorites.length} favorites and ${backup.labels.length} labels`
                })
              }
            >
              <ExportIcon />
              <span>backup</span>
            </button>
            <button className="menu-row" disabled={!!busy} onClick={() => picker.current?.click()}>
              <ImportIcon />
              <span>restore</span>
            </button>
          </div>
          <input
            hidden
            ref={picker}
            type="file"
            accept=".json,application/json"
            aria-label="Restore backup file"
            onChange={event => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              void action('restore', async () => {
                if (file.size > 5_000_000) throw new Error('Backup is too large (maximum 5 MB)')
                const text = await file.text()
                const next = importBackup(text, library)
                if (!update(() => next, true))
                  throw new Error('Could not save the restored library. Check browser storage.')
                const ids = [
                  ...new Set([
                    ...next.favorites.map(f => f.id),
                    ...next.labels.flatMap(l => l.ids),
                  ]),
                ]
                const { tags } = await searchCatalog({ ids, limit: ids.length || 1 })
                const missing = ids.length - tags.length
                return `Restored ${next.favorites.length} favorites and ${next.labels.length} labels${missing ? `. ${missing} tag IDs are preserved but unavailable in this catalog; try refreshing it.` : ''}`
              })
            }}
          />
        </section>
        <section>
          <h2>search database</h2>
          <div className="home-group">
            <button
              className="menu-row"
              disabled={!!busy}
              onClick={() =>
                void action('refresh', async () => {
                  const result = await refreshCatalog()
                  return result === 'updated'
                    ? 'Search database refreshed'
                    : 'Search database already up to date'
                })
              }
            >
              <RefreshCw className={busy === 'refresh' ? 'animate-spin' : ''} />
              <span>refresh</span>
            </button>
          </div>
        </section>
        <section>
          <h2>pdf cache</h2>
          <div className="home-group">
            <button
              className="menu-row"
              disabled={!!busy}
              onClick={() =>
                void action('clear cache', async () => {
                  if ('caches' in window) {
                    const cache = await caches.open('goodtags-media-v1')
                    const requests = await cache.keys()
                    for (const request of requests) {
                      const response = await cache.match(request)
                      const media = new URL(request.url)
                      const remote = media.searchParams.get('url') || media.pathname
                      if (
                        response?.headers.get('content-type')?.includes('application/pdf') ||
                        /\.pdf(?:[?#]|$)/i.test(remote)
                      )
                        await cache.delete(request)
                    }
                  }
                  return 'pdf cache cleared'
                })
              }
            >
              <Broom />
              <span>clear cache</span>
            </button>
          </div>
        </section>
        <section>
          <h2>logs</h2>
          <div className="home-group">
            <Link className="menu-row" to="/logs">
              <FileText />
              <span>view logs</span>
            </Link>
          </div>
        </section>
      </div>
      {busy && (
        <p role="status" className="notice">
          {busy} in progress…
        </p>
      )}
    </div>
  )
}
export function AboutPage() {
  const navigate = useNavigate()
  return (
    <div className="about-page native-about">
      <h2 className="logo">goodtags</h2>
      <p>4.3.0</p>
      <p>by Kenji Matsuoka</p>
      <a href="https://goodtags.net/" target="_blank" rel="noreferrer">
        goodtags.net
      </a>
      <div className="about-credits">
        <p>Content hosted by</p>
        <a href="https://www.barbershoptags.com/" target="_blank" rel="noreferrer">
          barbershoptags.com
        </a>
      </div>
      <IconButton label="Go back" onClick={() => navigate('/')}>
        <ArrowLeft />
      </IconButton>
    </div>
  )
}
export function LogsPage() {
  const [entries, setEntries] = useState(getLogs)
  const navigate = useNavigate()
  useEffect(() => subscribeLogs(() => setEntries(getLogs())), [])
  return (
    <div className="native-logs">
      <header className="native-settings-header">
        <IconButton label="Go back" onClick={() => navigate('/data')}>
          <ArrowLeft />
        </IconButton>
        <h1>logs</h1>
        <IconButton label="Clear logs" onClick={clearLogs}>
          <Trash2 />
        </IconButton>
      </header>
      {entries.length ? (
        <ol className="native-log-list">
          {entries.toReversed().map((entry, i) => (
            <li key={i}>
              <time>
                {new Date(entry.date).toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </time>
              <p>{entry.message}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="native-logs-empty">no console logs yet</p>
      )}
    </div>
  )
}
