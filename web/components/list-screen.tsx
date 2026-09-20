import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  mdiSortAlphabeticalAscending,
  mdiSortCalendarDescending,
  mdiSortNumericAscending,
  mdiSortNumericDescending,
} from '@mdi/js'
import type { Sort } from '@/lib/types'
import { useTagList } from '@/lib/tag-lists'
import { useIsFocused } from '@/navigation/navigator'
import { AppHeader, BackButton, MenuButton } from './app-header'
import { ActionMenu, type MenuAction } from './action-menu'
import { TagList } from './tag-list'
import { Spinner } from './ui/spinner'
import { snackbar } from './ui/snackbar'

export const sortIcons: Record<Sort, string> = {
  alpha: mdiSortAlphabeticalAscending,
  downloads: mdiSortNumericDescending,
  newest: mdiSortCalendarDescending,
  id: mdiSortNumericAscending,
}
export const sortLabels: Record<Sort, string> = {
  alpha: 'sort alphabetically',
  downloads: 'sort by downloads',
  newest: 'sort by newest',
  id: 'sort by id',
}

/** Menu entries for every sort order other than the current one, in the native enum order. */
export function sortActions(
  orders: Sort[],
  current: Sort,
  setSort: (sort: Sort) => void,
): MenuAction[] {
  return orders
    .filter(order => order !== current)
    .map(order => ({ icon: sortIcons[order], label: sortLabels[order], onPress: () => setSort(order) }))
}

/** Where a list's action menu starts: below the header, as FABDown positions it. */
export const listMenuOffset =
  'pt-[calc(var(--spacing-header)-10px)] landscape:pt-[calc(var(--spacing-header-landscape)-10px)] pr-safe-r'

/**
 * The frame every native tag list shares: ListHeader (press to scroll to top, hamburger on
 * the right), the list inset by the side safe areas, a centered system spinner while
 * loading, and errors reported in a snackbar.
 */
export function ListScreen({
  listPath,
  title,
  icon,
  showBack = false,
  actions,
  emptyText,
  showDownloads,
  showDot,
  onEndReached,
  above,
  footer,
  overlay,
}: {
  listPath: string
  title: string
  icon?: string
  showBack?: boolean
  actions: MenuAction[]
  emptyText: string
  showDownloads?: boolean
  showDot?: boolean
  onEndReached?: () => void
  above?: ReactNode
  footer?: ReactNode
  overlay?: ReactNode
}) {
  const scroll = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [screen, setScreen] = useState<HTMLDivElement | null>(null)
  const focused = useIsFocused()
  const { status, error } = useTagList(listPath)
  useEffect(() => {
    if (!focused) setMenuOpen(false)
  }, [focused])
  useEffect(() => {
    if (error) snackbar(`error fetching tags: ${error}`)
  }, [error])
  return (
    <div ref={setScreen} className="relative flex min-h-0 flex-1 flex-col">
      <AppHeader
        title={title}
        icon={icon}
        left={showBack ? <BackButton /> : <span className="w-[50px]" />}
        right={<MenuButton expanded={menuOpen} onPress={() => setMenuOpen(true)} />}
        onPress={() => scroll.current?.scrollTo({ top: 0, behavior: 'smooth' })}
      />
      <div className="relative flex min-h-0 flex-1 flex-col">
        {above}
        <div
          ref={scroll}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-safe-r pl-safe-l"
        >
          <TagList
            listPath={listPath}
            scrollRef={scroll}
            emptyText={emptyText}
            showDownloads={showDownloads}
            showDot={showDot}
            onEndReached={onEndReached}
            footer={footer}
          />
        </div>
        {overlay}
        {status === 'pending' && (
          <div className="pointer-events-none absolute inset-0 grid place-content-center">
            <Spinner />
          </div>
        )}
      </div>
      <ActionMenu
        title={`${title} menu`}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        actions={actions}
        className={listMenuOffset}
        container={screen}
      />
    </div>
  )
}
