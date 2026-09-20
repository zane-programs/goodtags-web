import type { SearchParams, SearchResult } from './types'
let worker: Worker | undefined
let id = 0
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>()
function request<T>(action: string, params = {}, force = false): Promise<T> {
  if (!worker) {
    worker = new Worker(new URL('./catalog.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }) => {
      const task = pending.get(data.id)
      if (data.error) task?.reject(new Error(data.error))
      else task?.resolve(data.result)
      pending.delete(data.id)
    }
    worker.onerror = () => {
      pending.forEach(task => task.reject(new Error('The catalog could not load. Please retry.')))
      pending.clear()
      worker?.terminate()
      worker = undefined
    }
  }
  return new Promise((resolve, reject) => {
    const taskId = ++id
    pending.set(taskId, { resolve, reject })
    worker!.postMessage({ id: taskId, action, params, force })
  })
}
export const searchCatalog = (params: SearchParams) => request<SearchResult>('search', params)
export const refreshCatalog = (force = true) => request<string>('refresh', {}, force)
