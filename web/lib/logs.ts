/**
 * In-session console capture for the logs screen, as the native app does: the latest 25
 * console entries, each tagged with the method that produced it.
 */
export type LogType = 'log' | 'info' | 'warn' | 'error' | 'debug'
export interface LogEntry {
  id: number
  date: string
  type: LogType
  message: string
}

const MAX_LOGS = 25
let entries: LogEntry[] = []
let nextId = 0
const listeners = new Set<() => void>()

function add(type: LogType, args: unknown[]) {
  const message = args
    .map(arg =>
      typeof arg === 'string' ? arg : arg instanceof Error ? arg.message : JSON.stringify(arg),
    )
    .join(' ')
  entries = [...entries, { id: ++nextId, date: new Date().toISOString(), type, message }].slice(
    -MAX_LOGS,
  )
  listeners.forEach(listener => listener())
}

let installed = false
export function captureConsole() {
  if (installed) return
  installed = true
  for (const type of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    const original = console[type].bind(console)
    console[type] = (...args: unknown[]) => {
      original(...args)
      add(type, args)
    }
  }
}

export const getLogs = () => entries
export function clearLogs() {
  entries = []
  listeners.forEach(listener => listener())
}
export function subscribeLogs(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
