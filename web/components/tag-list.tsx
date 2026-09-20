import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { mdiDownload } from '@mdi/js'
import type { Tag } from '@/lib/types'
import { setTagList, useTagList } from '@/lib/tag-lists'
import { useNavigation } from '@/navigation/navigator'
import { Icon } from './ui/icon'
import { Empty } from './ui/empty'

/** TagId.tsx: a small, widely tracked hash before the id. */
export function TagId({ id }: { id: number }) {
  return (
    <span className="min-w-[69px] shrink-0 overflow-hidden text-body-lg whitespace-nowrap text-secondary">
      <span className="text-[14px] tracking-[3px]">#</span>
      {id}
    </span>
  )
}

function TagListItem({
  tag,
  selected,
  showDownloads,
  href,
  onPress,
}: {
  tag: Tag
  selected: boolean
  showDownloads: boolean
  href: string
  onPress: () => void
}) {
  return (
    <a
      href={href}
      role="listitem"
      data-tag-id={tag.id}
      aria-current={selected || undefined}
      onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
        event.preventDefault()
        onPress()
      }}
      className="flex touch-manipulation items-center border-b border-outline-variant py-0.5 pr-2 outline-none select-none [-webkit-tap-highlight-color:transparent] focus-visible:bg-surface-variant active:bg-surface-variant"
    >
      <span aria-hidden="true" className="w-3.5 shrink-0 px-[3px] text-[14px] text-on-surface">
        {selected ? '•' : ''}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-lg text-primary">
          {tag.title}
          {tag.aka && (
            <span className="text-[17px] leading-none text-secondary">&nbsp;aka {tag.aka}</span>
          )}
        </span>
        <span className="flex h-7 items-baseline justify-between">
          {/* One run of text, so a long arranger truncates the download count away too. */}
          <span className="min-w-0 truncate text-body-sm text-secondary">
            {tag.arranger || 'anon'}
            {showDownloads && (
              <span className="text-outline">
                &nbsp;
                <Icon path={mdiDownload} size={14} className="inline align-[-1px]" />
                {tag.downloaded}
              </span>
            )}
          </span>
          <TagId id={tag.id} />
        </span>
      </span>
    </a>
  )
}

/**
 * TagList.tsx. Rows open the tag screen above the list; when that screen closes, the row
 * that was open is scrolled back into view, exactly as far as needed.
 */
export function TagList({
  listPath,
  scrollRef,
  emptyText,
  showDownloads = true,
  showDot = true,
  onEndReached,
  footer,
}: {
  listPath: string
  scrollRef: RefObject<HTMLDivElement | null>
  emptyText: string
  showDownloads?: boolean
  showDot?: boolean
  onEndReached?: () => void
  footer?: ReactNode
}) {
  const { push } = useNavigation()
  const { tags, selectedId, closedAt } = useTagList(listPath)
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!closedAt || !selectedId) return
    scrollRef.current
      ?.querySelector(`[data-tag-id="${selectedId}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [closedAt, selectedId, scrollRef])
  useEffect(() => {
    if (!onEndReached || !sentinel.current) return
    const observer = new IntersectionObserver(
      entries => entries.some(entry => entry.isIntersecting) && onEndReached(),
      { root: scrollRef.current, rootMargin: '50% 0px' },
    )
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [onEndReached, scrollRef, tags.length])
  if (!tags.length) return emptyText ? <Empty>{emptyText}</Empty> : null
  return (
    <div role="list" className="mt-[5px]">
      {tags.map(tag => (
        <TagListItem
          key={tag.id}
          tag={tag}
          selected={showDot && tag.id === selectedId}
          showDownloads={showDownloads}
          href={`${listPath}/tag/${tag.id}`}
          onPress={() => {
            setTagList(listPath, { selectedId: tag.id })
            push(`${listPath}/tag/${tag.id}`)
          }}
        />
      ))}
      <div ref={sentinel} />
      {footer}
    </div>
  )
}
