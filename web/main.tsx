import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LibraryProvider } from './lib/store'
import { captureConsole } from './lib/logs'
import { NavigationProvider } from './navigation/navigator'
import { SnackbarHost } from './components/ui/snackbar'
import { Button } from './components/ui/button'
import App from './App'
import './styles.css'

captureConsole()
// iOS Safari only applies :active styles (our press feedback) once a touch listener exists.
document.addEventListener('touchstart', () => {}, { passive: true })

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-primary p-5 text-center font-app text-body-md text-on-primary">
        <p>something went wrong. your favorites and labels are still saved on this device.</p>
        <Button variant="tonal" onClick={() => location.reload()}>
          reload goodtags
        </Button>
      </main>
    )
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LibraryProvider>
        <BrowserRouter>
          <NavigationProvider>
            <App />
          </NavigationProvider>
        </BrowserRouter>
        <SnackbarHost />
      </LibraryProvider>
    </ErrorBoundary>
  </StrictMode>,
)
