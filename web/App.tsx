import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Menu,
  Home,
  Search,
  Heart,
  History,
  Star,
  Landmark,
  Baby,
  Leaf,
  Shuffle,
  Info,
  Settings,
  Tags,
  Database,
  Download,
  WifiOff,
} from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useLibrary } from './lib/store'
import { usePwa } from './hooks/usePwa'
import { refreshCatalog } from './lib/catalog'
import { Button } from './components/ui/button'
import { IconButton } from './components/IconButton'
import { Modal } from './components/Modal'
import { BrowsePage } from './pages/BrowsePage'
import { LabelsPage } from './pages/LabelsPage'
import { DataPage, OptionsPage, AboutPage, LogsPage } from './pages/SettingsPages'
import { RandomPage, DirectTagPage } from './pages/TagPage'
import './styles/native-navigation.css'
export const homeItems = [
  { path: '/popular', title: 'popular', icon: Star },
  { path: '/classic', title: 'classic', icon: Landmark },
  { path: '/easy', title: 'easy', icon: Baby },
  { path: '/new', title: 'new', icon: Leaf },
  { path: '/random', title: 'random', icon: Shuffle },
  { path: '/about', title: 'about', icon: Info },
  { path: '/options', title: 'options', icon: Settings },
  { path: '/labels', title: 'labels', icon: Tags },
  { path: '/data', title: 'data', icon: Database },
]
const tabs = [
  { path: '/', title: 'home', icon: Home },
  { path: '/search', title: 'search', icon: Search },
  { path: '/favorites', title: 'faves', icon: Heart },
  { path: '/history', title: 'history', icon: History },
]
export default function App() {
  const { library, update, storageError } = useLibrary()
  const location = useLocation(),
    navigate = useNavigate()
  const pwa = usePwa()
  const [installOpen, setInstallOpen] = useState(false)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()
  useEffect(() => {
    const install = () => setInstallOpen(true)
    window.addEventListener('goodtags:install', install)
    return () => window.removeEventListener('goodtags:install', install)
  }, [])
  useEffect(() => {
    if (offlineReady) {
      toast.success('goodtags is ready to use offline.', { id: 'offline-ready' })
      setOfflineReady(false)
    }
  }, [offlineReady, setOfflineReady])
  const path = location.pathname
  const detail = /\/tag\/\d+/.test(path) || path === '/random'
  const section = path.split('/')[1]
  const isList = ['popular', 'classic', 'easy', 'new', 'search', 'favorites', 'history'].includes(section) || (section === 'labels' && !!path.split('/')[2])
  const tabRoot = ['/', '/search', '/favorites', '/history'].includes(path)
  const TitleIcon = homeItems.find(item => item.path === `/${section}`)?.icon || tabs.find(item => item.path === `/${section}`)?.icon
  const title =
    section === 'favorites'
      ? 'faves'
      : section === 'labels' && path.split('/')[2]
        ? decodeURIComponent(path.split('/')[2])
        : section || 'goodtags'
  useEffect(() => {
    document.documentElement.dataset.font = library.options.serifs ? 'serif' : 'sans'
  }, [library.options.serifs])
  useEffect(() => {
    document.title = title === 'goodtags' ? 'goodtags' : `${title} · goodtags`
  }, [title])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (navigator.onLine) void refreshCatalog(false).catch(() => {})
    }, 15000)
    return () => clearTimeout(timer)
  }, [])
  if (!library.welcomed && !storageError && path === '/')
    return (
      <main className="welcome">
        <p>Welcome to</p>
        <h1 className="logo">goodtags</h1>
        <p>4.3.0</p>
        <p>by Kenji Matsuoka</p>
        <IconButton label="Enter goodtags" onClick={() => update(s => ({ ...s, welcomed: true }))}>
          <ArrowRight />
        </IconButton>
      </main>
    )
  return (
    <div className={`app-shell ${detail ? 'has-detail' : ''} section-${section || 'home'}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="logo" to="/">
          goodtags
        </Link>
        <nav aria-label="Main navigation">
          {tabs.map(({ path, title, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === '/'}>
              <Icon />
              <span>{title}</span>
            </NavLink>
          ))}
          <hr />
          {homeItems.map(({ path, title, icon: Icon }) => (
            <NavLink key={path} to={path}>
              <Icon />
              <span>{title}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>by Kenji Matsuoka</span>
          {!pwa.installed && (
            <Button variant="ghost" onClick={() => setInstallOpen(true)}>
              <Download /> Install goodtags
            </Button>
          )}
        </div>
      </aside>
      <div className="app-content">
        <header className="app-header">
          <div className="native-header-left">
            {!tabRoot && (
              <IconButton
                label="Go back"
                onClick={() => {
                  if (detail && path.includes('/tag/') && !path.startsWith('/tag/'))
                    navigate(path.split('/tag/')[0] + location.search)
                  else if (path.startsWith('/labels/')) navigate('/labels')
                  else navigate('/')
                }}
              >
                <ArrowLeft />
              </IconButton>
            )}
          </div>
          <h1 className={path === '/' ? 'logo' : undefined}>
            {isList ? (
              <button className="native-header-title" aria-label={`Scroll ${title} to top`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                {section !== 'search' && TitleIcon && <TitleIcon />}
                {section === 'search' ? <span className="sr-only">search</span> : title}
              </button>
            ) : title === 'tag' ? 'goodtags' : title}
          </h1>
          <div className="header-actions">
            {isList && !detail && (
              <IconButton className="native-list-menu-trigger" label="List menu" aria-haspopup="dialog" onClick={() => window.dispatchEvent(new Event('goodtags:list-menu'))}>
                <Menu />
              </IconButton>
            )}
            {!pwa.online && (
              <span className="network-status">
                <WifiOff size={18} />
                <span>offline</span>
              </span>
            )}
            {!pwa.installed && (
              <IconButton label="Install goodtags" onClick={() => setInstallOpen(true)}>
                <Download />
              </IconButton>
            )}
          </div>
        </header>
        {storageError && (
          <p role="alert" className="notice error">
            {storageError}
          </p>
        )}
        {needRefresh && (
          <div className="notice" role="status">
            An update is ready.{' '}
            <Button onClick={() => void updateServiceWorker(true)}>Update now</Button>
            <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
              Later
            </Button>
          </div>
        )}
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            {['popular', 'classic', 'easy', 'new', 'search', 'favorites', 'history'].map(page => (
              <Route
                key={page}
                path={`/${page}/*`}
                element={<BrowsePage key={page} kind={page} />}
              />
            ))}
            <Route path="/labels" element={<LabelsPage />} />
            <Route
              path="/labels/:label/*"
              element={<BrowsePage key={path.split('/')[2]} kind="label" />}
            />
            <Route path="/tag/:id" element={<DirectTagPage />} />
            <Route path="/random" element={<RandomPage />} />
            <Route path="/options" element={<OptionsPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route
              path="*"
              element={
                <div className="empty-state">
                  <h2>Page not found</h2>
                  <Link to="/">Go home</Link>
                </div>
              }
            />
          </Routes>
        </main>
        <nav className="bottom-tabs" aria-label="Tab navigation">
          {tabs.map(({ path, title, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              aria-label={title}
              className={({ isActive }) =>
                isActive || (path === '/' && !['search', 'favorites', 'history'].includes(section))
                  ? 'active'
                  : ''
              }
            >
              <Icon />
              <span>{title}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <Modal
        title="Install goodtags"
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        description="Keep your tags a tap away."
      >
        <p>Install goodtags for a full-screen app and offline access to the tag catalog.</p>
        {pwa.canPrompt ? (
          <Button onClick={() => void pwa.install().then(() => setInstallOpen(false))}>
            Install goodtags
          </Button>
        ) : (
          <>
            <p>
              <strong>iPhone or iPad:</strong> open this page in Safari, tap Share, then Add to Home
              Screen and Open as Web App.
            </p>
            <p>
              <strong>Android:</strong> open your browser’s menu and choose Install app or Add to
              Home screen.
            </p>
            <p>
              <strong>Desktop:</strong> use the install icon in your browser’s address bar or the
              Install option in its menu, when supported.
            </p>
          </>
        )}
        <p className="muted">
          Previously opened scores and downloaded tracks can work offline. Videos need an internet
          connection.
        </p>
      </Modal>
    </div>
  )
}
function HomePage() {
  return (
    <div className="home-grid">
      {[homeItems.slice(0, 4), homeItems.slice(4, 5), homeItems.slice(5)].map((group, i) => (
        <div className="home-group" key={i}>
          {group.map(({ path, title, icon: Icon }) => (
            <Link className="menu-row" to={path} key={path}>
              <Icon />
              <span>{title}</span>
              <ChevronRight className="chevron" />
            </Link>
          ))}
        </div>
      ))}
    </div>
  )
}
