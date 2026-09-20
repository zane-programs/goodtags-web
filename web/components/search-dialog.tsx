import { useState } from 'react'
import { mdiChevronLeft, mdiClose, mdiMagnify } from '@mdi/js'
import { Dialog, DialogContent } from './ui/dialog'
import { Button, IconButton } from './ui/button'
import { Icon } from './ui/icon'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'

export interface SearchFilters {
  collection: 'All' | 'classic' | 'easytags'
  parts: 'any' | 'four' | 'five' | 'six'
  sheetMusic: boolean
  learningTracks: boolean
}
export const initialFilters: SearchFilters = {
  collection: 'All',
  parts: 'any',
  sheetMusic: true,
  learningTracks: false,
}
export const partCounts = { any: undefined, four: 4, five: 5, six: 6 } as const

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-3 px-2.5">
      <legend className="pb-1.5 pl-1 text-label-lg font-black text-primary">{label}</legend>
      {children}
    </fieldset>
  )
}

/**
 * SearchDialog.tsx: a full-window form shown without animation. The pill search bar takes
 * focus immediately; on touch devices the bottom search button appears only while the
 * keyboard is down, because the keyboard's own search key is used otherwise.
 */
export function SearchDialog({
  open,
  onOpenChange,
  query: initialQuery,
  filters: initialFilterState,
  onSearch,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  query: string
  filters: SearchFilters
  onSearch: (query: string, filters: SearchFilters) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="search for tags" className="bg-surface">
        {/* Remounted per opening so the form starts from the current search. */}
        <SearchForm
          query={initialQuery}
          filters={initialFilterState}
          onDismiss={() => onOpenChange(false)}
          onSearch={onSearch}
        />
      </DialogContent>
    </Dialog>
  )
}

function SearchForm({
  query: initialQuery,
  filters: initialFilterState,
  onDismiss,
  onSearch,
}: {
  query: string
  filters: SearchFilters
  onDismiss: () => void
  onSearch: (query: string, filters: SearchFilters) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const [filters, setFilters] = useState(initialFilterState)
  const [typing, setTyping] = useState(true)
  const blur = () => (document.activeElement as HTMLElement | null)?.blur()
  const media = [filters.sheetMusic && 'sheetMusic', filters.learningTracks && 'learningTracks']
  return (
    <form
      className="mx-auto flex h-full w-full max-w-2xl flex-col pt-safe-t pr-safe-r pb-safe-b pl-safe-l"
      onSubmit={event => {
        event.preventDefault()
        onSearch(query, filters)
      }}
    >
      <div className="mx-5 my-2.5 flex min-h-14 items-center rounded-full bg-elevation-3 text-on-surface-variant">
        <IconButton label="back" className="mx-1" onClick={onDismiss}>
          <Icon path={mdiChevronLeft} />
        </IconButton>
        <input
          autoFocus
          type="search"
          aria-label="search for tags"
          placeholder="search for tags"
          enterKeyHint="search"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={event => setQuery(event.target.value)}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          className="min-w-0 flex-1 appearance-none bg-transparent font-app text-body-lg caret-primary outline-none placeholder:text-secondary [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <IconButton label="clear" className="mx-1" onClick={() => setQuery('')}>
            <Icon path={mdiClose} />
          </IconButton>
        )}
      </div>
      <div className="px-2.5">
        <Section label="collection">
          <ToggleGroup
            type="single"
            value={filters.collection}
            onValueChange={value => {
              blur()
              if (value)
                setFilters(f => ({ ...f, collection: value as SearchFilters['collection'] }))
            }}
          >
            <ToggleGroupItem value="All">all</ToggleGroupItem>
            <ToggleGroupItem value="classic">classic</ToggleGroupItem>
            <ToggleGroupItem value="easytags">easy</ToggleGroupItem>
          </ToggleGroup>
        </Section>
        <Section label="parts">
          <ToggleGroup
            type="single"
            value={filters.parts}
            onValueChange={value => {
              blur()
              if (value) setFilters(f => ({ ...f, parts: value as SearchFilters['parts'] }))
            }}
          >
            <ToggleGroupItem value="any">any</ToggleGroupItem>
            <ToggleGroupItem value="four">4</ToggleGroupItem>
            <ToggleGroupItem value="five">5</ToggleGroupItem>
            <ToggleGroupItem value="six">6</ToggleGroupItem>
          </ToggleGroup>
        </Section>
        <Section label="media">
          <ToggleGroup
            type="multiple"
            value={media.filter(Boolean) as string[]}
            onValueChange={value => {
              blur()
              setFilters(f => ({
                ...f,
                sheetMusic: value.includes('sheetMusic'),
                learningTracks: value.includes('learningTracks'),
              }))
            }}
          >
            <ToggleGroupItem value="sheetMusic">sheet music</ToggleGroupItem>
            <ToggleGroupItem value="learningTracks">tracks</ToggleGroupItem>
          </ToggleGroup>
        </Section>
      </div>
      <div className="flex-1" />
      <Button
        type="submit"
        size="compact"
        className={typing ? 'mx-5 mb-4 pointer-coarse:hidden' : 'mx-5 mb-4'}
      >
        <Icon path={mdiMagnify} size={18} />
        search
      </Button>
    </form>
  )
}
