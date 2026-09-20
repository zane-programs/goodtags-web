interface Log {
  date: string
  message: string
}
const entries: Log[] = []
const listeners = new Set<() => void>()
export function log(message: string) {
  entries.unshift({ date: new Date().toISOString(), message })
  entries.splice(100)
  listeners.forEach(listener => listener())
}
export function getLogs() {
  return [...entries]
}
export function clearLogs() {
  entries.length = 0
  listeners.forEach(listener => listener())
}
export function subscribeLogs(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
