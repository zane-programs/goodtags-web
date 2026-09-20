import * as React from 'react'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

/** The native search dialog's SegmentedPicker: one outlined pill split into equal segments. */
function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn('flex w-full overflow-hidden rounded-[20px] border border-outline', className)}
      {...props}
    />
  )
}

function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        'flex-1 cursor-pointer touch-manipulation border-l border-outline py-2 text-center font-app text-[15px] leading-[20px] text-on-surface outline-none select-none [-webkit-tap-highlight-color:transparent] first:border-l-0 focus-visible:bg-primary-container data-[state=on]:bg-secondary-container data-[state=on]:text-on-secondary-container',
        className,
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
