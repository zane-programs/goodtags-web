# Native iOS parity spec: labels, options, data, about, logs, welcome

Extracted from the native source at commit 677f89f.

Every screen covered is specified below from source. The items that could not be determined are collected in the last section, and the native-stack `fade` timing is the main one.

Paths are relative to `/Users/zanestjohn/Documents/GitHub/goodtags-web/`. `NM` means `/tmp/goodtags-ios-parity-677f89f/node_modules`. The installed React Native is 0.85.3, not 0.81 (`legacy/package.native.json:52`).

## Shared foundations

**Colors** (`src/lib/theme.ts:25-64`)

| Token | Hex |
|---|---|
| primary | #265EA7 |
| onPrimary, onSecondary | #FFFFFF |
| secondaryContainer | #D9E3F8 |
| surface, background | #FDFBFF |
| onSurface | #1A1B1E |
| surfaceVariant | #E0E2EC |
| onSurfaceVariant | #43474E |
| outline | #74777F |
| outlineVariant | #C4C6CF |
| error | #BA1A1A |
| secondary | #555F71 |
| tertiary | #6F5675 |
| inverseSurface | #2F3033 |
| inverseOnSurface | #F1F0F4 |
| inversePrimary | #A8C8FF |
| elevation.level3 | #E5EAF5 |
| onSurfaceDisabled | rgba(26,27,30,.38) |
| surfaceDisabled | rgba(26,27,30,.12) |

Theme `roundness` is 9 (`theme.ts:67`).

**Fonts**
- Serif theme uses `Vollkorn-Regular`; sans theme uses `Lato-Regular`; the logo uses `Vollkorn-Black` (`theme.ts:75-77,113`).
- Sizes as size/lineHeight: titleLarge 25/32, bodyLarge 22/28, bodyMedium 20/26, labelSmall 17/22 (`theme.ts:81-97`).
- Paper's letterSpacing is kept: bodyLarge 0.15, bodyMedium 0.25, titleLarge 0, labelSmall 0.5 with weight 500 (`NM/react-native-paper/src/styles/themes/v3/tokens.tsx:156-203`).
- Every app `Text` has `maxFontSizeMultiplier` 1.5 (`src/components/Text.tsx:4`).

**Header**
- `NavHeader` renders `SharedHeader`, so the `headerStyle` inversePrimary set in the navigators is never shown (`src/components/NavHeader.tsx:11-15`).
- Background is primary. Height is `58 + round(0.7 × max(30 portrait / 0 landscape, insets.top))` (`src/hooks/useHeaderHeight.ts:4-13`).
- Padding: `paddingTop` is insets.top; left and right are inset + 10. Children are bottom-aligned (`src/components/SharedHeader.tsx:57-63,134-137`).
- Three columns, each 48 high. Left and right have `minWidth` 60 and the center is flex 1 (`SharedHeader.tsx:138-162`).
- The title is `titleLarge` in #FFFFFF. An optional MaterialCommunityIcons title icon is size 22 with `marginRight` 8 (`SharedHeader.tsx:103-107,166`).
- The back button is a Paper `IconButton` with `mode="contained"` and a transparent background (`src/components/BackButton.tsx:23-42`):
  - icon `chevron-left` at size 42, in a 48×48 box with `marginTop` 2;
  - the close variant is `close` at size 32;
  - color #FFFFFF, `hitSlop` 10.

**Transitions**: every stack screen uses `animation: 'fade'` with `freezeOnBlur` (`src/navigation/RootStackNavigator.tsx:47-51`, `src/navigation/HomeNavigator.tsx:37-41`). There are no modal or sheet presentations.

**Grouped list rows** (`src/hooks/useListStyles.ts:10-26`)
- Holder: surface background, radius 10, `marginVertical` 5.
- Row: `minHeight` 56, `paddingVertical` 4, left padding 10. `paddingHorizontal` is 10, but Paper's `containerV3` `paddingRight: 24` wins on the right (`NM/react-native-paper/src/components/List/ListItem.tsx` `containerV3`). Inner row `marginVertical` is 6 (`rowV3`).
- Pressed state: background #E0E2EC, instant.
- Icons come from `homeIcon`: MaterialCommunityIcons at size 20 (`src/components/homeIcon.tsx:5-8`). It ignores the color Paper passes, so icons render in the vector-icons default black (`NM/@expo/vector-icons/build/vendor/react-native-vector-icons/lib/create-icon-set.js:12`).
- The left icon has `marginLeft` 16, the content has `paddingLeft` 16, and the right `chevron-right` has `marginLeft` 16 (`NM/react-native-paper/src/components/List/utils.ts:35-90`).
- The title is `bodyLarge` in onSurface.
- `Divider` is hairline, #C4C6CF, full width (`NM/react-native-paper/src/components/Divider.tsx:66,76`).

**Confirmation sheet** (same in Labels and LabelEditor)
- `BottomSheetModal` with `enableDynamicSizing` (no snap points) and `enablePanDownToClose`.
- Sheet background is surface, top radius 15 (`NM/@gorhom/bottom-sheet/src/components/bottomSheetBackground/styles.ts:6`).
- The handle has padding 10; its indicator is 7.5% of window width × 4, radius 4, #74777F (`NM/@gorhom/bottom-sheet/src/components/bottomSheetHandle/styles.ts`; `src/screens/LabelsScreen.tsx:181-188`).
- The backdrop is black at opacity 0.3, fading from index −1 to 0; tapping it closes the sheet (`LabelsScreen.tsx:34-43`).
- The iOS spring is damping 500, stiffness 1000, mass 3, `overshootClamping` (`NM/@gorhom/bottom-sheet/src/constants.ts:71-83`).
- Content padding (`LabelsScreen.tsx:97-105`):
  - horizontal `max(24, inset+24)`;
  - top 8;
  - bottom `max(24, insets.bottom)`.
- The two actions are centered `bodyLarge` with `paddingVertical` 18, separated by a `Divider`.

**Snackbar** (Paper, inside a `Portal`)
- Default duration is 7000 ms (`NM/react-native-paper/src/components/Snackbar.tsx:100,155`).
- Placement and size:
  - pinned to the bottom with `paddingBottom` equal to insets.bottom;
  - margin 8;
  - `minHeight` 48.
- Radius is `roundness`, 9, overriding the stylesheet's 4 (`Snackbar.tsx:308,398-410`).
- Background #2F3033. Text is `bodyMedium` in #F1F0F4 with margins 16 horizontal and 14 vertical.
- The action is a text `Button` labelled `close` in #A8C8FF; pressing it dismisses.
- It fades in over 200 ms with `Easing.out(ease)` while scaling 0.9→1, and out over 100 ms (`Snackbar.tsx:185-218,309-318`).

**FABDown menu** (no resting FAB; it only shows when open)
- Backdrop is rgba(253,251,255,.95), fading in over 250 ms and out over 200 ms.
- Items animate for 150 ms with a 15 ms stagger: scale .5→1, translateY −8→8, opacity (`src/components/FABDown.tsx:127-205`).
- Items are right-aligned:
  - container `paddingTop` is `headerHeight−45`, plus a further 35 (`FABDown.tsx:315-318`; `src/hooks/useFabDownStyle.ts:11`);
  - each item has `paddingHorizontal` 24 and `paddingBottom` 16.
- The label is `bodyLarge` in onSurface, padding 12 horizontal / 6 vertical, margin 16 horizontal / 8 vertical.
- The FAB is small, 40×40, radius 27, background #E5EAF5 (`NM/react-native-paper/src/components/FAB/utils.ts:331,395`).

## Labels list (`src/screens/LabelsScreen.tsx`)

- **Navigation**: Home row `labels` (icon `tag-multiple-outline`) leads to `Labels` (`src/screens/HomeScreen.tsx:186`). Title is `labels` (`HomeNavigator.tsx:70-76`).
- **Header right**: `IconButton` `menu` at size 22 (38 box, margin 6), #FFFFFF. It opens FABDown (`LabelsScreen.tsx:16-18,48-55`).
- **Layout** (`LabelsScreen.tsx:67-79`): container background #D9E3F8; ScrollView content `paddingHorizontal` 15 and `paddingBottom` 20; `List.Section` `paddingHorizontal` 10 with Paper's `marginVertical` 8.
- **Rows**:
  - Left icon is `tag-outline`, the title is the label text, and the right icon is `chevron-right`.
  - A divider follows every row except the last (`:133`).
  - Tapping dispatches `selectLabel` and navigates to `Labeled` (`:117-120`).
- **Empty state**: one row titled `no labels yet`, italic, in #74777F (`:80-83,137-142`).
- **Bottom action bar** (`:84-96`): row with gap 10, padding 15 horizontal / 15 top / 10 bottom, background #D9E3F8. It holds two `Button`s with `mode="outlined"` (`:148-170`):
  - each is flex 1, radius 20, background surface, 1 px border in #74777F;
  - the label is `bodyLarge` in primary, with margins 10 vertical and 24 horizontal, so the button is about 48 high;
  - the icon size equals the label fontSize, 22 (`NM/react-native-paper/src/components/Button/Button.tsx:311,381`);
  - texts are `new` with icon `plus`, which opens `CreateLabel` with `{}`, and `edit` with icon `pencil-outline`, which opens `LabelEditor`;
  - `edit` is disabled when there are no labels: border rgba(26,27,30,.12), text rgba(26,27,30,.38).
- **FABDown**: one action, `remove all labels`, icon `broom` (`:57-64`). It opens the confirmation sheet.
- **Sheet copy**: `remove all labels` in error color, and `cancel`. Confirming dispatches `resetLabels` (`:190-205`).

## Labeled tag list (`src/screens/LabeledScreen.tsx`)

- It is a `ListHeader` with the selected label as title, title icon `tag-outline`, and a back button (`:63-69`).
- The body is a `TagList` with empty message `no tags with this label yet` (`:60`).
- FABDown has one action that toggles sort order. Its label is `sort alphabetically` or `sort by id`, and its icon is `SORT_ICONS[otherOrder]` (`:38-50`). The FAB closes when the screen blurs (`:29-35`).
- `ListHeader` and `TagList` internals are out of scope here.

## Label editor (`src/components/LabelEditor.tsx`)

- **Navigation**: `LabelEditor`, title `edit labels` (`HomeNavigator.tsx:79-85`).
- **Container**: `paddingTop` 7, `paddingBottom` 7, `paddingLeft` inset + 15, `paddingRight` inset + 10 (`:25-32,189`). It sets no background, so the navigation background #FDFBFF shows.
- **Row** (`:204-222`):
  - height 60;
  - background #FFFFFF normally and #D9E3F8 while dragging (`:74`);
  - no dividers.
- **Row contents**, left to right:
  - an animated `IconButton`, `pencil-outline` ↔ `close`, size 24 (40 box, margin 6), in #43474E; the swap is a 200 ms cross-fade with rotation (`:78-83`; `NM/react-native-paper/src/components/CrossFadeIcon.tsx:59`);
  - the label text, `bodyLarge`, `marginLeft` 5;
  - the `drag-vertical` `IconButton`, size 20, black.
- **Drag**:
  - Drag starts on `onPressIn` of the handle, immediately, with no long-press (`:115-122`).
  - Every handle is hidden while any row is being edited (`:114`).
  - Library defaults apply (`NM/react-native-draggable-flatlist/src/constants.ts`): `activationDistance` 0, autoscroll threshold 30 at speed 100, and spring damping 20, mass 0.2, stiffness 100.
  - The active row gets zIndex 999 and no scale.
  - `onDragEnd` dispatches `setLabels` (`:147`).
- **Inline rename** (`:87-101`):
  - Paper `TextInput` with `mode="flat"`, `dense`, `autoFocus`, `autoCapitalize="none"` and `maxLength` 32, in `bodyLarge`.
  - Appearance:
    - background #E0E2EC;
    - top radii 9;
    - underline 1 px #43474E, becoming 2 px primary on focus;
    - cursor in primary;
    - `minHeight` 40.
  - Submit trims the draft, renames only if it is non-empty and changed, then exits editing.
  - There is no duplicate check on rename (`src/modules/favoritesSlice.ts:217-231`), so a duplicate name yields duplicate entries.
  - `close` cancels editing.
  - `keyboardShouldPersistTaps="handled"` is set on the list (`:145`).
- **Delete**:
  - While editing, the right-hand button is `trash-can-outline`, disabled unless the draft equals the original name (`:102-107`).
  - Tapping it opens a sheet with `delete label` in error color and `cancel` (`:162-177`).
  - Confirming dispatches `deleteLabel`.

## Create label (`src/components/CreateLabel.tsx`) and TagLabels

- **Navigation**: `CreateLabel`, title `new label`. The header shows a `close` (✕) button because `headerBackTitle` is `'cancel'` (`RootStackNavigator.tsx:108-116`).
- **Reached from**: the Labels screen `new` button, and the TagLabels `new label` button, which passes `{tag}` (`src/components/TagLabels.tsx:82-91`).
- **Layout**: centered column with padding 10. The input sits at `marginTop` 20 and is 250 wide, flat and dense, with placeholder `label`, `maxLength` 32 and `autoCapitalize` none (`:46-57,69-88`).
- **Focus**: applied on screen focus after a 50 ms timeout (`:23-28`).
- **Duplicate warning**: if the trimmed draft already exists, the text `label already exists` appears below the input in `labelSmall`, error color, `marginLeft` 12 and `marginTop` 8 (`:58-62`). Submit then does nothing.
- **Submit**: `addLabel` when a tag was passed, otherwise `createLabel`, which adds the label to the top of the list (unshift). Then `goBack` (`:32-41`; `favoritesSlice.ts:168-177`).
- **TagLabels**:
  - Title `labels`, reached from the tag FAB item `labels` (`src/components/TagLayout.tsx:259-262`).
  - Each label is a `Checkbox.Item` with `mode="android"` and `position="leading"`; the label text is fontSize 22 with `marginLeft` 5 (`TagLabels.tsx:26-44`).
  - The `new label` button is `contained-tonal` with icon `plus`, margin 15, aligned left, and a pill shape (radius 45).

## Options (`src/screens/OptionsScreen.tsx`, `src/modules/optionsSlice.ts`)

- **Navigation**: Home row `options` (`cog-outline`), title `options`. Background #FDFBFF. Inner padding is 20 (`:99-102`).
- **Rows**: three plain `List.Item` rows with no card, no dividers and no descriptions. Both the row and the checkbox toggle the setting.

| Title | State | Default | Effect |
|---|---|---|---|
| `use serif fonts` | `serifs` | true | Switches the whole Paper theme between Vollkorn and Lato (`RootStackNavigator.tsx:53`) |
| `show system status bar` | `showStatusBar` | false | On iOS, `StatusBar.setHidden(!v,'none')` with light-content (`App.tsx:47-49`) |
| `keep screen awake` | `keepAwake` | true | `activateKeepAwakeAsync('tag-viewing')` only while a tag is open (`TagLayout.tsx:177-185`) |

- **Defaults** are declared in `src/modules/optionsSlice.ts:11-15`.
- **Title style**: fontSize 18, `marginVertical` 5 (`:110-113`), in the theme font, onSurface. Row height is about 66.
- **Control**: `Checkbox.Android` on iOS too, so it is the MD icon rather than an iOS checkmark or switch (`:10-12`).
  - Icons are `checkbox-marked` in #265EA7 when on and `checkbox-blank-outline` in #43474E when off.
  - The icon is size 24 in a 36×36 container with padding 6 and radius 18 (`NM/react-native-paper/src/components/Checkbox/CheckboxAndroid.tsx:116-166`).
  - The toggle scale animation is 1→0.85→1: 100 ms + 100 ms when checking, 0 ms + 175 ms when unchecking.
  - The render function ignores Paper's left style, so there is no 16 left margin; the checkbox sits flush with the 20 padding.
- **Row press (iOS)**: underlay rgba(26,27,30,.12) (`NM/react-native-paper/src/components/TouchableRipple/utils.ts:39`).
- There are no other toggles.

## Data (`src/screens/DataScreen.tsx`)

- **Navigation**: Home row `data` (`database`), title `data`.
- **Container**: background #D9E3F8; `paddingTop` 10; horizontal padding `max(inset,20)`; bottom padding `max(insets.bottom,20)`. The ScrollView has `paddingHorizontal` 10 (`:37-49`).
- **Sections**: stacked in portrait, a row of flex-1 columns in landscape. Each has `marginVertical` 10. Headings are `titleLarge` with `marginTop` 10 (0 in landscape) and `marginBottom` 10 (`:50-53,72-82`).
- The local `listHolder` and `listItem` styles are dead code; rows use `useListStyles`.

| Heading | Row (icon) | Behavior |
|---|---|---|
| `faves + labels` | `backup` (`database-export`) | Writes `faves-labels-<date>.json` and opens the iOS share sheet |
| (same section) | `restore` (`database-import`) | Opens the full-screen document picker for json or any file, guarded against re-entry (`src/hooks/useDataImport.ts:21-28`) |
| `search database` | `refresh` (`database-refresh`) | Calls `refreshDbNow(true)`; the row is disabled while it runs |
| `pdf cache` | `clear cache` (`broom`) | Deletes `cache/pdfs`; the row is disabled while it runs |
| `logs` | `view logs` (`file-document-multiple-outline`) | Navigates to `Logs` |

**Snackbar copy**
- Backup (`src/modules/favoritesSlice.ts:422-467`):
  - success is `exported N favorite(s) and M label(s)`, pluralized;
  - cancel is silent;
  - failure is `backup error: <e>`.
- Restore (`useDataImport.ts:44-71`, `favoritesSlice.ts:568-605`):
  - success is `imported N favorite(s) and M label(s)`;
  - failures are `unable to import favorites from <filename>[: <reason>]`, `import failed`, `invalid file format`, or `import error: <e>`;
  - cancel is silent.
- Refresh (`DataScreen.tsx:208-218`): `search database refreshed`, `search database already up to date`, or `couldn't download a usable search database`.
- PDF cache: `pdf cache cleared`, or `Error clearing cache: <msg>` (`:161-167`). `clearPdfCache` swallows its own errors, so the error text is effectively unreachable (`src/hooks/usePdfCache.ts:150-158`).

There is no spinner, progress indicator or confirmation dialog anywhere on this screen. The only in-flight feedback is the disabled row, which looks unchanged.

## About (`src/screens/AboutScreen.tsx`, `src/components/AboutBase.tsx`, `src/components/AboutWithCredits.tsx`)

- **Navigation**: Home row `about` (`information-outline`) leads to the root `About` screen with no header (`RootStackNavigator.tsx:82-89`). It is full-screen #265EA7 with everything centered.
- **Content**, stacked top to bottom:
  - Logo text `goodtags` in Vollkorn-Black 48, #FFFFFF, with no font scaling (`src/components/Logo.tsx:17-26`).
  - Version, `bodyMedium`, #FFFFFF.
    - It resolves as `expoConfig.version || nativeAppVersion || 'unknown'` (`src/constants/version.ts:7-10`).
    - `app.json` has no version, so it shows the native `MARKETING_VERSION`, 4.3.0 (`ios/goodtags.xcodeproj/project.pbxproj:388`), with no "v" prefix.
  - `by Kenji Matsuoka`, `bodyMedium`, #FFFFFF (`AboutBase.tsx:25-27`).
  - A text `Button` `goodtags.net`, underlined, #FFFFFF, opening https://goodtags.net/; its holder has `paddingTop` 2 and `paddingHorizontal` 20.
  - A credits block with padding 20:
    - `Content hosted by` in `bodyMedium`, #C4C6CF;
    - an underlined link `barbershoptags.com` in #C4C6CF, opening https://www.barbershoptags.com/ (`AboutWithCredits.tsx:77-95`).
  - A back `IconButton`, `arrow-left`, size 34, #FFFFFF, below the content (`AboutScreen.tsx:29-34`).
- `src/components/AboutModal.tsx` is imported nowhere; it is dead code.

## Logs (`src/screens/LogsScreen.tsx`)

- **Navigation**: `Logs` is portrait-only (`RootStackNavigator.tsx:118-126`). The navigator header is hidden and the screen renders its own `SharedHeader` titled `logs`. Tapping the header scrolls the list to the top (`:140-144,197-204`).
- **Header right**: `IconButton` `delete`, size 24, #FFFFFF. Tapping clears the logs with no confirmation. A long-press generates dummy logs in dev builds only (`:82,95-125`).
- **Body**: background #FDFBFF; `paddingHorizontal` `max(insets, 8)`; `paddingBottom` insets.bottom.
- **Data**: the last 25 console entries (`MAX_LOGS`, `:19`), in a `FlashList` with `paddingVertical` 8 that starts rendering from the bottom (`:233-236`).
- **Entry card** (`:171-186,262-285`):
  - `marginVertical` 4;
  - radius 0;
  - background #E0E2EC;
  - content padding 8 vertical / 12 horizontal.
- **Left border**: 4 px wide, colored by entry type (`:146-159`):
  - error #BA1A1A;
  - warn #6F5675;
  - info #265EA7;
  - debug #555F71;
  - log #1A1B1E.
- **Entry text**: a timestamp `HH:mm:ss` (24-hour) in Menlo 12, #43474E, with `marginBottom` 4; then the message in Menlo 13, #1A1B1E.
- **Empty state**: `no console logs yet`, centered, `bodyLarge`, #43474E, padding 32 (`:214-225`).

## Welcome (`src/screens/WelcomeScreen.tsx`)

- It is the initial route when `lastVisited` is unset (`RootStackNavigator.tsx:60`).
- Full-screen #265EA7, padded by the safe-area insets, content centered.
- Content top to bottom:
  - `Welcome to`, in default Paper Text (`bodyMedium`, onSurface #1A1B1E, not white) (`:46`);
  - `AboutBase` (logo 48, version, byline);
  - an `IconButton` `arrow-right`, size 34, #FFFFFF, `marginTop` 10. It dispatches `setLastVisited` and navigates to `Tabs` (`:49-58`).
- It also preloads popular tags. It has no settings.

## Not determinable from source

- The native-stack `fade` duration and curve on iOS; these are native to react-native-screens.
- The Paper elevation shadow rendering for the Snackbar and the log cards.
- Whether iOS synthesizes weight 500 for `labelSmall` in Vollkorn-Regular.
- The backup filename date format. It comes from `getDateString` (`src/modules/favoritesSlice.ts:531`), which was not read.
- `ListHeader` and `TagList` internals for the Labeled screen, which were out of scope.
