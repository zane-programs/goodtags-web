import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  mdiBroom,
  mdiCellphoneArrowDown,
  mdiDatabaseExport,
  mdiDatabaseImport,
  mdiDatabaseRefresh,
  mdiDelete,
  mdiFileDocumentMultipleOutline,
} from '@mdi/js'
import { cn } from '@/lib/utils'
import { useLibrary } from '@/lib/store'
import { exportBackup, importBackup } from '@/lib/library'
import { refreshCatalog, searchCatalog } from '@/lib/catalog'
import { downloadFile } from '@/lib/media'
import { clearLogs, getLogs, subscribeLogs, type LogType } from '@/lib/logs'
import { usePwa } from '@/hooks/usePwa'
import { AppHeader, BackButton } from '@/components/app-header'
import { NavRow } from './home'
import { IconButton, pressable } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Icon } from '@/components/ui/icon'
import { ItemGroup, ItemSeparator } from '@/components/ui/item'
import { snackbar } from '@/components/ui/snackbar'

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`

/** OptionsScreen.tsx: three Material checkboxes; pressing anywhere on a row toggles it. */
export function OptionsScreen() {
  const { library, update } = useLibrary()
  const pwa = usePwa()
  const options = [
    { key: 'serifs', title: 'use serif fonts' },
    // Browsers own the status bar, so this native option is shown but cannot be changed.
    { key: 'showStatusBar', title: 'show system status bar', disabled: true },
    { key: 'keepAwake', title: 'keep screen awake' },
  ] as const
  return (
    <>
      <AppHeader title="options" left={<BackButton />} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pr-[calc(var(--spacing-safe-r)+20px)] pl-[calc(var(--spacing-safe-l)+20px)]">
        {options.map(option => {
          const disabled = 'disabled' in option
          return (
            <label
              key={option.key}
              className={cn(
                pressable,
                'flex min-h-16 cursor-pointer items-center py-2 pr-6 text-[18px] leading-6',
                disabled && 'pointer-events-none text-on-surface-disabled',
              )}
            >
              <Checkbox
                disabled={disabled}
                checked={disabled ? pwa.installed : library.options[option.key]}
                onCheckedChange={checked =>
                  update(s => ({ ...s, options: { ...s.options, [option.key]: checked === true } }))
                }
              />
              <span className="my-[5px] pl-4">{option.title}</span>
            </label>
          )
        })}
        {pwa.canPrompt && (
          <ItemGroup className="mt-5 bg-elevation-1">
            <NavRow icon={mdiCellphoneArrowDown} title="install goodtags" onPress={() => void pwa.install()} />
          </ItemGroup>
        )}
      </div>
    </>
  )
}

/** DataScreen.tsx */
export function DataScreen() {
  const { library, update } = useLibrary()
  const picker = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState('')

  async function run(name: string, work: () => Promise<string>, failure: (e: unknown) => string) {
    setBusy(name)
    try {
      const message = await work()
      if (message) {
        console.info(message)
        snackbar(message)
      }
    } catch (error) {
      console.error(failure(error))
      snackbar(failure(error))
    } finally {
      setBusy('')
    }
  }
  const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))

  const backup = () =>
    run(
      'backup',
      async () => {
        const ids = [
          ...new Set([...library.favorites.map(f => f.id), ...library.labels.flatMap(l => l.ids)]),
        ]
        const { tags } = await searchCatalog({ ids, limit: ids.length || 1 })
        const data = exportBackup(library, tags)
        downloadFile(
          new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
          `faves-labels-${new Date().toISOString().slice(0, 16).replace(':', '-')}.json`,
        )
        return `exported ${plural(data.favorites.length, 'favorite')} and ${plural(data.labels.length, 'label')}`
      },
      error => `backup error: ${reason(error)}`,
    )
  const restore = (file: File) =>
    run(
      'restore',
      async () => {
        const next = importBackup(await file.text(), library)
        if (!update(() => next, true)) throw new Error('browser storage is unavailable')
        return `imported ${plural(next.favorites.length, 'favorite')} and ${plural(next.labels.length, 'label')}`
      },
      error => `unable to import favorites from ${file.name}: ${reason(error)}`,
    )
  const refresh = () =>
    run(
      'refresh',
      async () =>
        (await refreshCatalog()) === 'updated'
          ? 'search database refreshed'
          : 'search database already up to date',
      () => "couldn't download a usable search database",
    )
  const clearCache = () =>
    run(
      'clear',
      async () => {
        if ('caches' in window) {
          const cache = await caches.open('goodtags-media-v1')
          for (const request of await cache.keys()) {
            const response = await cache.match(request)
            const remote = new URL(request.url).searchParams.get('url') || request.url
            if (
              response?.headers.get('content-type')?.includes('application/pdf') ||
              /\.pdf(?:[?#]|$)/i.test(remote)
            )
              await cache.delete(request)
          }
        }
        return 'pdf cache cleared'
      },
      error => `Error clearing cache: ${reason(error)}`,
    )

  const sections = [
    {
      heading: 'faves + labels',
      rows: [
        { icon: mdiDatabaseExport, title: 'backup', onPress: backup },
        { icon: mdiDatabaseImport, title: 'restore', onPress: () => picker.current?.click() },
      ],
    },
    {
      heading: 'search database',
      rows: [{ icon: mdiDatabaseRefresh, title: 'refresh', onPress: refresh, busy: 'refresh' }],
    },
    {
      heading: 'pdf cache',
      rows: [{ icon: mdiBroom, title: 'clear cache', onPress: clearCache, busy: 'clear' }],
    },
    {
      heading: 'logs',
      rows: [{ icon: mdiFileDocumentMultipleOutline, title: 'view logs', path: '/logs' }],
    },
  ]
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-secondary-container">
      <AppHeader title="data" left={<BackButton />} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2.5 pr-[max(20px,var(--spacing-safe-r))] pb-5 pl-[max(20px,var(--spacing-safe-l))]">
        <div className="mx-auto flex max-w-5xl flex-col px-2.5 landscape:flex-row landscape:gap-5">
          {sections.map(section => (
            <section key={section.heading} className="my-2.5 landscape:flex-1">
              <h2 className="mt-2.5 mb-[15px] text-title-lg font-normal landscape:mt-0">
                {section.heading}
              </h2>
              <ItemGroup>
                {section.rows.map((row, index) => (
                  <Fragment key={row.title}>
                    {index > 0 && <ItemSeparator />}
                    <NavRow {...row} disabled={'busy' in row && busy === row.busy} />
                  </Fragment>
                ))}
              </ItemGroup>
            </section>
          ))}
        </div>
      </div>
      <input
        hidden
        ref={picker}
        type="file"
        accept=".json,application/json"
        aria-label="restore backup file"
        onChange={event => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void restore(file)
        }}
      />
    </div>
  )
}

const logColors: Record<LogType, string> = {
  error: 'border-error',
  warn: 'border-tertiary',
  info: 'border-primary',
  debug: 'border-secondary',
  log: 'border-on-surface',
}

/** LogsScreen.tsx: the most recent console entries, newest at the bottom. */
export function LogsScreen() {
  const entries = useSyncExternalStore(subscribeLogs, getLogs)
  const scroll = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight })
  }, [entries])
  return (
    <>
      <AppHeader
        title="logs"
        left={<BackButton />}
        onPress={() => scroll.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        right={
          <IconButton
            label="clear logs"
            onClick={event => {
              event.stopPropagation()
              clearLogs()
            }}
          >
            <Icon path={mdiDelete} />
          </IconButton>
        }
      />
      <div
        ref={scroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-[max(8px,var(--spacing-safe-r))] pb-safe-b pl-[max(8px,var(--spacing-safe-l))]"
      >
        {entries.length ? (
          <ol className="py-2">
            {entries.map(entry => (
              <li
                key={entry.id}
                className={cn('my-1 border-l-4 bg-surface-variant px-3 py-2', logColors[entry.type])}
              >
                <time className="mb-1 block font-mono text-[12px] leading-4 text-on-surface-variant">
                  {new Date(entry.date).toLocaleTimeString('en-GB', { hour12: false })}
                </time>
                <p className="font-mono text-[13px] leading-[18px] break-words whitespace-pre-wrap">
                  {entry.message}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="p-8 text-center text-body-lg text-on-surface-variant">no console logs yet</p>
        )}
      </div>
    </>
  )
}
