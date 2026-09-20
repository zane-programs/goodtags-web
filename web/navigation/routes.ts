/**
 * The native navigator tree (src/navigation), expressed as URL patterns.
 *
 *   root stack ── tabs ──┬─ home tab ── home stack (collections, labels, options, data)
 *                        ├─ search tab
 *                        ├─ favorites tab
 *                        └─ history tab
 *              ── full-screen pushes above the tabs (tag, random, about, logs, ...)
 */
export type TabName = 'home' | 'search' | 'favorites' | 'history'
export type CollectionKind = 'popular' | 'classic' | 'easy' | 'new'
export type ScreenName =
  | 'collection'
  | 'labels'
  | 'labelEditor'
  | 'labeled'
  | 'options'
  | 'data'
  | 'tag'
  | 'tagLabels'
  | 'tagVideos'
  | 'random'
  | 'about'
  | 'logs'
  | 'createLabel'
  | 'notFound'

export interface Route {
  key: string
  name: ScreenName
  path: string
  params: Record<string, string>
}

/** A serializable snapshot of the navigator, stored in each history entry. */
export interface NavState {
  tab: TabName
  home: Route[]
  root: Route[]
}

export const tabPaths: Record<TabName, string> = {
  home: '/',
  search: '/search',
  favorites: '/favorites',
  history: '/history',
}

const homeScreens: [RegExp, ScreenName, string[]][] = [
  [/^\/(popular|classic|easy|new)$/, 'collection', ['kind']],
  [/^\/labels$/, 'labels', []],
  [/^\/labels\/edit$/, 'labelEditor', []],
  [/^\/label\/([^/]+)$/, 'labeled', ['label']],
  [/^\/options$/, 'options', []],
  [/^\/data$/, 'data', []],
]
const rootScreens: [RegExp, ScreenName, string[]][] = [
  [/^\/random$/, 'random', []],
  [/^\/about$/, 'about', []],
  [/^\/logs$/, 'logs', []],
  [/^\/labels\/new$/, 'createLabel', []],
]

let counter = 0
function route(
  name: ScreenName,
  path: string,
  params: Record<string, string>,
  stable: boolean,
): Route {
  return { key: stable ? `${name}:${path}` : `${name}:${path}#${++counter}`, name, path, params }
}

function match(
  table: [RegExp, ScreenName, string[]][],
  path: string,
  stable: boolean,
): Route | undefined {
  // A query string carries extra params (e.g. /labels/new?tag=5) but never selects the screen.
  const [pathname, query = ''] = path.split('?')
  for (const [pattern, name, names] of table) {
    const found = pathname.match(pattern)
    if (found)
      return route(
        name,
        path,
        {
          ...Object.fromEntries(new URLSearchParams(query)),
          ...Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(found[i + 1])])),
        },
        stable,
      )
  }
}

const tagPattern = /^(.*)\/tag\/(\d+)(?:\/(labels|videos))?$/

/**
 * Links arrive decorated by whoever shared them ('/?fbclid=…', '/tag/5?utm_source=…',
 * '/popular/'). Only the pathname selects a screen; the query is kept solely as params
 * for the screens that read them, so an unknown one can never make a page "not found".
 */
function parts(path: string) {
  const [raw, query = ''] = path.split('#')[0].split('?')
  const pathname = raw.replace(/\/+$/, '') || '/'
  return { pathname, withQuery: query ? `${pathname}?${query}` : pathname }
}

/** Where a tag's list lives: '/popular/tag/5' belongs to the list at '/popular'. */
export function listPathOf(path: string) {
  return path.match(tagPattern)?.[1] ?? ''
}

export const emptyNav = (): NavState => ({ tab: 'home', home: [], root: [] })

/**
 * Builds the navigator state a path implies, including the screens beneath it, so a deep
 * link or reload lands on a stack whose back button behaves as it would natively.
 */
export function stateFromPath(path: string): NavState {
  const state = emptyNav()
  const { pathname, withQuery } = parts(path)
  const tagged = pathname.match(tagPattern)
  const base = tagged ? tagged[1] || '/' : pathname
  const tab = (Object.keys(tabPaths) as TabName[]).find(name => tabPaths[name] === base)
  if (tab) state.tab = tab
  else {
    const home = match(homeScreens, tagged ? base : withQuery, true)
    const root = match(rootScreens, tagged ? base : withQuery, true)
    if (home) {
      if (home.name === 'labeled' || home.name === 'labelEditor')
        state.home.push(route('labels', '/labels', {}, true))
      state.home.push(home)
    } else if (root) {
      if (root.name === 'logs') state.home.push(route('data', '/data', {}, true))
      if (root.name === 'createLabel') state.home.push(route('labels', '/labels', {}, true))
      state.root.push(root)
    } else if (!tagged) state.root.push(route('notFound', path, {}, true))
  }
  if (tagged) {
    const [, prefix, id, sub] = tagged
    const tagPath = `${prefix}/tag/${id}`
    if (prefix !== '/random') state.root.push(route('tag', tagPath, { id, list: prefix }, true))
    if (sub)
      state.root.push(
        route(sub === 'labels' ? 'tagLabels' : 'tagVideos', `${tagPath}/${sub}`, { id }, true),
      )
  }
  return state
}

/** Applies a push of `path` to `state`, as navigation.navigate() would natively. */
export function pushPath(state: NavState, path: string): NavState {
  const { pathname, withQuery } = parts(path)
  const tab = (Object.keys(tabPaths) as TabName[]).find(name => tabPaths[name] === pathname)
  if (tab) return { ...state, tab, root: [], home: tab === 'home' ? [] : state.home }
  const home = match(homeScreens, withQuery, false)
  if (home) return { tab: 'home', home: [...state.home, home], root: [] }
  const root = match(rootScreens, withQuery, false)
  if (root) return { ...state, root: [...state.root, root] }
  const tagged = pathname.match(tagPattern)
  if (tagged) {
    const [, prefix, id, sub] = tagged
    const name = sub === 'labels' ? 'tagLabels' : sub === 'videos' ? 'tagVideos' : 'tag'
    return { ...state, root: [...state.root, route(name, pathname, { id, list: prefix }, false)] }
  }
  return { ...state, root: [...state.root, route('notFound', path, {}, false)] }
}

/** The URL that represents the focused screen of `state`. */
export function pathOf(state: NavState): string {
  const top = state.root.at(-1) ?? (state.tab === 'home' ? state.home.at(-1) : undefined)
  return top?.path ?? tabPaths[state.tab]
}

/** `state` with its focused screen removed, or undefined at a tab root. */
export function popped(state: NavState): NavState | undefined {
  if (state.root.length) return { ...state, root: state.root.slice(0, -1) }
  if (state.tab === 'home' && state.home.length) return { ...state, home: state.home.slice(0, -1) }
  if (state.tab !== 'home') return { ...state, tab: 'home' }
}
