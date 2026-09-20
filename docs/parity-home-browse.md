# Native iOS parity spec: navigation, headers, home, lists, search

Extracted from the native source (`src/`, root `App.tsx`) at commit 677f89f.

This covers app root, theme, navigation, headers, Home/Welcome, the tag-list screens, and the search dialog.

Paths are relative to the repo root. "Paper" means `node_modules/react-native-paper/src` as installed at `/tmp/goodtags-ios-parity-677f89f/node_modules/react-native-paper/src`.

**Versions differ from the brief.** `legacy/package.native.json:33-63` lists RN 0.85.3, not 0.81. It also lists paper ^5.14.5, bottom-tabs ^7.8.6, native-stack ^7.7.0, screens 4.25.2, reanimated 4.3.1 and flash-list 2.0.2.

## 1. Root and theme

- **Provider order:**
  - `App.tsx:25-28`: View (flex 1, bg `#265EA7`) wraps SafeAreaProvider.
  - `App.tsx:70-81`: GestureHandlerRootView, ErrorBoundary, Redux, then PersistGate (`loading=null`).
  - `RootStackNavigator.tsx:56-58`: PaperProvider, BottomSheetModalProvider, then NavigationContainer, all with the same theme.
- **Status bar:** `light-content`, translucent. It is hidden when `options.showStatusBar` is false, with hide animation `'none'` (`App.tsx:47-49,59-64`).
- **Theme switch:** `serifs ? MainTheme : SansSerifTheme` (`RootStackNavigator.tsx:53`). Roundness is 9 (`theme.ts:67`).
- **Bundled fonts:** `Vollkorn-Regular` for serif, `Lato-Regular` for sans, `Vollkorn-Black` for the logo (`theme.ts:75-77,113`). No other font files are bundled (`src/assets/fonts`, `ios/goodtags/Info.plist:61-63`).
- **Font weights:** `configureFonts` with a flat config keeps the MD3 weights and letter-spacing (Paper `styles/fonts.tsx`, `styles/themes/v3/tokens.tsx:111-215`).
  - title* and label* are weight 500; body* are 400.
  - Letter-spacing: titleLarge 0; titleMedium and bodyLarge 0.15; titleSmall and labelLarge 0.1; labelMedium and labelSmall 0.5; bodyMedium 0.25; bodySmall 0.4.
  - How iOS renders the 500 weight with only a Regular file bundled could not be determined from source.

| Variant (`theme.ts:81-97`) | size/lineHeight |
|---|---|
| titleLarge | 25/32 |
| titleMedium | 22/28 |
| titleSmall, labelLarge, bodyMedium | 20/26 |
| labelMedium | 18/24 |
| labelSmall, bodySmall | 17/22 |
| bodyLarge | 22/28 |

Display and headline variants are at `theme.ts:82-87`.

- **Paper Text without a variant:** uses `fonts.default` (family only, weight 400), RN default size 14, colour onSurface (Paper `components/Typography/Text.tsx:157-160`).
- **App `Text` wrapper:** adds `maxFontSizeMultiplier` 1.5 (`src/components/Text.tsx:4-7`).
- **Colours (`theme.ts:25-64`):**

| Token | Hex |
|---|---|
| primary | #265EA7 |
| onPrimary | #FFFFFF |
| primaryContainer | #D6E3FF |
| onPrimaryContainer | #001B3D |
| secondary | #555F71 |
| secondaryContainer | #D9E3F8 |
| onSecondaryContainer | #121C2B |
| background, surface | #FDFBFF |
| onSurface | #1A1B1E |
| surfaceVariant | #E0E2EC |
| onSurfaceVariant | #43474E |
| outline | #74777F |
| outlineVariant | #C4C6CF |
| error | #BA1A1A |
| inversePrimary | #A8C8FF |
| inverseSurface | #2F3033 |
| inverseOnSurface | #F1F0F4 |
| elevation level1 / level2 / level3 | #F2F3FB / #ECEEF8 / #E5EAF5 |
| TabBarActiveColor | #2196F3 (`theme.ts:70`) |

- **Screen background:** navigator scenes use `colors.background` #FDFBFF, since the theme is passed to NavigationContainer.
- **Paper press feedback on iOS:** there is no ripple. A full-bleed underlay view appears while pressed, with no animation (Paper `components/TouchableRipple/TouchableRipple.native.tsx:106-127`). Its colour is the ripple colour: onSurface at 12% by default (`TouchableRipple/utils.ts:39`), iconColor at 12% for IconButton (`IconButton/utils.ts:143`), textColor at 12% for Button (`Button/Button.tsx:297`).
- **MD3 iOS shadow:** black at opacity 0.3. For levels 0-5 the y-offset is [0,1,2,4,6,8] and the radius is [0,3,6,8,10,12] (Paper `styles/shadow.tsx:8-9,74-76`).

## 2. Navigation

### Root native-stack

- Screen options for all screens: `freezeOnBlur`, `headerShown:false`, `animation:'fade'` (`RootStackNavigator.tsx:47-51`).
- Initial route is `Tabs` if `visit.lastVisited` is set, otherwise `Welcome` (`:60`).

| Screen | Notes |
|---|---|
| Welcome, Tabs, Tag, Favorites, Random | No header, orientation all (`:63-67`) |
| About | `headerShown:false` (`:86`) |
| TagLabels "labels", TagVideos "videos", Logs "logs" (portrait only) | Custom `NavHeader` (`:90-126`) |
| CreateLabel "new label" | `headerBackTitle:'cancel'`, which gives a close icon (`:109-116`, `NavHeader.tsx:13`) |

- **No modal presentations.** No `presentation` option is set anywhere, so every screen is a push.
- **Transition:** an alpha fade with `UIViewAnimationCurveEaseInOut`.
  - On push the new view fades from 0 to 1 over the old one. On pop the old view fades from 1 to 0 (`react-native-screens/ios/RNSScreenStackAnimator.mm:296-329`).
  - Duration is the 0.5 s default, because no `animationDuration` is set (`RNSScreenStackAnimator.mm:10,39`).
- **Swipe-back gesture:**
  - `gestureEnabled` is left at its iOS default, so the edge swipe-back is active.
  - `animationMatchesGesture` is unset, so the interactive swipe uses the stock UIKit slide pop rather than the fade (`react-native-screens/ios/RNSScreenStack.mm:819-834`, `@react-navigation/native-stack/src/views/NativeStackView.native.tsx:150,294`).
  - No full-screen swipe is configured.
- **Unused header config:** the `headerStyle` inversePrimary and `contentStyle` in the group are unused, because `header: NavHeader` replaces the native header.

### HomeNavigator

- It is a native-stack inside the Home tab, with the same fade, `freezeOnBlur` and no-header options (`HomeNavigator.tsx:37-41`).
- Home, Labeled, Popular, Classic, Easy and New have no header (`:45-54`).
- Labels "labels", LabelEditor "edit labels", Options "options" and Data "data" use `NavHeader` (`:69-104`).

### Bottom tabs

- **Order and labels:** home ("home", `home` icon), Search ("search", `magnify`), Favorites ("faves", `heart-outline`), History ("history", `history`). Initial tab is Home (`TabNavigator.tsx:69-105,117-120`).
- **Tab switch:** no animation. The library default is `animation='none'` (`@react-navigation/bottom-tabs/src/views/BottomTabView.tsx:136`), and screens freeze on blur (`TabNavigator.tsx:56`).
- **Bar style (`TabNavigator.tsx:38-45`):**
  - Background is elevation.level2 #ECEEF8, with a 1px #C4C6CF top border.
  - `paddingTop` is 5. On iOS `paddingHorizontal` is 0, which overrides the library's horizontal inset.
  - The library adds `paddingBottom` equal to `insets.bottom` (`BottomTabBar.tsx:378`).
  - Height is `max(50, insets.bottom + (shallowScreen ? 35 : 55))` (`:35-37`). That is 89 with a 34pt home indicator.
- **Tints:** active #2196F3, inactive #43474E (`:59-60`).
- **Labels:** shown only in landscape, beside the icon (`:63-64`).
  - Label style: family labelSmall, size 14 (`:47-50`), plus the library's lineHeight 24, `marginStart` 5 and `marginEnd` 12 (`BottomTabItem.tsx:422-433`).
  - Portrait shows icons only.
- **Icon size:** library size x 1.3 (`:113`). That is 25 -> 32.5 in the regular layout and 18 -> 23.4 in iPhone-landscape compact (`TabBarIcon.tsx:39-40`, `BottomTabBar.tsx:113-120`).
- **Press feedback:** none (`pressOpacity: 1`, `BottomTabItem.tsx:348`).
- **Keyboard:** `tabBarHideOnKeyboard` is set (`:58`). The library animates the bar with a 250 ms show and a 200 ms hide (`BottomTabBar.tsx:236,255`).

## 3. Headers

### SharedHeader (`src/components/SharedHeader.tsx`)

- **Container:** background #265EA7, a row with `alignItems: flex-end` (`:134-137`).
  - Height is `58 + round(0.7 * max(landscape ? 0 : 30, insets.top))` (`useHeaderHeight.ts:4-13`).
  - Examples: a 59pt inset gives 99, a 47pt inset gives 91, landscape with a 0 inset gives 58.
  - Padding: top is `insets.top`, left is `insets.left + 10`, right is `insets.right + 10` (`:58-62`).
- **Columns:** left and right have `minWidth` 60, the centre has `flex: 1`. All three are 48 high (`:138-162`, `HEADER_BUTTON_SIZE` in `CommonStyles.ts:5`).
- **String title:** titleLarge (25/32) in #FFFFFF, with an optional MaterialCommunityIcons icon at size 22, white, `marginRight` 8 (`:99-108,166`).
- **BackType.None:** renders a 50-wide spacer (`:92,163`).
- **Back button (`BackButton.tsx`):**
  - Paper IconButton, icon `chevron-left` at size 42, or `close` at size 32 (`:6,26`).
  - White icon on a 48x48 transparent container, `marginTop` 2, `hitSlop` 10 (`:31,37-42`).
  - Paper adds margin 6 and a radius of half the container (Paper `IconButton/IconButton.tsx:160,222`).
  - Pressed state is a white 12% underlay. `onPress` calls `goBack`.
- **Scroll to top:** with `enableScrollToTop`, the whole header is a Pressable. It calls `scrollToOffset({offset: 0, animated: true})`, or `scrollToEnd` if the list is inverted (`:75-88,122-127`).

### ListHeader (`src/components/ListHeader.tsx`)

- It is a SharedHeader with scroll-to-top always on.
- The back button shows only when `showBackButton` is set (`:52`).
- The right side is an IconButton: `menu` icon at size 26, white, 48x48, margin 0 (`:35-42,68-73`). It calls `setFabOpen(true)`.

### NavHeader (`NavHeader.tsx:11-15`)

- It is a SharedHeader with the route title. It uses a back chevron, or the close icon when `headerBackTitle === 'cancel'`.

### Logo (`Logo.tsx:17-26`)

- Text "goodtags" in Vollkorn-Black at the given size, `allowFontScaling` false. Colour is onPrimary, or primary when `dark`.

## 4. Welcome (`src/screens/WelcomeScreen.tsx`)

- **Layout:** full-screen #265EA7, centred, padded by all four insets (`:23-32`).
- **Content, top to bottom:**
  - "Welcome to" as a default Paper Text: 14px in onSurface #1A1B1E, which is dark text on blue (`:46`).
  - Logo at size 48, white (`AboutBase.tsx:25`).
  - `APP_VERSION`, then "by Kenji Matsuoka", both bodyMedium 20/26 in white (`AboutBase.tsx:17-27`).
  - An IconButton `arrow-right` at size 34, white, in a holder with `marginTop` 10 (`:33-36,49-57`).
- **Arrow press:** dispatches `setLastVisited`, then `navigate('Tabs')` with the fade transition.
- **On mount:** preloads the popular tags (`:40-42`).

## 5. Home (`src/screens/HomeScreen.tsx`)

- **Container:** background #D9E3F8, `paddingBottom` `max(insets.bottom, 10)` (`:45-49`).
- **Header:** SharedHeader with no back button. The title is the Logo at size 32, white (`:18-19,153-157`).
- **ScrollView:**
  - No scroll indicator. Content `paddingTop` 10 and `paddingHorizontal` 20 (`:54-58,159`).
  - The outer padding is the left and right insets. On a shallow screen the left padding is `max(left, 30)` (`:143-149`).
- **Cards:** three cards in a column, each with background #FDFBFF, radius 10, `marginVertical` 5 (`useListStyles.ts:11-15`).
  - Each column has `marginBottom` 5.
  - In landscape they form a row with `space-between`, each 32% wide (`:76-84`).
- **Rows, in order (`:166-188`):**
  - Card 1: popular (`star`), classic (`pillar`), easy (`teddy-bear`), new (`leaf`).
  - Card 2: random (`shuffle`).
  - Card 3: about (`information-outline`), options (`cog-outline`), labels (`tag-multiple-outline`), data (`database`).
  - Every row has a `chevron-right` on the right. Icons are MaterialCommunityIcons at size 20 with no colour set, so they render default black (`homeIcon.tsx:5-8`, `HomeScreen.tsx:206-215`).
- **Row layout:** Paper List.Item.
  - `minHeight` 56, `paddingHorizontal` 10, `paddingVertical` 4 (`useListStyles.ts:16-21`).
  - Paper adds an inner row `marginVertical` of 6, a left-icon `marginLeft` of 16, a content `paddingLeft` of 16 and a right `marginLeft` of 16 (Paper `List/ListItem.tsx` styles, `List/utils.ts:41-43,70`).
  - Content `paddingVertical` is 4 (`:70-72`).
  - The title is bodyLarge 22/28 in #1A1B1E, with font multiplier 1.5 (`:109-110`).
- **Dividers:** Paper Divider, hairline, #C4C6CF, full width (Paper `Divider.tsx:66,76`).
- **Press:** the wrapping Pressable's background changes to #E0E2EC while pressed, instantly (`useListStyles.ts:24-26`).
- **Snackbar:** "handleOpenUrl error: ..." with a "close" action (`:194-200`).

## 6. Tag list screens

### Common structure (`PopularScreen.tsx:92-130`)

- Layout is a ListHeader, then the list container padded by the left and right insets, then TagList.
- A pending overlay sits absolutely over the screen, centred: an RN `ActivityIndicator size="large"`, the system spinner (`:108-112`, `CommonStyles.ts:39-42`).
- An error Snackbar reads "error fetching tags: ${error}". It has a close icon, lasts 7 s, and uses #2F3033 with #F1F0F4 text (`:113-119`).
  - Paper: margin 8, radius 9, fades in over 200 ms with scale 0.9->1, fades out over 100 ms (Paper `Snackbar.tsx:155,185,217,315`).
- **Pull-to-refresh:** none.
- **Pagination:** only in Search.
- **Long-press and swipe on rows:** none.

| Screen | Title / icon | Back | Default sort | Sort toggle target | Other menu items | Empty text |
|---|---|---|---|---|---|---|
| Popular | popular / `star` | yes | downloads (`popularSlice.ts:34`) | alpha <-> downloads | "reload popular tags" (`reload`), "clear popular tags" (`broom`) | "no tags found", after success only |
| Classic | classic / `pillar` | yes | alpha (`classicSlice.ts:27`) | alpha <-> id | "reload classic tags", "clear classic tags" | same |
| Easy | easy / `teddy-bear` | yes | alpha (`easySlice.ts:27`) | alpha <-> id | "reload easy tags", "clear easy tags" | same |
| New | new / `leaf` | yes | newest (`newSlice.ts:27`) | alpha <-> newest | "reload new tags", "clear new tags" | same |
| Favorites | faves / `heart-outline` | no | alpha (`favoritesSlice.ts:59`) | the other two of [alpha, newest, id] (`FavoritesScreen.tsx:41-42`) | "remove all favorites" (`broom`) | "to add favorites,\ntap the heart icon in sheet music" (`:101`) |
| History | history / `history` | no | not determined (`historySlice.ts` initial state not read; max 50 items, `historySlice.ts:20`) | the other two of [alpha, newest, id] (`HistoryScreen.tsx:44-45`) | "clear history" (`broom`) | "tags you have viewed will show up here" (`HistoryScreen.tsx:84`) |
| Search | "" / no icon | no | downloads (`searchSlice.ts:75`) | all SortOrder values except the current, in enum order alpha, downloads, id, newest (`SearchScreen.tsx:89-99`, `Search.ts:31-36`) | "clear search" (`broom`) | see section 7 |

Menu item order is: sort item(s) first, then reload (where present), then clear/remove (`PopularScreen.tsx:49-77`).

Sort labels and icons (`src/modules/tagLists.ts:25-37`):

| Order | Label | Icon |
|---|---|---|
| alpha | "sort alphabetically" | `sort-alphabetical-ascending` |
| downloads | "sort by downloads" | `sort-numeric-descending` |
| newest | "sort by newest" | `sort-calendar-descending` |
| id | "sort by id" | `sort-numeric-ascending` |

### FABDown menu (`src/components/FABDown.tsx`)

- **Trigger:** there is no visible trigger FAB. The header menu button opens it. It closes on blur (`PopularScreen.tsx:35-41`).
- **Container:** an absolute-fill overlay. Its `paddingTop` is `headerHeight - 45` (`useFabDownStyle.ts:11`), which overrides the top inset set at `:223-226`; an inner 35 is added (`:317`).
- **Items:** right-aligned rows.
  - `paddingHorizontal` 24, `paddingBottom` 16 (`:251,340-346`).
  - Label: bodyLarge in #1A1B1E, transparent background, padding 12/6, margin 16/8 (`:246-249,331-339`).
  - Then a small Paper FAB: 40x40, radius 27, icon 24 in #001B3D, background level3 #E5EAF5, elevation-3 shadow (Paper `FAB/utils.ts:331,395`, `FAB/FAB.tsx:256,266`).
- **Backdrop:** rgba(253,251,255,0.95) (Paper `FAB/utils.ts:324`). Tapping it closes the menu.
- **Open animation:**
  - Backdrop opacity goes 0->1 over 250 ms, reaching full by 50% of the progress (`:130-134,174-177`).
  - Items animate over 150 ms each, staggered 15 ms in reverse order, so the bottom item goes first (`:135-146`).
  - Each item: opacity 0->1, scale 0.5->1, translateY -8->8 (`:181-205`).
- **Close animation:** backdrop 200 ms, items 150 ms, in parallel (`:149-162`).
- **Item press:** runs the action, then closes (`:259-262`).

### Favorites confirm sheet (`FavoritesScreen.tsx:126-154`)

- A gorhom BottomSheetModal with dynamic sizing and pan-down-to-close.
- Backdrop opacity 0.3, press to close (`:48-59`). Background #FDFBFF, handle #74777F.
- Horizontal padding is `max(24, insets + 24)`, top padding 8, bottom padding `max(24, insets.bottom)` (`:86-99,135`).
- Rows have `paddingVertical` 18 and are centred:
  - "remove all favorites", bodyLarge in #BA1A1A
  - a Divider
  - "cancel", bodyLarge

### TagList (`src/components/TagList.tsx`)

- **List:** a FlashList with holder `marginTop` 5 (`:187-190`) and `onEndReachedThreshold` 0.5 (`:166`).
- **Empty text:** bodyLarge 22/28, centred, `paddingTop` 55, `paddingHorizontal` 30. bodyLarge overrides the `fontSize: 14` that precedes it (`:103,181-186`).
- **Row press:** sets the selected tag, then `navigate('Tag')` (`:145-150`).
- **Returning from Tag:** if `tagState` is `closing`, the list scrolls the selected index into view, with no animation flag.
  - `viewPosition` is 0 if the item is above the viewport, 1 if below (`:47-78`).
  - Visibility tracking uses a 95% coverage threshold and `waitForInteraction` (`:89-92`).
- **Load more (Search only):** after a successful load, 200 ms later the list calls `scrollToIndex(previous last index, viewPosition 1)` (`:112-126`).

### TagListItem (`src/components/TagListItem.tsx`)

- **Row:** `paddingRight` 8, `paddingVertical` 2, a 1px #C4C6CF bottom border (`:146-155,54`). That is roughly 61pt tall (2 + 28 + 28 + 2 + 1).
- **Dot column:**
  - `paddingHorizontal` 3. The text is 8 wide, default 14px: a bullet character when selected, otherwise empty (`:58-62,177-184`).
  - The dot is never shown in History (`TagList.tsx:143`).
- **Line 1:** the title, bodyLarge in #265EA7, one line. It is followed by a non-breaking space, then a nested "aka {aka}" in bodySmall 17/22 #555F71 (`:65-89`).
- **Line 2 (row, space-between):**
  - Left: `{arranger || 'anon'}` in bodySmall #555F71 (`tagInfo.ts:5`). It is followed by a non-breaking space, then a `download` icon at size 14 and the download count in bodySmall #74777F.
    - The download count is omitted for Favorites and label lists (`:29-45`, `src/modules/tagListUtil.ts:39-44`).
  - Right: TagId, which is "#" at fontSize 14 with letterSpacing 3, followed by the id (`TagId.tsx:11-22`).
    - The id is bodyLarge #555F71, `minWidth` 69, clipped rather than ellipsized (`:102-111,185-189`).
- **Press:** a gesture-handler Pressable whose background becomes #E0E2EC while pressed (`:122-131`).

### Random (`src/screens/RandomScreen.tsx`)

- It is not a list. It renders `TagLayout` (out of scope here) with one extra action, the `shuffle` icon (testID `tag_shuffle`), which dispatches `getRandomTag` (`:43-56`).
- It fetches a tag on mount. The fallback title is "not found" (`:14-18`). Back calls `goBack`.

## 7. Search

### Search screen (`src/screens/SearchScreen.tsx`)

- **Dialog host:** an RN `Modal` with `animationType="none"` and `statusBarTranslucent`. It is visible on first mount (`:30,130-132`). This is the only modal-like surface, and it appears and disappears instantly.
- **When a query exists:**
  - A query pill sits in a centred row with `marginTop` -20, so it overlaps the bottom of the header (`:227-232`).
  - It is a Paper Button in elevated mode with icon `magnify` and the query text as its label. Pressing it reopens the dialog (`:137-150`).
  - Pill style: content height 40, `minWidth` 150, `maxWidth` 200, `marginHorizontal` 5 (`:248-260`).
  - Pill label: bodyLarge in #555F71. The icon inherits that, so it is size 22 in #555F71 (Paper `Button/Button.tsx:311,381`).
  - Pill surface: background #F2F3FB, radius 45, elevation 1. While pressed, elevation rises to 2 over 200 ms and returns over 150 ms (Paper `Button/Button.tsx:234-283`).
- **Filter chips row:** padding 3, centred. The chips are not pressable (`:113-122,233-244`).
  - Each is a Paper Chip: flat, transparent, radius 0, margin 3. Text is #265EA7 at weight normal, labelLarge 20/26. Icon is size 18 in #121C2B.
  - Collection is shown if it is not All, with icon `playlist-check` and the lower-cased value "classic" or "easytags".
  - Tracks is shown if `learningTracks` is on, with icon `filter-check-outline` and label "tracks".
  - Parts is shown if it is not any, with icon `account-multiple-check-outline` and label "{parts} parts" (for example "four parts") (`:153-167`).
- **Empty text:**
  - idle: "tap the search button below to find tags"
  - succeeded: "no matching tags found"
  - otherwise "" (`:78-86`)
- **Floating button:** absolute, bottom 0, centred, `paddingVertical` 8.
  - It is an elevated Button with icon `shimmer` and label "new search", in the same style as the query pill.
  - Pressing it clears the search and opens the dialog (`:187-205,270-279`).
- **Infinite scroll:** `moreSearch` fires when the count is under 99, more results are available, and nothing is pending (`:63-77`). The page size is 33 (`Search.ts:1,13`). While `morePending`, a small ActivityIndicator of height 60 shows below the list (`:184-186,280-282`).

### SearchDialog (`src/components/SearchDialog.tsx`)

- **Container:** `flex: 1`, padded by the top and bottom insets and the left and right body insets. No background is set (`:133-139`).
- **Searchbar (Paper, bar mode):**
  - Margins 20/10 (`:95-98`). `minHeight` 56, radius 63 (a pill), background level3 #E5EAF5, elevation 0 (Paper `Searchbar.tsx` defaults and styles).
  - The left icon is `chevron-left` in #43474E, and it dismisses the dialog.
  - Input font is bodyLarge with lineHeight 0 on iOS. Text is #43474E.
  - Placeholder is "search for tags" in #555F71 (`:174-175`).
  - A clear "close" icon appears when there is a value.
  - `returnKeyType` is search, `autoFocus` is on; capitalisation, autocorrect and spellcheck are off; font multiplier 1.3 (`:163-180`).
  - Submitting dismisses the dialog and dispatches `newSearch({query, filters})` (`:155-158`). An empty query is allowed.
- **Filter sections:** the container has `paddingHorizontal` 10. Each section has `paddingHorizontal` 10 and `marginBottom` 12.
  - Section label: labelLarge 20/26 in #265EA7, `paddingLeft` 4, `paddingBottom` 6 (`:99-109`).
  - "collection": all | classic | easy (`:197-201`)
  - "parts": any | 4 | 5 | 6 (`:215-220`)
  - "media" (multi-select toggle): sheet music | tracks (`:243-246`)
  - Defaults: sheet music on, tracks off, collection All, parts any (`searchSlice.ts:57-60`).
- **SegmentedPicker (`:63-82`):**
  - A row with a 1px #74777F border, radius 20, `overflow: hidden`.
  - Buttons have `flex: 1` and `paddingVertical` 8. Every button after the first has a 1px left divider.
  - Label is size 15 in #1A1B1E. A selected button has background #D9E3F8 and text #121C2B.
  - Press selects instantly with no feedback state, and dismisses the keyboard (`:40`).
- **Bottom "search" button:**
  - Paper contained Button with icon `magnify` at size 18, background #265EA7, white labelLarge text at weight normal, margins 20 and bottom 16, radius 45.
  - On iOS it renders only while the keyboard is hidden. It listens to `keyboardWillShow` and `keyboardWillHide`, and its initial state assumes the keyboard is visible (`:86-87,144-153,251-262`).

### SearchOptions (`src/components/SearchOptions.tsx`)

- It is a Paper Surface card: padding 5, margin 10, radius 10 (`:59-64`).
  - Title row: padding 10, `minHeight` 40, an icon at size 24 in primary, and a bodyLarge title with `paddingLeft` 8 (`:41,65-74`).
  - A bold 1px Divider (`:53`).
  - Children, with `paddingTop` 10, `paddingBottom` 5 and `minWidth` 150 (`:75-79`).
- SearchDialog does not use it. It is used elsewhere, for example in Options.

## 8. Safe area and landscape

- **Body content** is padded by the left and right insets only (`useBodyInsets.ts`). `useHorizontalInset` returns `max(left, right)`.
- **Landscape:**
  - Header is 58 tall when the top inset is 0.
  - Tab labels appear and icons shrink to 23.4.
  - Home shows three columns.
  - `shallowScreen` means width > height and height <= 500 (`useWindowShape.ts:3-6`). It sets the tab bar to `inset + 35`, and gives Home a minimum left padding of 30.
- **Dead code:** `statusBarSpacer` in `HomeScreen.tsx:59-61` is defined but never rendered.

## Not determined

- iOS rendering of weight 500 with only Regular font files bundled.
- The exact header centre-title offset when the icon columns differ in width.
- History's default sort order.
- `TagLayout` internals (out of scope).
