import React, { Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { LibraryProvider } from './lib/store'
import App from './App'
import './styles.css'
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    return this.state.error ? (
      <main className="empty-state">
        <h1>Something went wrong</h1>
        <p>Your saved library is still on this device.</p>
        <button onClick={() => location.reload()}>Reload goodtags</button>
      </main>
    ) : (
      this.props.children
    )
  }
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LibraryProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </LibraryProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
