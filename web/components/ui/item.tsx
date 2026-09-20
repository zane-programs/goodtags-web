import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'
import { Separator } from './separator'

/** The rounded card that groups rows on Home, Labels and Data (useListStyles.listHolder). */
function ItemGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="list"
      data-slot="item-group"
      className={cn('my-[5px] overflow-hidden rounded-lg bg-surface', className)}
      {...props}
    />
  )
}

function ItemSeparator(props: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="item-separator" {...props} />
}

/**
 * A Paper List.Item row. Pressed state is an instant surface-variant fill, as on iOS.
 * Use `asChild` to make the row a link or button.
 */
function Item({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      role="listitem"
      data-slot="item"
      className={cn(
        'flex min-h-14 w-full touch-manipulation items-center py-2.5 pr-6 pl-2.5 text-left font-app text-body-lg text-on-surface outline-none select-none [-webkit-tap-highlight-color:transparent] focus-visible:bg-surface-variant [a&,button&]:cursor-pointer [a&,button&]:active:bg-surface-variant disabled:pointer-events-none',
        className,
      )}
      {...props}
    />
  )
}

/** Leading icon slot: 16 from the row edge, as Paper positions List.Icon. */
function ItemMedia({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="item-media"
      className={cn('ml-4 grid shrink-0 place-content-center text-black', className)}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span data-slot="item-content" className={cn('min-w-0 flex-1 truncate pl-4', className)} {...props} />
  )
}

/** Trailing slot (the chevron on navigation rows). */
function ItemActions({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="item-actions"
      className={cn('ml-4 grid shrink-0 place-content-center text-on-surface-variant', className)}
      {...props}
    />
  )
}

export { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemSeparator }
