import type { ReactNode, RefObject } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
export function Modal({
  title,
  description,
  open,
  onClose,
  children,
  variant = 'sheet',
  returnFocus,
}: {
  title: string
  description?: string
  open: boolean
  onClose: () => void
  children: ReactNode
  variant?: 'sheet' | 'score-menu'
  returnFocus?: RefObject<HTMLButtonElement | null>
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!value) onClose()
      }}
    >
      <DialogContent
        className={variant === 'score-menu' ? 'score-menu' : 'goodtags-dialog'}
        onCloseAutoFocus={event => {
          if (!returnFocus?.current?.getClientRects().length) return
          event.preventDefault()
          requestAnimationFrame(() => {
            // Switching from the action menu to a sheet must keep focus in that sheet.
            if (!document.querySelector('[role="dialog"]'))
              returnFocus.current?.focus({ preventScroll: true })
          })
        }}
      >
        <DialogHeader className={variant === 'score-menu' ? 'sr-only' : undefined}>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className={description ? '' : 'sr-only'}>
            {description || title}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
