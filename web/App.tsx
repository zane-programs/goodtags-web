import { useEffect, type ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useLibrary } from './lib/store'
import { refreshCatalog } from './lib/catalog'
import { StackView, useNavigation } from './navigation/navigator'
import type { Route, TabName } from './navigation/routes'
import { Sidebar, TabBar } from './navigation/tab-bar'
import { snackbar } from './components/ui/snackbar'
import { AppHeader, BackButton } from './components/app-header'
import { Empty } from './components/ui/empty'
import { AboutScreen, HomeScreen, WelcomeScreen } from './screens/home'
import {
  CollectionScreen,
  FavoritesScreen,
  HistoryScreen,
  LabeledScreen,
} from './screens/list-screens'
import { SearchScreen } from './screens/search'
import { CreateLabelScreen, LabelEditorScreen, LabelsScreen } from './screens/labels'
import { DataScreen, LogsScreen, OptionsScreen } from './screens/settings'
import { RandomScreen, TagLabelsScreen, TagScreen, TagVideosScreen } from './screens/tag'

function NotFoundScreen() {
  return (
    <>
      <AppHeader title="goodtags" left={<BackButton />} />
      <Empty>page not found</Empty>
    </>
  )
}

const screens: Record<Route['name'], () => ReactNode> = {
  collection: CollectionScreen,
  labels: LabelsScreen,
  labelEditor: LabelEditorScreen,
  labeled: LabeledScreen,
  options: OptionsScreen,
  data: DataScreen,
  tag: TagScreen,
  tagLabels: TagLabelsScreen,
  tagVideos: TagVideosScreen,
  random: RandomScreen,
  about: AboutScreen,
  logs: LogsScreen,
  createLabel: CreateLabelScreen,
  notFound: NotFoundScreen,
}

function renderScreen(route: Route) {
  const Screen = screens[route.name]
  return <Screen />
}

const homeRoot: Route = { key: 'home', name: 'notFound', path: '/', params: {} }

/** A tab stays mounted once visited and is simply hidden while another tab is showing. */
function TabPane({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      inert={!active}
      className={active ? 'absolute inset-0 flex flex-col' : 'invisible absolute inset-0 flex flex-col'}
    >
      {children}
    </div>
  )
}

const visited = new Set<TabName>()

/** TabNavigator.tsx: four tabs, the first holding the home stack. */
function Tabs({ focused }: { focused: boolean }) {
  const { state } = useNavigation()
  visited.add(state.tab)
  return (
    <>
      <div className="relative min-h-0 flex-1">
        <TabPane active={state.tab === 'home'}>
          <div className="relative min-h-0 flex-1">
            <StackView
              routes={[homeRoot, ...state.home]}
              focused={focused && state.tab === 'home'}
              render={route => (route === homeRoot ? <HomeScreen /> : renderScreen(route))}
            />
          </div>
        </TabPane>
        {visited.has('search') && (
          <TabPane active={state.tab === 'search'}>
            <SingleScreen route={searchRoot} focused={focused && state.tab === 'search'}>
              <SearchScreen />
            </SingleScreen>
          </TabPane>
        )}
        {visited.has('favorites') && (
          <TabPane active={state.tab === 'favorites'}>
            <SingleScreen route={favoritesRoot} focused={focused && state.tab === 'favorites'}>
              <FavoritesScreen />
            </SingleScreen>
          </TabPane>
        )}
        {visited.has('history') && (
          <TabPane active={state.tab === 'history'}>
            <SingleScreen route={historyRoot} focused={focused && state.tab === 'history'}>
              <HistoryScreen />
            </SingleScreen>
          </TabPane>
        )}
      </div>
      <TabBar />
    </>
  )
}

const searchRoot: Route = { key: 'search', name: 'notFound', path: '/search', params: {} }
const favoritesRoot: Route = { key: 'favorites', name: 'notFound', path: '/favorites', params: {} }
const historyRoot: Route = { key: 'history', name: 'notFound', path: '/history', params: {} }

function SingleScreen({
  route,
  focused,
  children,
}: {
  route: Route
  focused: boolean
  children: ReactNode
}) {
  return (
    <div className="relative min-h-0 flex-1">
      <StackView routes={[route]} focused={focused} render={() => children} />
    </div>
  )
}

const tabsRoute: Route = { key: 'tabs', name: 'notFound', path: '/', params: {} }
const welcomeRoute: Route = { key: 'welcome', name: 'notFound', path: '/', params: {} }

/** RootStackNavigator.tsx */
export default function App() {
  const { library, update, storageError } = useLibrary()
  const { state } = useNavigation()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    document.documentElement.dataset.font = library.options.serifs ? 'serif' : 'sans'
  }, [library.options.serifs])
  useEffect(() => {
    if (storageError) snackbar(storageError)
  }, [storageError])
  // The native app picks up a new search database quietly after launch.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (navigator.onLine) void refreshCatalog(false).catch(() => {})
    }, 15000)
    return () => clearTimeout(timer)
  }, [])
  // App updates are offered once, and otherwise apply quietly the next time the app is
  // backgrounded, as an app-store update would.
  useEffect(() => {
    if (!needRefresh) return
    snackbar('a new version of goodtags is ready', {
      action: 'update',
      onAction: () => void updateServiceWorker(true),
    })
    const apply = () => document.visibilityState === 'hidden' && void updateServiceWorker(true)
    document.addEventListener('visibilitychange', apply)
    return () => document.removeEventListener('visibilitychange', apply)
  }, [needRefresh, updateServiceWorker])

  const welcome = !library.welcomed && !storageError
  const routes = welcome ? [welcomeRoute] : [tabsRoute, ...state.root]
  return (
    <div className="fixed inset-0 flex bg-surface font-app text-on-surface">
      {!welcome && <Sidebar />}
      <div className="relative min-w-0 flex-1">
        <StackView
          routes={routes}
          render={route =>
            route === welcomeRoute ? (
              <WelcomeScreen onEnter={() => update(s => ({ ...s, welcomed: true }))} />
            ) : route === tabsRoute ? (
              <Tabs focused={state.root.length === 0} />
            ) : (
              renderScreen(route)
            )
          }
        />
      </div>
    </div>
  )
}
