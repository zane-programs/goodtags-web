import type { ReactNode } from 'react'
import { mdiChevronLeft, mdiClose, mdiMenu } from '@mdi/js'
import { cn } from '@/lib/utils'
import { useNavigation } from '@/navigation/navigator'
import { Icon } from './ui/icon'
import { IconButton } from './ui/button'

/** BackButton.tsx: a 42px chevron (or 32px close) in a 48px touch target. */
export function BackButton({
  close = false,
  className,
  onPress,
}: {
  close?: boolean
  className?: string
  onPress?: () => void
}) {
  const { back } = useNavigation()
  return (
    <IconButton
      label={close ? 'cancel' : 'back'}
      size="icon-lg"
      className={cn('mx-1.5 mb-1.5', className)}
      onClick={event => {
        event.stopPropagation()
        ;(onPress ?? back)()
      }}
    >
      <Icon path={close ? mdiClose : mdiChevronLeft} size={close ? 32 : 42} />
    </IconButton>
  )
}

/** The hamburger that opens a list's action menu (ListHeader.tsx). */
export function MenuButton({ onPress, expanded }: { onPress: () => void; expanded: boolean }) {
  return (
    <IconButton
      label="menu"
      size="icon-lg"
      aria-haspopup="dialog"
      aria-expanded={expanded}
      onClick={event => {
        event.stopPropagation()
        onPress()
      }}
    >
      <Icon path={mdiMenu} size={26} />
    </IconButton>
  )
}

/**
 * SharedHeader.tsx. Height follows the native formula (see --spacing-header); the three
 * columns sit on the bottom edge, 48 high, with 60-wide side columns.
 */
export function AppHeader({
  title,
  icon,
  left,
  right,
  onPress,
  className,
}: {
  title?: ReactNode
  icon?: string
  left?: ReactNode
  right?: ReactNode
  /** Lists scroll to the top when their header is pressed. */
  onPress?: () => void
  className?: string
}) {
  return (
    <header
      onClick={onPress}
      className={cn(
        'z-10 flex h-header shrink-0 items-end bg-primary pt-safe-t pr-[calc(var(--spacing-safe-r)+10px)] pl-[calc(var(--spacing-safe-l)+10px)] text-on-primary select-none landscape:h-header-landscape',
        className,
      )}
    >
      <div className="flex h-12 min-w-[60px] items-center">{left}</div>
      <div className="flex h-12 min-w-0 flex-1 items-center justify-center">
        {typeof title === 'string' ? (
          <h1 className="flex min-w-0 items-center text-title-lg font-normal">
            {icon && <Icon path={icon} size={22} className="mr-2" />}
            <span className="truncate">{title}</span>
          </h1>
        ) : (
          title
        )}
      </div>
      <div className="flex h-12 min-w-[60px] items-center justify-end">{right}</div>
    </header>
  )
}

/** Logo.tsx: the wordmark in Vollkorn Black, never affected by the sans-serif option. */
export function Logo({ size, className }: { size: number; className?: string }) {
  return (
    <span
      className={cn('font-logo leading-[1.3] font-black', className)}
      style={{ fontSize: size }}
    >
      goodtags
    </span>
  )
}
