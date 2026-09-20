import { useRef, useState, type ReactNode, type RefObject } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'

/** The native information/track sheets size to content and can expand or drag down to close. */
export function NativeSheet({ title, open, onClose, returnFocus, children, hideTitle = false, className = '' }: {
  title: string; open: boolean; onClose: () => void; returnFocus: RefObject<HTMLButtonElement | null>;
  children: ReactNode; hideTitle?: boolean; className?: string
}) {
  const dragStart = useRef<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  return <Dialog open={open} onOpenChange={value => { if (!value) { setExpanded(false); onClose() } }}>
    <DialogContent className={`goodtags-dialog native-sheet ${expanded ? 'sheet-expanded' : ''} ${className}`} overlayClassName="native-sheet-backdrop" showCloseButton={false}
      onCloseAutoFocus={event => {
        if (returnFocus.current?.getClientRects().length) {
          event.preventDefault()
          requestAnimationFrame(() => { if (!document.querySelector('[role="dialog"]')) returnFocus.current?.focus({ preventScroll: true }) })
        }
      }}>
      <button className="sheet-handle" aria-label={expanded ? 'Collapse sheet' : 'Expand sheet'}
        onPointerDown={event => { dragStart.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId) }}
        onPointerUp={event => {
          if (dragStart.current === null) return
          const distance = event.clientY - dragStart.current
          dragStart.current = null
          if (distance > 50) { if (expanded) setExpanded(false); else onClose() }
          else if (distance < -30) setExpanded(true)
        }}
        onPointerCancel={() => { dragStart.current = null }}
        onClick={event => { if (event.detail === 0) setExpanded(value => !value) }}><span /></button>
      <DialogTitle className={hideTitle ? 'sr-only' : 'native-sheet-title'}>{title}</DialogTitle>
      <DialogDescription className="sr-only">Drag the handle down to close, or press Escape.</DialogDescription>
      {children}
      <button className="sheet-keyboard-close" aria-label="Close" onClick={onClose}>close</button>
    </DialogContent>
  </Dialog>
}
