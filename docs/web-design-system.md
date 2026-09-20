# Web design system

The web app is styled with **Tailwind v4 utilities only**, on **shadcn/ui components themed to
the native app**. There is no component CSS. `web/styles.test.ts` fails the build if a second
stylesheet, a class selector, or a stray CSS import appears.

## Tokens: `web/styles.css`

The only stylesheet. It contains `@font-face`, one `@theme` block, two custom variants and the
one-line font swap. Everything in `@theme` mirrors the native theme (`src/lib/theme.ts`) and
the native layout hooks:

| Group | Utilities | Source |
| --- | --- | --- |
| Material 3 roles | `bg-primary`, `text-on-surface-variant`, `border-outline-variant`, `bg-elevation-3`, … | `theme.ts` colors |
| App colors | `text-tab-active`, `bg-score`, `text-track-spinner`, `native-*` | `theme.ts` exports; `SheetMusic.tsx` error view |
| shadcn aliases | `bg-background`, `text-foreground`, `border-border`, `ring-ring`, … | aliased onto the roles above |
| Type scale | `text-body-lg` (22/28), `text-title-lg` (25/32), `text-label-sm` (17/22), … | `theme.ts` `customFontSizes` |
| Fonts | `font-app` (Vollkorn, or Lato with the sans option), `font-logo`, `font-mono` | bundled fonts |
| Shape | `rounded-md` = 9 (Paper roundness), `rounded-lg` = 10 (list groups) | `theme.ts`, `useListStyles.ts` |
| Elevation | `shadow-level-1..3` | Paper's iOS shadow table |
| Safe areas | `pt-safe-t`, `pb-safe-b`, `pl-safe-l`, `pr-safe-r` | `env(safe-area-inset-*)` |
| Layout formulas | `h-header`, `h-header-landscape`, `h-tabbar`, `h-tabbar-shallow` | `useHeaderHeight.ts`, `TabNavigator.tsx` |
| Motion | `animate-check`, `animate-uncheck`, `animate-activity` | Paper checkbox, iOS activity indicator |

Tailwind's stock palette, type scale, radii, shadows and breakpoints are **removed**
(`--color-*: initial`, …), so an off-theme utility such as `bg-slate-100` or `text-sm` simply
does not exist. One-off native measurements use arbitrary values (`text-[18px]`,
`min-w-[69px]`) next to the markup they belong to.

Variants: `desktop:` (≥1024px), `landscape:`/`portrait:`, `shallow:` (landscape and ≤500px
tall, the native `shallowScreen`), `ipad:` (≥744px in both dimensions, the native `isTablet`).

`web/lib/utils.ts` teaches `tailwind-merge` that the custom `text-*` names are font sizes and
the `shadow-level-*` names are shadows. Without that, `cn()` would treat `text-body-lg` as a
color and drop it next to `text-primary`. **Add new scale names there too.**

The `--sat/--sab/--sal/--sar` custom properties override the safe-area insets. They are unset
in production; the parity capture script sets them to simulate an iPhone's insets.

## Components: `web/components/ui`

shadcn/ui components, restyled rather than re-skinned with a preset. Each file's header comment
names the native component it reproduces.

| Component | Native counterpart |
| --- | --- |
| `button` (`Button`, `IconButton`, `pressable`) | Paper Button modes (contained, tonal, outlined, elevated, text) and IconButton. Press feedback is the iOS one: an instant 12% underlay of the content color, no ripple |
| `checkbox` | Paper `Checkbox.Android` (used on iOS too): MDI glyphs, 36px target, 85% dip on toggle |
| `toggle-group` | `SearchDialog`'s SegmentedPicker |
| `drawer` (`Drawer`, `DetentDrawer`, `ConfirmDrawer`) | `@gorhom/bottom-sheet`: content-sized, 75%/90% detents, 15px corners, 30% backdrop |
| `dialog` | full-window surfaces shown without animation (search dialog) |
| `item` | Paper `List.Item` rows in rounded groups |
| `separator` | Paper `Divider` (hairline, or 1px `bold`) |
| `input` | Paper flat dense `TextInput` |
| `spinner` | iOS `ActivityIndicator` |
| `empty` | `TagList` empty message |
| `icon` | MaterialCommunityIcons, via tree-shaken `@mdi/js` paths |
| `snackbar` | Paper `Snackbar` (one at a time, 7s, fade + scale) |

Not used, deliberately: Switch (the native options are checkboxes), Sonner (its slide-in does
not match Paper's snackbar), a theme provider (the native app is light-only).

App-level compositions live in `web/components`: `app-header` (SharedHeader, BackButton,
Logo), `action-menu` (FABDown), `list-screen` + `tag-list` (ListHeader, TagList, TagListItem),
`search-dialog`, `sheet-music`, `note-glyph`.

## Navigation: `web/navigation`

Modeled on the native react-navigation tree rather than on route swapping:

- `routes.ts` maps URLs to a serializable navigator state: a root stack above four tabs, the
  home tab holding its own stack. A deep link rebuilds the screens beneath it. Only the
  pathname selects a screen: unknown queries (`?fbclid=…`), fragments and trailing slashes
  are ignored, and a query survives only as params for screens that read one
  (`/labels/new?tag=5`).
- `navigator.tsx` stores that state in `history.state`, so browser back/forward restore the
  exact stack. `StackView` keeps every screen mounted (`inert` and hidden when covered, as
  `freezeOnBlur` does), and applies the native transition: `animation: 'fade'`, 0.5s
  ease-in-out, on the screen above. Previous/next tag replaces in place with no transition.
- A history pop the app did not start, on a touch device, is the system edge-swipe, which
  already animates the page; the fade is skipped so the two do not stack.
- Tabs switch instantly and stay alive; pressing the focused home tab pops its stack.
- `tab-bar.tsx` renders the native tab bar, or a rail on `desktop:` widths.

## Checking parity

1. Native reference: build upstream in the simulator and run `e2e/maestro/screenshots.yaml`
   (see `docs/mobile-parity.md` for the Xcode 27 notes).
2. Web: `yarn dev`, then `node e2e/web/parity/capture.mjs <outDir>` captures the same states
   at iPhone 17 size with its safe areas.
3. Compare the pairs. Specs with file:line citations for every measurement are in
   `parity-home-browse.md`, `parity-tag-screen.md` and `parity-settings-labels.md`.
