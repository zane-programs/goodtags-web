import * as React from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { cn } from '@/lib/utils'

/**
 * The native bottom sheet (@gorhom/bottom-sheet): sized to its content, capped at 90% of the
 * screen, 15px top corners, a small grey handle, a 30% black backdrop, drag down to close.
 */
function Drawer(props: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />
}

function DrawerContent({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & { title: string }) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay data-slot="drawer-overlay" className="fixed inset-0 z-50 bg-black/30" />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        aria-describedby={undefined}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full flex-col rounded-t-[15px] bg-surface font-app text-on-surface outline-none desktop:max-w-xl',
          className,
        )}
        {...props}
      >
        <DrawerPrimitive.Title className="sr-only">{title}</DrawerPrimitive.Title>
        <div aria-hidden="true" className="flex shrink-0 justify-center p-2.5">
          <span className="h-1 w-[7.5vw] rounded-xs bg-outline desktop:w-10" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  )
}

/** The two-row confirmation the native app shows before destructive actions. */
function ConfirmDrawer({
  open,
  onOpenChange,
  action,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: string
  onConfirm: () => void
}) {
  const row =
    'w-full cursor-pointer touch-manipulation py-[18px] text-center text-body-lg outline-none select-none [-webkit-tap-highlight-color:transparent] focus-visible:bg-surface-variant active:bg-surface-variant'
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent title={action}>
        <div className="pt-2 pr-[max(24px,calc(var(--spacing-safe-r)+24px))] pb-[max(24px,var(--spacing-safe-b))] pl-[max(24px,calc(var(--spacing-safe-l)+24px))]">
          <button
            type="button"
            className={cn(row, 'text-error')}
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {action}
          </button>
          <div className="border-t-[0.34px] border-outline-variant" />
          <button type="button" className={row} onClick={() => onOpenChange(false)}>
            cancel
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export { ConfirmDrawer, Drawer, DrawerContent }
