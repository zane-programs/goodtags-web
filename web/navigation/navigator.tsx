import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import {
  pathOf,
  popped,
  pushPath,
  stateFromPath,
  tabPaths,
  type NavState,
  type Route,
  type TabName,
} from './routes'

interface Navigation {
  state: NavState
  /** navigation.navigate(): adds a screen with the native fade. */
  push: (path: string) => void
  /** Desktop rail: opens `path` on a fresh stack instead of piling onto the current one. */
  jump: (path: string) => void
  /** navigation.goBack() */
  back: () => void
  /** Swaps the focused root screen's path in place (previous/next tag): no transition. */
  replaceTop: (path: string, params: Record<string, string>) => void
  /** Tab press: instant switch; pressing the focused tab pops its stack to the top. */
  switchTab: (tab: TabName) => void
  /** True while the browser itself is animating a history swipe, so we must not also fade. */
  instant: boolean
}

const NavigationContext = createContext<Navigation | null>(null)
const RouteContext = createContext<{ route: Route; focused: boolean } | null>(null)

export function useNavigation() {
  const value = useContext(NavigationContext)
  if (!value) throw new Error('NavigationProvider is missing')
  return value
}

/** The route a screen was rendered for, and whether it is the focused screen. */
export function useRoute() {
  const value = useContext(RouteContext)
  if (!value) throw new Error('useRoute must be used inside a screen')
  return value
}

export function useIsFocused() {
  return useRoute().focused
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const type = useNavigationType()
  const inApp = useRef(false)
  const state = useMemo<NavState>(
    () =>
      (location.state as { nav?: NavState } | null)?.nav ??
      stateFromPath(location.pathname + location.search),
    [location.state, location.pathname, location.search],
  )
  // A history pop we did not start is the browser's back/forward control. On touch devices
  // that is usually the system edge swipe, which already slides the page.
  const instant =
    type === 'POP' && !inApp.current && matchMedia('(pointer: coarse)').matches
  useEffect(() => {
    inApp.current = false
  }, [location.key])

  const go = useCallback(
    (next: NavState, replace = false) =>
      navigate(pathOf(next), { replace, state: { nav: next } }),
    [navigate],
  )
  const value = useMemo<Navigation>(
    () => ({
      state,
      instant,
      push: path => go(pushPath(state, path)),
      jump: path => go(pushPath({ ...state, home: [], root: [] }, path)),
      back: () => {
        inApp.current = true
        if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
        else go(popped(state) ?? state, true)
      },
      replaceTop: (path, params) =>
        go({ ...state, root: state.root.map((r, i, all) => (i === all.length - 1 ? { ...r, path, params } : r)) }, true),
      switchTab: tab =>
        go({ ...state, root: [], tab, home: tab === 'home' && state.tab === 'home' ? [] : state.home }, true),
    }),
    [state, instant, go, navigate],
  )
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

/** react-native-screens `animation: 'fade'`: 0.5s ease-in-out on the screen above. */
const fade = { duration: 0.5, ease: 'easeInOut' } as const

/**
 * A native stack. Every route stays mounted (state and scroll survive, as with
 * freezeOnBlur); only the focused screen is visible and interactive. A pushed screen fades
 * in over the previous one; a popped screen fades out to reveal the one beneath.
 */
export function StackView({
  routes,
  focused = true,
  render,
}: {
  routes: Route[]
  focused?: boolean
  render: (route: Route) => ReactNode
}) {
  const { instant } = useNavigation()
  const topKey = routes.at(-1)?.key
  // The screen beneath stays visible until the pushed screen above has finished fading in.
  // Derived during render so there is never a frame with neither screen showing.
  const [settled, setSettled] = useState(topKey)
  const known = useRef(new Set(routes.map(r => r.key)))
  useEffect(() => {
    if (topKey && known.current.has(topKey)) setSettled(topKey)
    known.current = new Set(routes.map(r => r.key))
  }, [topKey, routes])
  return (
    <AnimatePresence initial={false} custom={instant}>
      {routes.map((route, index) => {
        const isTop = index === routes.length - 1
        const beneathEntering = index === routes.length - 2 && settled !== topKey
        return (
          <motion.div
            key={route.key}
            custom={instant}
            variants={{
              hidden: { opacity: 0 },
              shown: (skip: boolean) => ({ opacity: 1, transition: skip ? { duration: 0 } : fade }),
              gone: (skip: boolean) => ({ opacity: 0, transition: skip ? { duration: 0 } : fade }),
            }}
            initial="hidden"
            animate="shown"
            exit="gone"
            onAnimationComplete={() => isTop && setSettled(route.key)}
            inert={!isTop || !focused}
            className={cn(
              'absolute inset-0 flex flex-col overflow-hidden bg-surface',
              !isTop && !beneathEntering && 'invisible',
            )}
            style={{ zIndex: index }}
          >
            <RouteContext.Provider value={{ route, focused: isTop && focused }}>
              {render(route)}
            </RouteContext.Provider>
          </motion.div>
        )
      })}
    </AnimatePresence>
  )
}

export { tabPaths }
