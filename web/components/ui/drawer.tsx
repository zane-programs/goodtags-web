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

/**
 * A sheet with the native detents: it opens at its content height and can be dragged up to
 * 75% and then 90% of the screen (gorhom snapPoints ['75%', '90%'] with dynamic sizing).
 */
function DetentDrawer({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
}) {
  const [content, setContent] = React.useState(0)
  const [snap, setSnap] = React.useState<number | string | null>(null)
  // Content height plus the 24px handle, tracked as the content lays out or changes.
  const observer = React.useRef<ResizeObserver>(undefined)
  const measure = React.useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect()
    if (!node) return
    observer.current = new ResizeObserver(() => setContent(node.offsetHeight + 24))
    observer.current.observe(node)
  }, [])
  const height = typeof window === 'undefined' ? 800 : window.innerHeight
  const points = React.useMemo(() => {
    const first = Math.min(content || height * 0.5, height * 0.9)
    return [`${Math.round(first)}px`, ...[0.75, 0.9].filter(f => f * height > first + 1)]
  }, [content, height])
  React.useEffect(() => {
    if (open) setSnap(points[0])
  }, [open, points])
  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={points}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      fadeFromIndex={0}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <DrawerPrimitive.Content
          data-slot="drawer-content"
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-full w-full flex-col rounded-t-[15px] bg-surface font-app text-on-surface outline-none desktop:max-w-xl"
        >
          <DrawerPrimitive.Title className="sr-only">{title}</DrawerPrimitive.Title>
          <div aria-hidden="true" className="flex shrink-0 justify-center p-2.5">
            <span className="h-1 w-[7.5vw] rounded-xs bg-outline desktop:w-10" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div ref={measure}>{children}</div>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  )
}

function DrawerContent({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & { title: string }) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay
        data-slot="drawer-overlay"
        className="fixed inset-0 z-50 bg-black/30"
      />
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

export { ConfirmDrawer, DetentDrawer, Drawer, DrawerContent }
