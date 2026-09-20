# Native iOS parity reference

The reference implementation is the preserved native source at commit `677f89f`.
Its `package.json` and Xcode marketing version identify Goodtags **4.3.0**;
the iOS build number is **124**. This establishes source provenance, not that
the user's App Store installation was built from this exact commit.

## Existing rendered references

The tracked `.maestro/screenshots/undefined/` images include the welcome screen,
home, data, backup, and the iOS save dialog. They were introduced in commit
`d6b12c6` on June 19, 2026. The welcome screenshot explicitly displays **4.2.0**.
They corroborate the design but must not be described as 4.3.0 screenshots.
Their resolution is 1206 × 2622 pixels; they contain no visible status bar.

## Source measurements

All dimensions below are React Native logical points. Browser CSS pixels are
comparable only after accounting for device scale, browser chrome, safe areas,
font scaling, and standalone versus browser display mode.

| Element | Native reference |
| --- | --- |
| Main text | Bundled Vollkorn-Regular; optional Lato-Regular |
| Logo | Bundled Vollkorn-Black, home size 32 |
| Body large | 22 px / 28 px line height |
| Body medium | 20 / 26 |
| Body small | 17 / 22 |
| Page title | 25 / 32 |
| Primary | `#265ea7` |
| Main surface | `#fdfbff` |
| Secondary container | `#d9e3f8` |
| Score background | `#fcfcff` |
| Tab background | `#eceef8` |
| Active tab | `#2196f3` |
| Outline divider | `#c4c6cf` |
| General header | `58 + round(max(portrait ? 30 : 0, safeTop) × .7)` high; safeTop padding; safeLeft/right + 10 |
| Header columns | 60 minimum left/right, 48 high; center grows |
| Back icon | 42 in 48-pixel button |
| iOS tab height | `max(50, safeBottom + (shallowLandscape ? 35 : 55))` |
| Tab icons | MaterialCommunityIcons: home, magnify, heart-outline, history; navigation-provided size × 1.3 |
| Home list | 20 horizontal padding, 10 top padding, 10-radius groups, rows at least 56 high |
| Home icons | MaterialCommunityIcons, 20 px: star, pillar, teddy-bear, leaf, shuffle, information-outline, cog-outline, tag-multiple-outline, database |
| Shared text scaling | Maximum font-size multiplier 1.5 |

Sources: `src/lib/theme.ts`, `src/hooks/useHeaderHeight.ts`,
`src/components/SharedHeader.tsx`, `src/navigation/TabNavigator.tsx`,
`src/screens/HomeScreen.tsx`, `src/hooks/useListStyles.ts`,
`src/components/Text.tsx`.

## Score and interaction requirements

- Header is transparent. The ID badge sits after the back button, aligned
  toward the left, with a 10-pixel bottom margin. On iPhone the badge has
  minimum width 50, radius 8, padding 8 horizontal / 2 vertical, ID font 18,
  and hash font 14 with letter spacing 3. Heart/menu icons are 26 in 48-pixel
  buttons, with additional native hit slop.
- The image fills the width and is vertically centered in the score viewport.
  PDFs have a maximum zoom of 2 and a 16-pixel gap between pages. The native
  score uses pinch/pan; no persistent zoom-control row appears in its source.
- The bottom action bar is 80 high plus bottom safe area. Pitch/play appear
  together on the left, a flexible spacer precedes previous/next. Action
  icons are 40 in Paper IconButtons (64-pixel circles with 6-pixel margins).
- Bottom controls dim to opacity .5 after **4 seconds**. Tapping the sheet or
  an action brightens them and restarts the timer. The header is not dimmed.
- Pitch uses a lowercase FontAwesome6 note glyph and a separate Material
  Community Icons accidental, rather than the body font. Holding the note
  plays from its beginning and displays a centered 200-pixel note at .25
  opacity. Fade-in takes 80 ms; release stops sound and fades over 200 ms.
- In landscape the header and bottom controls overlay the full score. The
  bottom action bar becomes invisible while the action menu is open.
- The action menu opens downward at the upper right over an .8-opacity
  backdrop. Order: **tag info**, **labels**, **tracks** if present, **videos**
  if present. Labels precede the icon on each right-aligned row. A small FAB
  is 40 px, row padding is 24 horizontal / 16 bottom, and label styling uses
  bodyLarge with 12 × 6 padding and 16 horizontal / 8 vertical margins.
  The container starts at safeTop + 10, then adds 35 top padding. The FAB and
  label animations translate them downward when opening.
- Info and tracks open draggable bottom sheets, with 75% and 90% snap points,
  a drag handle, and an .3-opacity backdrop. Information rows include aka,
  id, arranger, posted, parts, lyrics, and track attribution. Empty values
  are omitted. Lyrics truncate at approximately 80 characters. The title
  uses 25-pixel type, info columns use 20-pixel type and a 120-pixel label
  column. Track rows indicate the current selection with a leading dot.
- Labels and videos navigate to separate full screens. Entering videos
  pauses learning tracks. Label selection uses leading square checkboxes,
  including on iOS, and a bottom-left **new label** tonal action. Creating a
  label is a separate screen, with autofocus, a 250-pixel input, 32-character
  limit, duplicate warning, and keyboard submit. Label editing uses 60-pixel
  rows, inline rename, drag handles, and a bottom-sheet delete confirmation.

Sources: `src/components/TagLayout.tsx`, `src/hooks/useTagScreenStyles.ts`,
`src/hooks/useButtonDimming.ts`, `src/components/SheetMusic.tsx`,
`src/components/NoteButton.tsx`, `src/components/FABDown.tsx`,
`src/components/TagInfoView.tsx`, `src/components/TrackMenu.tsx`,
`src/components/TagLabels.tsx`, `src/components/CreateLabel.tsx`,
`src/components/LabelEditor.tsx`.

## Native rendering attempt

An isolated detached worktree at `/tmp/goodtags-ios-parity-677f89f` preserves
the original package/configuration without altering the web implementation.
Native dependencies use the original immutable Yarn lockfile; Ruby 3.3 and
the locked CocoaPods bundle provide the missing build tooling. Xcode 27.0
and the iOS 26.4 Simulator runtime are available. No physical device or
external service is modified. Rendered capture status will be recorded here
after the simulator build attempt.

## Acceptance boundary

Do not mark perfect parity from source inspection or successful browser
clicks alone. Capture each page and interaction at matching viewport,
safe-area, theme, text-size, data, scroll position, and interaction state.
Compare the simulator reference and the mobile browser/PWA rendering;
record differences and verify fixes. Physical-device checks remain necessary
for Safari chrome, home-screen safe areas, the real keyboard, audio focus,
and gesture behavior. The user's installed iOS 4.3.0 screenshots remain the
final reference when they differ from this checkout.
