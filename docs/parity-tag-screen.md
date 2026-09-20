# Native iOS parity spec: tag (score) screen

Extracted from the native React Native source at commit 677f89f.

I could not determine the following from source:
- Whether PDF double-tap zoom exists, and the PDFView gutter colour.
- WKWebView pinch and double-tap limits for image sheets.
- The exact fade curve and the swipe-back transition.
- The Videos card's vertical position.
- The pitch-pipe mp3 length.
- The `heart` toggle has no feedback beyond the icon swap.
- `Dimensions.get('window')` in the Videos screen does not update on rotation.
- `PortraitTransition` and `LandscapeTransition` exist only as param types.

Paths are relative to `src/` unless noted. "Paper" means `/tmp/goodtags-ios-parity-677f89f/node_modules/react-native-paper/src/components`, and "BS" means `.../@gorhom/bottom-sheet/src`.

Theme hex values come from `lib/theme.ts:23-67`:

| Token | Hex |
|---|---|
| primary | #265EA7 |
| onPrimary | #FFFFFF |
| background / surface | #FDFBFF |
| onSurface | #1A1B1E |
| outline | #74777F |
| outlineVariant | #C4C6CF |
| surfaceVariant | #E0E2EC |
| inverseOnSurface | #F1F0F4 |
| inverseSurface | #2F3033 |
| inversePrimary | #A8C8FF |
| elevation.level3 | #E5EAF5 |
| onPrimaryContainer | #001B3D |
| secondaryContainer | #D9E3F8 |
| onSurfaceDisabled | rgba(26,27,30,.38) |

- **Roundness:** 9.
- **Animation scale:** 1.0 (Paper `styles/themes/v3/LightTheme.tsx:67`).
- **Fonts:** Vollkorn-Regular, or Lato-Regular when `options.serifs` is false (`theme.ts:77-131`, `RootStackNavigator.tsx:53`).
- **Type sizes:** bodyLarge 22/28, bodyMedium 20/26, titleLarge 25/32 (`theme.ts:88-95`).
- **Icons:** string icon names resolve to MaterialCommunityIcons.

## 1. Screen structure and navigation

- `Tag` and `Random` are native-stack screens.
  - Options: `headerShown:false`, `animation:'fade'`, `freezeOnBlur`, `orientation:'all'` (`RootStackNavigator.tsx:39-51,65-67`).
  - The react-native-screens base fade duration is 0.35 s (`RNSScreenStackAnimator.mm:16`). The exact curve is not determinable from JS.
- Lists open the screen with `setTagState(opening)` followed by `navigate('Tag')` (`TagList.tsx:148-149`). Random is opened from the Home item `dest="Random"` (`HomeScreen.tsx:177`).
- Swipe-back is not configured, so the native-stack default edge swipe applies.
  - A swipe bypasses `goBack()`, so `TagState.closing` and stranded-tag cleanup do not run (`TagScreen.tsx:46-56`).
  - The transition used during the gesture is not determinable from source.
- `landscape` means window width > height (`useWindowShape.ts:10`).
- `PortraitTransition` and `LandscapeTransition` exist only as param types. There is no screen or usage for either (`navigationParams.ts:22-23`).
- The status bar is global. It is hidden by default (`showStatusBar:false`), hides with animation `'none'`, and uses `light-content` (`App.tsx:33-50`, `optionsSlice.ts:13`). Nothing on it is specific to the tag screen.
- Keep-awake calls `activateKeepAwakeAsync('tag-viewing')` while mounted if `options.keepAwake` is on (default true). It deactivates on unmount or when the option turns off (`TagLayout.tsx:176-185`, `optionsSlice.ts:14`).
- History: the tag is added after 7000 ms of viewing, and the timer resets when the tag changes (`useTagHistory.ts:6-19`).
- Metadata: `refreshTag` is dispatched on every tag id change (`TagScreen.tsx:34-39`).

## 2. Layout

The root is a `flex:1` column, in order: header, SheetMusic, note overlay, action bar (`TagLayout.tsx:318-374`).

| | Portrait | Landscape |
|---|---|---|
| Header holder | In flow, `position:relative`, z 100 (`useTagScreenStyles.ts:181-186`) | Absolute at top/left/right 0, z 100, overlaying the score (`:80-86`) |
| Action bar | In flow, height 80, `marginBottom: insets.bottom` (`:151-155`) | Absolute; `bottom: insets.bottom`, `left/right: max(inset, 0)`; transparent; **opacity 0 while the menu is open** (`:141-150`) |
| Score | Fills the space between header and bar | Full screen under both |

**Header** (`SharedHeader.tsx`, `TagLayout.tsx:320-328`)
- Height is `58 + round(0.7 × max(portrait ? 30 : 0, insets.top))` (`useHeaderHeight.ts:4-13`).
- Background is **transparent**, overriding the primary colour (`useTagScreenStyles.ts:16-18`), so the stack background #FDFBFF shows through.
- Padding: `paddingTop: insets.top`, `paddingLeft/Right: inset + 10`. It is a row with `alignItems:flex-end` (`SharedHeader.tsx:58-63,134-137`).
- Left column: minWidth 60, height 48 (`:138-144`).
  - Back is a Paper `IconButton` with icon `chevron-left`, glyph 42, colour #265EA7.
  - Its container is 48×48, transparent, `marginTop` 2 plus Paper's default margin of 6.
  - hitSlop is 10 (`BackButton.tsx:6,23-42`; Paper `IconButton.tsx:219-222`).
- Center column: flex 1, height 48, row, `justifyContent:flex-start`, `alignItems:flex-end`, **marginBottom 10**. The badge therefore sits at the left, next to the back button (`useTagScreenStyles.ts:19-23`).
- Id badge (`useTagScreenStyles.ts:106-125`, `TagLayout.tsx:239-246`):
  - Background #265EA7, minWidth 50, radius 8, padding 8 horizontal / 2 vertical. On iPad: minWidth 80, radius 12, padding 12/4.
  - Text is `#` plus the id, white, 18 px (iPad 26), normal weight, `marginRight` 7.
  - The `#` glyph is 14 px (iPad 16) with `letterSpacing` 3.
- Right column: minWidth 60, row, flex-end (`SharedHeader.tsx:156-162`).
  - Both buttons: glyph 26 (`CommonStyles.ts:6`), colour #265EA7, container 48×48, radius 24, margin 0, transparent (`useTagScreenStyles.ts:33-39`).
  - Heart: `heart` or `heart-outline`, hitSlop 12/12/12/8 (top/bottom/left/right).
  - Menu: `menu`, hitSlop 12/12/8/12 (`TagLayout.tsx:293-310`).
- Press feedback on iOS is an instant underlay of icon colour at α 0.06, clipped to the circle, with no ripple (Paper `TouchableRipple.native.tsx:104-121`, `utils.ts:24`, `IconButton/utils.ts:143`).
- The header has `pointerEvents:none` while either bottom sheet is visible (`TagLayout.tsx:319`).

**Score area** (`SheetMusic.tsx`). The background is #fcfcff (`:13`). On iOS the insets are forced to 0 (`:27`).
- PDF (uri ends in `.pdf`): the file is downloaded to `cache/pdfs/<sanitized>.pdf` and reused if cached (`usePdfCache.ts:13-89`). It is rendered with `PdfRendererView`, `maxZoom={2.0}` and `distanceBetweenPages={16}` (`:90-96`).
  - iOS PDFView settings: `autoScales`, vertical continuous mode, page breaks on, page shadows off (`RNPDFView.mm:48-54`).
  - Scale: minimum = size-to-fit (fit width), maximum = 2× fit, both applied about 1 s after load. The bottom page-break margin is 16 (`RNPDFView.mm:48-89`).
  - Whether double-tap zoom exists, and the PDFView gutter colour, are not determinable from source.
- Image: a WebView HTML page.
  - Body margin 0, background #fcfcff.
  - A flex container centres the image vertically with `min-height:100vh`.
  - The image uses `width:100%; object-fit:contain; box-shadow:0 0 1px 1px #eee`.
  - Viewport is `width=device-width, initial-scale=1.0` with no maximum scale (`:138-209`).
  - Pinch and double-tap limits are WKWebView defaults and cannot be determined from source.
- No uri: the text "No sheet music", centred, padding 20 (`:124-128,266-267`).

**Bottom action bar**. It is a row with `alignItems:center`, `justifyContent:space-between`, height 80, and `pointerEvents:box-none` (`useTagScreenStyles.ts:49-54`). Order (`TagLayout.tsx:339-374`):

| # | Button | Icon | Disabled |
|---|---|---|---|
| 1 | Pitch pipe | `NoteButton` | never |
| 2 | Play | `play` / `pause` / spinner | `!hasTracks` or loading |
| – | Spacer | flex 1 | – |
| 3 | TagScreen: prev | `arrow-up` | index ≤ 0 (`TagScreen.tsx:96-101`) |
| 4 | TagScreen: next | `arrow-down` | index ≥ last (`TagScreen.tsx:102-107`) |
| 3 | RandomScreen: shuffle (only nav button) | `shuffle` | never (`RandomScreen.tsx:49-53`) |

- The Play spinner is an `ActivityIndicator` with `size="large"` and colour #00E5FF (`TagLayout.tsx:58-62`).
- All buttons use `size=40`, giving a 56×56 container with radius 28 and margin 6 (Paper `IconButton.tsx:22,156,219-222`).
  - Container background is #F1F0F4 and the icon is #265EA7 (`useTagScreenStyles.ts:165-168`).
  - When disabled, the icon is rgba(26,27,30,.38) and the background is unchanged (Paper `IconButton/utils.ts:91-94`).
  - Prev and next are always rendered.
- NoteButton at size 40 (`NoteButton.tsx:32-69`):
  - A FontAwesome6 glyph named by the lowercase note letter, font size 28, in the primary colour.
  - The accidental is MCI `music-accidental-sharp` or `music-accidental-flat`, size 28, positioned absolutely at left 23.8.
  - The note is `key.split(':')[1]`, defaulting to `'F'` (`useNotePlayer.ts:59-61`).

## 3. Interactions

- **Dimming** (`useButtonDimming.ts:3-30`, `useTagScreenStyles.ts:9,167`). The bar buttons go to opacity 1, then drop to **0.5 after 4000 ms**. This is an instant style swap with no animation. Header buttons never dim.
  - `brightenThenFade` runs on mount.
  - It runs on a tap on the sheet.
  - It runs on any bar button press, deferred with `setTimeout 0`.
  - It runs on note press-out.
  - Note press-in brightens without starting a timer.
  - Closing the menu or pressing a menu item **dims immediately** (`TagLayout.tsx:379-382`). Opening the menu does not dim.
- **Sheet tap.**
  - PDF: an RNGH Tap with `maxDuration` 250. It is ignored when `event.y ≤ headerHeight`, which applies in portrait too (`SheetMusic.tsx:35-42`).
  - Image: `window.onclick` posts `"click"`. This is suppressed once the image has errored (`:144-148`).
- **Favorite.** Dispatches `addFavorite` or `removeFavorite`. The only feedback is the icon swap: no animation, haptic or snackbar. In the Favorites list, un-favoriting also navigates back (`TagScreen.tsx:83-92`). Random never goes back (`RandomScreen.tsx:35-41`).
- **Prev/next.**
  - Pressing calls `pause()` and then sets the selected index ±1 in the current list (`TagLayout.tsx:364-367`, `TagScreen.tsx:58-81`).
  - The tag swaps on the same screen with no transition.
  - There is no autoplay after the swap.
  - Shuffle dispatches `getRandomTag()`.
  - The Random fallback tag is `{id:0,title:'not found',key:'F:natural'}` (`RandomScreen.tsx:14-18`).
- **Back.** Clears the stranded tag if applicable, sets `TagState.closing` (the list then scrolls to the tag), and calls `goBack` (`TagScreen.tsx:46-56`).
- **Tracks** (`useTrackPlayer.ts`, `tracksSlice.ts`).
  - Available parts are AllParts, Tenor, Lead, Bari, Bass, and only mp3 tracks are kept (`Tag.ts:120-160`).
  - The selected track is the `selectedPart` if the tag has it, else AllParts, else the first track (`tracksSlice.ts:25-33`).
  - `selectedPart` defaults to AllParts and is persisted: the root persist config has no blacklist (`store.ts:45-56`).
  - Play replaces the source and plays when any of these holds: the player is not loaded, the url changed, or the track finished. Otherwise it resumes (`:70-92`).
  - `isLoading = loading && !playing && !error`. While loading, the spinner replaces the icon and the button is disabled (`:35`, `TagLayout.tsx:62,73`).
  - A finished track (`didJustFinish` or NaN `currentTime`) shows the play icon, and the next press restarts from the beginning (`:54-59`).
  - Opening Videos and pressing prev/next both pause playback.
- **Pitch pipe** (`TagLayout.tsx:214-233`, `useNotePlayer.ts:81-102`).
  - Press-in: `seekTo(0)` and play (skipped if already playing). It fires a Medium impact haptic and fades the overlay opacity 0→1 in 80 ms.
  - Press-out: pauses the audio and fades the overlay 1→0 in 200 ms. Both fades use the Animated default easing, inOut(ease).
  - The overlay is absolute-fill and centred, with `pointerEvents:none`. It shows a NoteButton at size 200 (glyph 140) in the primary colour, with inner opacity 0.25 (`useTagScreenStyles.ts:169-180`, `TagLayout.tsx:331-338`).
  - There is no loop. The mp3 length is not determinable from source.
  - Audio file mapping: sharps map to their flat equivalents, and Cb maps to B (`useNotePlayer.ts:6-29`).

## 4. Menu (FABDown speed dial, opening downward)

- **Trigger.** The header `menu` button toggles `fabOpen` (`TagLayout.tsx:305`). The menu renders in a Paper `Portal`. The FAB itself is never rendered (`FABDown.tsx:216-309`).
- **Container.** Absolute fill. `paddingTop = insets.top + 10`, because the group style overrides the default (`useTagScreenStyles.ts:136-139`, `FABDown.tsx:220-229`). An inner `paddingTop` of 35 follows, with items right-aligned (`:315-318`). The first item's top is therefore at insets.top + 45.
- **Backdrop.** Colour rgba(253,251,255,0.95) (Paper `FAB/utils.ts:322-324`). It covers the full screen, and a tap on it closes the menu (`FABDown.tsx:231-242`).
- **Items, top to bottom** (`TagLayout.tsx:248-288`):
  1. `file-document-outline`, label "tag info".
  2. `tag-outline`, label "labels".
  3. `headphones`, label "tracks", shown if `hasTracks`.
  4. `video-box`, label "videos", shown if `hasVideos`. Pressing it pauses the track.
  - `hasTracks` and `hasVideos` mean length > 0 and the first entry is defined (`useTagMedia.ts:12-13`).
- **Row layout** (`FABDown.tsx:331-346`):
  - Row: `justifyContent:flex-end`, `alignItems:center`, `paddingHorizontal` 24, `paddingBottom` 16, stretched to full width. The whole row is pressable.
  - Label box: padding 12 horizontal / 6 vertical, margin 16 horizontal / 8 vertical, transparent.
  - Label text: bodyLarge 22/28, colour #1A1B1E (`:246-249`).
  - FAB: small, 40×40, radius 27 (3 × roundness). Background #E5EAF5, icon 24 px in #001B3D, MD3 elevation 3 (Paper `FAB/utils.ts:336-347,395`, `FAB.tsx:257,268`).
- **Open animation** (`FABDown.tsx:128-147`).
  - Backdrop: timing 0→1 over 250 ms, with opacity mapped [0,.5,1]→[0,1,1] (`:173-178`).
  - Items: a 15 ms stagger in **reverse order**, so the last item animates first. Each item runs 150 ms, opacity 0→1 and translateY −8→+8 on both label and FAB (`:190-205`).
  - The 0.5→1 scale in the code is overridden by the second `transform` entry, so there is effectively no scale (`:289-297`).
  - Easing is the Animated default inOut(ease), with the native driver.
- **Close animation.** Backdrop 1→0 over 200 ms. All items fade 1→0 over 150 ms in parallel, with translateY held at +8 (`:149-162,196,204`).
- **Dismissal.** A backdrop tap, or an item press. An item press runs the action and then `close()` (`:259-262`).

## 5. Bottom sheets (gorhom BottomSheetModal 5.2.14)

**Shared** (`TagLayout.tsx:169-170,187-198,388-411`)
- `snapPoints` are ['75%','90%']. `enableDynamicSizing` is left at its default of true (BS `bottomSheet/constants.ts:15`).
  - This adds a content-height detent and sorts the list (BS `hooks/useAnimatedDetents.ts:79-98`).
  - The sheet therefore opens at index 0, the **smallest** of {content + 24 px handle, 75%, 90%}.
- `enablePanDownToClose` is on.
- Background is #FDFBFF with top radius 15 (BS `bottomSheetBackground/styles.ts`).
- The handle area has padding 10. The indicator is 7.5% of window width × 4, radius 4, colour #74777F (BS `bottomSheetHandle/styles.ts`).
- The backdrop is black at opacity 0.3, appearing at index 0 and disappearing at index −1, with `pressBehavior="close"`.
- The iOS animation is a spring: damping 500, stiffness 1000, mass 3, `overshootClamping` true, `restDisplacementThreshold` 10, `restSpeedThreshold` 10 (BS `constants.ts:71-84`).
- Content panning and over-drag are enabled, with over-drag resistance 2.5 (BS `bottomSheet/constants.ts:9-12`).
- Dismissal is by dragging down or tapping the backdrop.

**Info sheet** (`TagInfoView.tsx`)
- Outer container: centred, `paddingHorizontal` max(20, inset + 20). In landscape it is max(60, inset + 20) (`:18-25`).
- Inner container: `paddingTop` 10, `paddingBottom` 50, `maxWidth` 95% (`:127-131`).
- Title: `tag.title`, titleLarge 25/32, `marginLeft` 3.
- Divider: bold (1 px), colour #C4C6CF, `marginVertical` 10. The list has `paddingTop` 10.
- Rows appear only if the value is truthy (`:27-36,59`). Labels, verbatim: `aka:`, `id:`, `arranger:` (falls back to "anon", `tagInfo.ts:5`), `posted:`, `parts:`, `lyrics:`, then `tracks:` (the quartet).
- Row style (`:135-146`):
  - Row: `paddingVertical` 3, gap 10.
  - Name: minWidth 120, bodyMedium 20/26, 1 line.
  - Value: shrinks, 2 lines.
- Lyrics are truncated at 80 characters, or at the last space if that space is after index 60, with " …" appended (`:105-115`).
- The quartet value becomes a link if `quartetUrl` starts with `http`. It is underlined in #4444ff and opens with `Linking.openURL` (`:67-83,147-150`).

**Tracks sheet** (`TrackMenu.tsx`)
- Outer container: centred, `paddingHorizontal` max(20, inset + 20), `paddingBottom` max(20, insets.bottom).
- Inner container: padding 12 vertical, 8 left, 4 right (`:25-35`).
- One Paper `Menu.Item` per available part, in track order (`:73-81`):
  - Height 48, minWidth 112, maxWidth 280 (Paper `Menu/MenuItem.tsx:248-253`).
  - `marginLeft` −29.
  - The title is bodyLarge, in the form `•␣␣<name>`. The name is the part key, with `AllParts` displayed as "All Parts".
  - The bullet is visible only on the row matching `selectedPart`. On other rows it is coloured #FDFBFF, i.e. invisible (`:44-46,61-68`).
- Selecting a part calls `setSelectedPart` and `setTrackUrl(url)`, which loads and plays immediately, and then `onDismiss()` (`:52-59`).
  - `onDismiss()` only clears `tracksVisible`. **The sheet is not programmatically dismissed** (`TagLayout.tsx:410`).

## 6. Videos and tag labels (pushed screens)

Both are native-stack **pushes**, not modals. They use the fade animation, `orientation` all, and a custom `NavHeader`, which is a `SharedHeader` (`RootStackNavigator.tsx:68-107`, `NavHeader.tsx`).
- Header: background #265EA7, the header height from section 2, back `chevron-left` at 42 in white.
- Title: centred, titleLarge 25/32, white. Text is `labels` or `videos`.

**Videos** (`VideoView.tsx`)
- Background #FDFBFF, with `paddingHorizontal = max(insets.left, insets.right)` (`:40-47`).
- A horizontal paging FlatList with `decelerationRate="fast"` and no scroll indicator (`:128-140`).
- Card: width = window width − 2 × inset, `paddingVertical` 10, contents centred.
- Player size (16:9, `:49-66`):
  - Portrait: full available width, height = width × 9/16.
  - Wide screens: height = min(0.75 × window height, available width × 9/16).
- The YouTube iframe is mounted **only for the current index**. It has radius 12 and a 2 px #74777F border.
- Other indices render a placeholder with background #E0E2EC, the same border, and the same size (`:75-105`).
- Changing page (50% visibility threshold) sets `playing=false` (`:28-38`).
- Dots are shown only when there is more than one video (`:109-123,172-182`):
  - 8×8, radius 4, `marginHorizontal` 4, row `paddingVertical` 12.
  - Active #265EA7, inactive #E0E2EC.
- There is no title or counter text.
- `Dimensions.get('window')` is not reactive to rotation (`:25`).
- The card's vertical position in the list cannot be fully determined from source.

**Tag labels** (`TagLabels.tsx`)
- Container margin is 10 vertical / 15 horizontal, plus the horizontal inset padding.
- A ScrollView list (`paddingTop` 10) sits above the button (`:96-131`).
- Each row is a Paper `Checkbox.Item` (`:26-44,116-127`):
  - `mode="android"`, `position="leading"`.
  - Label font size 22, `marginLeft` 5.
  - Item `paddingVertical` 0 and `paddingLeft` 0. The right padding keeps Paper's 16.
  - The row wrapper has `paddingVertical` 5.
  - The label uses Paper's `textAlign:'right'` for leading position (Paper `Checkbox/CheckboxItem.tsx:173`).
- A press toggles `addLabel` or `removeLabel` immediately. Removing the active label while inside that label's list strands the tag (`favoritesSlice.ts:199-204`).
- Button, text **"new label"** (`:82-91`; Paper `Button.tsx:283-284`):
  - Icon `plus`, 18 px. Mode contained-tonal: background #D9E3F8, text #121C2B.
  - Label bodyLarge. Pill radius 45.
  - `alignSelf:flex-start`, margin 15.
  - It navigates to `CreateLabel`, titled "new label", whose back button is a `close` icon via `headerBackTitle:'cancel'`.

## 7. Loading, error and snackbar

- **PDF loading.** A centred large `ActivityIndicator` with the text "loading pdf..." (`marginTop` 16) (`SheetMusic.tsx:58-64`).
- **PDF error** (`:67-83,270-298`):
  - A 48 px "⚠️".
  - "Unable to load sheet music": 18 px, weight 600, #333.
  - The uri, then "Check your network connection and try again": 14/20, #666, `paddingHorizontal` 20.
  - A contained button "Retry": background #6200ee, radius 3, white text at 17 px in the System font. It re-runs the download.
- **Image error**, inside the WebView (`:150-164,210-252`):
  - The same icon, title and uri, plus "Check your network connection and try again".
  - An HTML "Retry" button: #6200ee (#3700b3 when active), radius 2, padding 12×24, 16 px, weight 500.
  - Retrying shows "Loading..." (16 px, #666).
- **WebView render error.** The text "Unable to load image" (`:110`).
- **Track error snackbar** (in a Portal, `TagLayout.tsx:412-424`). Duration **4000 ms**, action **"dismiss"**.
  - Paper snackbar style (Paper `Snackbar.tsx:184-217,260-269,315`):
    - Anchored at the bottom with `paddingBottom = insets.bottom`.
    - Margin 8, radius 9, minimum height 48.
    - Background #2F3033, text #F1F0F4 in bodyMedium, action text #A8C8FF.
    - In: opacity 0→1 over 200 ms with `Easing.out(ease)`, scale 0.9→1.
    - Out: 100 ms.
  - Messages (`useTrackPlayer.ts:66,97,113,123,131,147`):
    - "No track available"
    - "no track selected"
    - "MIDI files are not supported" (unreachable, because only mp3 tracks are kept)
    - "Playback error: …"
    - "Failed to load track: …"
    - "Pause error: …"
  - Errors auto-clear once the track loads or plays (`:47-51`).
- There are no toasts for favorite or label actions.
