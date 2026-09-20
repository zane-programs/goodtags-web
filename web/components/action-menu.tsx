import { AnimatePresence, motion } from 'motion/react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'
import { Icon } from './ui/icon'

export interface MenuAction {
  icon: string
  label: string
  onPress: () => void
}

const inOut = [0.42, 0, 0.58, 1] as const

/**
 * FABDown.tsx: the speed-dial that drops from the header's menu button. There is no resting
 * FAB; opening shows a near-opaque surface scrim and right-aligned label + mini-FAB rows that
 * fade in while sliding down 16px, staggered 15ms from the last row upward.
 */
export function ActionMenu({
  open,
  onOpenChange,
  actions,
  title,
  className,
  container,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: MenuAction[]
  title: string
  /** Sets where the first row starts; lists and the tag screen differ. */
  className?: string
  /**
   * Lists render the menu inside their own screen, so the tab bar stays clear and usable
   * (natively only the tag screen's menu is portaled over everything).
   */
  container?: HTMLElement | null
}) {
  const position = container ? 'absolute' : 'fixed'
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={!container}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount container={container}>
            <motion.div
                aria-hidden="true"
                className={cn(position, 'inset-0 z-50 bg-surface/95')}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.125, ease: inOut } }}
                exit={{ opacity: 0, transition: { duration: 0.2, ease: inOut } }}
              />
            <DialogPrimitive.Content
              forceMount
              aria-describedby={undefined}
              onClick={() => onOpenChange(false)}
              onInteractOutside={() => onOpenChange(false)}
              className={cn(
                position,
                'inset-0 z-50 flex flex-col items-stretch font-app outline-none',
                className,
              )}
            >
              <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
              {actions.map((action, index) => (
                <motion.button
                  key={action.label}
                  type="button"
                  className="group flex w-full cursor-pointer touch-manipulation items-center justify-end px-6 pb-4 text-on-surface outline-none select-none [-webkit-tap-highlight-color:transparent]"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{
                    opacity: 1,
                    y: 8,
                    transition: {
                      duration: 0.15,
                      ease: inOut,
                      delay: (actions.length - 1 - index) * 0.015,
                    },
                  }}
                  exit={{ opacity: 0, y: 8, transition: { duration: 0.15, ease: inOut } }}
                  onClick={event => {
                    event.stopPropagation()
                    action.onPress()
                    onOpenChange(false)
                  }}
                >
                  <span className="mx-4 my-2 px-3 py-1.5 text-body-lg">{action.label}</span>
                  <span className="grid size-10 place-content-center rounded-[27px] bg-elevation-3 text-on-primary-container shadow-level-3 group-focus-visible:ring-3 group-focus-visible:ring-ring group-active:bg-elevation-5">
                    <Icon path={action.icon} />
                  </span>
                </motion.button>
              ))}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
