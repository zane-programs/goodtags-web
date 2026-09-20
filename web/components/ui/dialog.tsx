import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

/**
 * Full-window modal surfaces (the search dialog and the action menu). The native app shows
 * these without a system animation, so none is applied here; callers animate their content.
 */
function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn('fixed inset-0 z-50', className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  title,
  overlay,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** Announced to assistive technology; these surfaces have no visible title natively. */
  title: string
  overlay?: React.ReactNode
}) {
  return (
    <DialogPrimitive.Portal>
      {overlay}
      <DialogPrimitive.Content
        data-slot="dialog-content"
        aria-describedby={undefined}
        className={cn('fixed inset-0 z-50 font-app text-on-surface outline-none', className)}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

const DialogClose = DialogPrimitive.Close

export { Dialog, DialogClose, DialogContent, DialogOverlay }
