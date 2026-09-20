import { useEffect } from 'react'
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined,
      disposed = false
    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (disposed) await next.release()
        else lock = next
      } catch {
        /* browser or battery policy can deny this */
      }
    }
    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      disposed = true
      void lock?.release()
      document.removeEventListener('visibilitychange', acquire)
    }
  }, [enabled])
}
