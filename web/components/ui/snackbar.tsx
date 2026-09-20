import { useEffect, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from './button'

/**
 * Paper's Snackbar: one message at a time, pinned above the bottom safe area, dark inverse
 * surface, fades in over 200ms while scaling from 90%, fades out over 100ms.
 */
interface Message {
  id: number
  text: string
  action: string
  duration: number
  onAction?: () => void
}

let current: Message | null = null
let nextId = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(listener => listener())

export function snackbar(
  text: string,
  {
    action = 'close',
    duration = 7000,
    onAction,
  }: { action?: string; duration?: number; onAction?: () => void } = {},
) {
  current = { id: ++nextId, text, action, duration, onAction }
  emit()
}

function dismiss(id: number) {
  if (current?.id !== id) return
  current = null
  emit()
}

export function SnackbarHost() {
  const message = useSyncExternalStore(
    listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => dismiss(message.id), message.duration)
    return () => clearTimeout(timer)
  }, [message])
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center pr-safe-r pb-safe-b pl-safe-l">
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message.id}
            role="status"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="pointer-events-auto m-2 flex min-h-12 w-full max-w-xl items-center justify-between rounded-md bg-inverse-surface font-app text-inverse-on-surface shadow-level-3"
          >
            <span className="mx-4 my-3.5 text-body-md">{message.text}</span>
            <Button
              variant="text"
              size="compact"
              className="mr-2 px-3 font-black text-inverse-primary"
              onClick={() => {
                message.onAction?.()
                dismiss(message.id)
              }}
            >
              {message.action}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
