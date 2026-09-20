import { useEffect, useState } from 'react'
interface InstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: string }>
}
export function usePwa() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [installed, setInstalled] = useState(
    () =>
      matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
  )
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const before = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }
    const done = () => {
      setInstalled(true)
      setPrompt(null)
    }
    const network = () => setOnline(navigator.onLine)
    addEventListener('beforeinstallprompt', before)
    addEventListener('appinstalled', done)
    addEventListener('online', network)
    addEventListener('offline', network)
    return () => {
      removeEventListener('beforeinstallprompt', before)
      removeEventListener('appinstalled', done)
      removeEventListener('online', network)
      removeEventListener('offline', network)
    }
  }, [])
  return {
    installed,
    online,
    canPrompt: Boolean(prompt),
    install: async () => {
      if (prompt) {
        await prompt.prompt()
        await prompt.userChoice
        setPrompt(null)
      }
    },
  }
}
