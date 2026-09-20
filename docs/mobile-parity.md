# iOS parity worklist

Reference: the upstream native implementation retained in `src/` (Goodtags 4.3.0, commit
`677f89f`), **built and run in the iOS Simulator**. Desktop keeps a responsive layout (a rail
instead of bottom tabs); phone and tablet sizes mirror the native layout and interactions.

A check is complete only when the implementation was compared with a rendered native capture
or, for timing and behavior that a still cannot show, with the native source and the library
source it depends on. The measurements behind each screen, with file:line citations, are in
`parity-home-browse.md`, `parity-tag-screen.md` and `parity-settings-labels.md`.

## Building the native reference (Xcode 27)

In a detached worktree of `677f89f` with its original lockfile and pods:

- Pass `IPHONEOS_DEPLOYMENT_TARGET=15.1` to `xcodebuild`; several pods declare 12.0/13.4,
  which Xcode 27 rejects.
- `expo-modules-jsi` `JavaScriptRuntime.swift:219` forms a C function pointer through a
  ternary, which the newer Swift compiler rejects. Split it into two `HostObjectCallbacks`
  constructor calls.
- Build `Release` for `iphonesimulator` so the JS bundle is embedded, install with
  `simctl install`, then run the upstream tour:
  `maestro test --test-output-dir <dir> -e SCREENSHOT_DIR=shots e2e/maestro/screenshots.yaml`
  (current Maestro requires the screenshot path to be relative).

`node e2e/web/parity/capture.mjs <dir>` produces the matching web captures.

## Compared against simulator captures

- [x] Welcome, home (portrait and landscape columns), bottom tabs (icons, active tint,
      landscape labels), shared header geometry and back/close/menu buttons.
- [x] Popular/classic/easy/new, favorites, history and label lists: row metrics, aka and
      download count, id column, truncation, selected-row dot, empty states, sort/reload/clear
      menus, centered spinner.
- [x] List action menu: contained in the screen (tab bar stays clear), first row at
      header − 10, labels + mini FABs, scrim.
- [x] Search: full-window dialog, pill search bar, segmented filters, keyboard-aware search
      button, query pill overlapping the header, filter chips, "new search" button, paging.
- [x] Tag screen, portrait and landscape: transparent header, id badge (phone and iPad
      sizes), heart/menu, vertically centered score, 80pt action bar, overlaying controls in
      landscape, menu rows at inset + 45.
- [x] Info and tracks sheets: content-height detent (tracks sheet top matches to the pixel),
      75%/90% detents, handle, 30% backdrop, row layout, link color, selected-part dot.
- [x] Tag labels (leading Material checkboxes, tonal "new label"), create label, label
      editor (inline rename, delete confirmation sheet), labels list and action bar.
- [x] Options (Material checkboxes, 64pt rows), data (section headings, grouped rows,
      snackbar copy and placement), about, logs.

## Matched from source (behavior a still cannot show)

- [x] Stack transition: react-native-screens `fade`, 0.5s ease-in-out; no animation on tab
      switches or on previous/next tag; screens beneath stay mounted.
- [x] Control dimming: full strength for 4s after a touch, then 50%, instantly; header never
      dims; closing the menu dims immediately; bar hidden under the menu in landscape.
- [x] Pitch pipe: restart on press, stop on release, 200pt note at 25% fading in 80ms and out
      200ms.
- [x] Menu animation: scrim 125ms in / 200ms out; rows 150ms, 16pt downward travel, 15ms
      stagger from the last row.
- [x] History after 7s of viewing; history list frozen while a tag from it is open;
      un-favoriting from the favorites list returns to it; returning to a list scrolls the
      last-opened row into view; pressing the focused home tab pops its stack.
- [x] Track selection: remembered part, AllParts then first-available fallback, mp3 only,
      selecting a part plays it and leaves the sheet open, loading spinner color, snackbar
      errors at 4s with "dismiss".
- [x] Press feedback: instant 12% underlay (Paper on iOS has no ripple); list rows fill with
      surface-variant.

## Deliberate differences

- **Status bar option** is shown but disabled: a browser cannot hide the system status bar.
  It reads as checked in an installed PWA, where the bar is always present.
- **Backup/restore** use a file download and the file picker in place of the iOS share sheet
  and document picker.
- **App updates** are offered in a snackbar and otherwise applied when the app is next
  backgrounded. **Install** appears as one row at the bottom of options, only where the
  browser exposes an install prompt (never on iOS Safari, which installs from the share menu).
- **Search results** can include more matches than native: the published database ships a
  stale FTS index, which the web worker rebuilds in memory, so lyric matches the native app
  misses are found. Search results are also not capped at the native ~130.
- **Wide windows** replace the bottom tabs with a rail; everything else is the same app.
- Web-only additions from the first port were removed: zoom buttons and percentage, share and
  save-offline actions, download/original links, install banner, fullscreen toggle. Zooming is
  pinch, ctrl-scroll or double-tap, up to 2x, as natively.

## Remaining device checks

- [ ] Physical iPhone, installed PWA: safe-area rendering under the translucent status bar,
      keyboard behavior in the search dialog, audio focus and the silent switch, edge-swipe
      back (the fade should not play on top of the system slide).
- [ ] Bottom-sheet drag feel against the native spring (damping 500, stiffness 1000, mass 3).
- [ ] Android and desktop PWA installation.
