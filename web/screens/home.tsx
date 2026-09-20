import { Fragment } from 'react'
import {
  mdiArrowLeft,
  mdiArrowRight,
  mdiChevronRight,
  mdiCogOutline,
  mdiDatabase,
  mdiInformationOutline,
  mdiLeaf,
  mdiPillar,
  mdiShuffle,
  mdiStar,
  mdiTagMultipleOutline,
  mdiTeddyBear,
} from '@mdi/js'
import { APP_VERSION } from '@/lib/version'
import { useNavigation } from '@/navigation/navigator'
import { AppHeader, Logo } from '@/components/app-header'
import { IconButton } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemSeparator } from '@/components/ui/item'

export const homeGroups = [
  [
    { path: '/popular', title: 'popular', icon: mdiStar },
    { path: '/classic', title: 'classic', icon: mdiPillar },
    { path: '/easy', title: 'easy', icon: mdiTeddyBear },
    { path: '/new', title: 'new', icon: mdiLeaf },
  ],
  [{ path: '/random', title: 'random', icon: mdiShuffle }],
  [
    { path: '/about', title: 'about', icon: mdiInformationOutline },
    { path: '/options', title: 'options', icon: mdiCogOutline },
    { path: '/labels', title: 'labels', icon: mdiTagMultipleOutline },
    { path: '/data', title: 'data', icon: mdiDatabase },
  ],
]

/** A navigation row inside an ItemGroup: icon, title, chevron. */
export function NavRow({
  icon,
  title,
  path,
  onPress,
  disabled,
}: {
  icon: string
  title: string
  path?: string
  onPress?: () => void
  disabled?: boolean
}) {
  const { push } = useNavigation()
  const content = (
    <>
      <ItemMedia>
        <Icon path={icon} size={20} />
      </ItemMedia>
      <ItemContent>{title}</ItemContent>
      <ItemActions>
        <Icon path={mdiChevronRight} />
      </ItemActions>
    </>
  )
  return (
    <Item asChild>
      {path ? (
        <a
          href={path}
          onClick={event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey) return
            event.preventDefault()
            push(path)
          }}
        >
          {content}
        </a>
      ) : (
        <button type="button" disabled={disabled} onClick={onPress}>
          {content}
        </button>
      )}
    </Item>
  )
}

/** HomeScreen.tsx */
export function HomeScreen() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-secondary-container">
      <AppHeader title={<Logo size={32} />} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-safe-r pl-safe-l shallow:pl-[max(30px,var(--spacing-safe-l))]">
        <div className="mx-auto flex max-w-5xl flex-col px-5 pt-2.5 pb-2.5 landscape:flex-row landscape:justify-between">
          {homeGroups.map((group, index) => (
            <div key={index} className="mb-[5px] landscape:w-[32%]">
              <ItemGroup>
                {group.map((item, row) => (
                  <Fragment key={item.path}>
                    {row > 0 && <ItemSeparator />}
                    <NavRow {...item} />
                  </Fragment>
                ))}
              </ItemGroup>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** AboutBase.tsx: wordmark, version and byline, shared by Welcome and About. */
function AboutBase() {
  return (
    <>
      <Logo size={48} className="text-on-primary" />
      <p className="text-body-md">{APP_VERSION}</p>
      <p className="text-body-md">by Kenji Matsuoka</p>
    </>
  )
}

const splash =
  'flex min-h-0 flex-1 flex-col items-center justify-center bg-primary pt-safe-t pr-safe-r pb-safe-b pl-safe-l text-on-primary'

/** WelcomeScreen.tsx: shown until the arrow is pressed for the first time. */
export function WelcomeScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <main className={splash}>
      <p className="text-[14px] leading-[1.4] text-on-surface">Welcome to</p>
      <AboutBase />
      <IconButton label="enter goodtags" size="icon-lg" className="mt-2.5" onClick={onEnter}>
        <Icon path={mdiArrowRight} size={34} />
      </IconButton>
    </main>
  )
}

const link = 'rounded-full px-4 py-2.5 text-label-lg underline outline-none focus-visible:ring-3 focus-visible:ring-ring active:opacity-60'

/** AboutScreen.tsx + AboutWithCredits.tsx */
export function AboutScreen() {
  const { back } = useNavigation()
  return (
    <main className={splash}>
      <AboutBase />
      <div className="px-5 pt-0.5">
        <a className={link} href="https://goodtags.net/" target="_blank" rel="noreferrer">
          goodtags.net
        </a>
      </div>
      <div className="flex flex-col items-center p-5 text-outline-variant">
        <p className="text-body-md">Content hosted by</p>
        <a className={link} href="https://www.barbershoptags.com/" target="_blank" rel="noreferrer">
          barbershoptags.com
        </a>
      </div>
      <IconButton label="back" size="icon-lg" onClick={back}>
        <Icon path={mdiArrowLeft} size={34} />
      </IconButton>
    </main>
  )
}
