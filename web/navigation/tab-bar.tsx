import { mdiHeartOutline, mdiHistory, mdiHome, mdiMagnify } from '@mdi/js'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { Logo } from '@/components/app-header'
import { homeGroups } from '@/screens/home'
import { useNavigation } from './navigator'
import { tabPaths, type TabName } from './routes'

const tabs: { name: TabName; label: string; icon: string }[] = [
  { name: 'home', label: 'home', icon: mdiHome },
  { name: 'search', label: 'search', icon: mdiMagnify },
  { name: 'favorites', label: 'faves', icon: mdiHeartOutline },
  { name: 'history', label: 'history', icon: mdiHistory },
]

function useTabLink(name: TabName) {
  const { switchTab } = useNavigation()
  return {
    href: tabPaths[name],
    onClick: (event: React.MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return
      event.preventDefault()
      switchTab(name)
    },
  }
}

function Tab({ name, label, icon, active }: (typeof tabs)[number] & { active: boolean }) {
  return (
    <a
      {...useTabLink(name)}
      aria-label={`tab_${label}`}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-1 touch-manipulation items-center justify-center pt-1 outline-none select-none [-webkit-tap-highlight-color:transparent] focus-visible:bg-elevation-5',
        active ? 'text-tab-active' : 'text-on-surface-variant',
      )}
    >
      {/* Icons are 1.3x the navigator's size: 32.5 regular, 23.4 in compact landscape. */}
      <Icon path={icon} className="size-[32.5px] shallow:size-[23.4px]" />
      <span className="mr-3 ml-[5px] hidden text-[14px] leading-6 landscape:inline">{label}</span>
    </a>
  )
}

/** TabNavigator.tsx's bar: icons only in portrait, icon + label side by side in landscape. */
export function TabBar() {
  const { state } = useNavigation()
  return (
    <nav
      aria-label="tabs"
      className="flex h-tabbar shrink-0 border-t border-outline-variant bg-elevation-2 pt-[5px] pr-safe-r pb-safe-b pl-safe-l shallow:h-tabbar-shallow desktop:hidden"
    >
      {tabs.map(tab => (
        <Tab key={tab.name} {...tab} active={state.tab === tab.name} />
      ))}
    </nav>
  )
}

const sideLink =
  'flex min-h-12 touch-manipulation items-center gap-4 rounded-full px-4 text-body-md outline-none select-none focus-visible:ring-3 focus-visible:ring-ring active:bg-on-surface/12'

function SideTab({ name, label, icon, active }: (typeof tabs)[number] & { active: boolean }) {
  return (
    <a
      {...useTabLink(name)}
      aria-current={active ? 'page' : undefined}
      className={cn(sideLink, active && 'bg-secondary-container text-on-secondary-container')}
    >
      <Icon path={icon} className={active ? 'text-tab-active' : 'text-on-surface-variant'} />
      {label}
    </a>
  )
}

/** Wide windows replace the bottom tabs with a rail; everything else is the same app. */
export function Sidebar() {
  const { state, jump } = useNavigation()
  const focused = state.root.at(-1)?.path ?? state.home.at(-1)?.path
  return (
    <nav
      aria-label="tabs"
      className="hidden w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-outline-variant bg-elevation-2 p-3 text-on-surface desktop:flex"
    >
      <Logo size={32} className="px-4 pt-2 pb-4 text-primary" />
      {tabs.map(tab => (
        <SideTab key={tab.name} {...tab} active={state.tab === tab.name && !focused} />
      ))}
      <hr className="my-2 border-outline-variant" />
      {homeGroups.flat().map(item => (
        <a
          key={item.path}
          href={item.path}
          aria-current={focused === item.path ? 'page' : undefined}
          onClick={event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey) return
            event.preventDefault()
            if (focused !== item.path) jump(item.path)
          }}
          className={cn(
            sideLink,
            focused === item.path && 'bg-secondary-container text-on-secondary-container',
          )}
        >
          <Icon path={item.icon} className="text-on-surface-variant" />
          {item.title}
        </a>
      ))}
    </nav>
  )
}
