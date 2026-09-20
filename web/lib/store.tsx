import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { snackbar } from '@/components/ui/snackbar'
import { emptyLibrary, type Library } from './types'
import { readLibrary } from './library'
const KEY = 'goodtags.library.v1'
interface Store {
  library: Library
  update: (change: (value: Library) => Library, allowRecovery?: boolean) => boolean
  storageError: string
}
const Context = createContext<Store | null>(null)
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    try {
      return { library: readLibrary(localStorage.getItem(KEY)), error: '' }
    } catch {
      return {
        library: emptyLibrary(),
        error:
          'Saved data could not be read. Your existing data has been left untouched. Restore a backup or allow browser storage, then reload.',
      }
    }
  })
  const [library, setLibrary] = useState(initial.library)
  const [storageError, setStorageError] = useState(initial.error)
  const current = useRef(library)
  const blocked = useRef(Boolean(initial.error))
  const update = useCallback(
    (change: (value: Library) => Library, allowRecovery = false) => {
      if (blocked.current && !allowRecovery) {
        snackbar(initial.error)
        return false
      }
      try {
        const next = change(current.current)
        if (blocked.current && allowRecovery) {
          const damaged = localStorage.getItem(KEY)
          if (damaged) localStorage.setItem(`${KEY}.recovery`, damaged)
        }
        localStorage.setItem(KEY, JSON.stringify(next))
        blocked.current = false
        current.current = next
        setLibrary(next)
        setStorageError('')
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not save changes'
        setStorageError(message)
        snackbar(message)
        return false
      }
    },
    [initial.error],
  )
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== KEY) return
      try {
        const next = readLibrary(event.newValue)
        current.current = next
        blocked.current = false
        setLibrary(next)
        setStorageError('')
      } catch {
        setStorageError('Changes from another tab could not be read. Reload to try again.')
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  return <Context.Provider value={{ library, update, storageError }}>{children}</Context.Provider>
}
export function useLibrary() {
  const context = useContext(Context)
  if (!context) throw new Error('LibraryProvider is missing')
  return context
}
