# iOS parity worklist

Reference: original upstream native implementation retained in `src/`, targeting Goodtags 4.3.0. The user's installed iPhone app is the final visual reference. Desktop keeps a responsive web layout; mobile must preserve the native layout and interactions.

A check is complete only when implementation and browser verification agree. Source review alone does not establish pixel parity; device screenshots and native-only system behavior require separate comparison.

## Current work

- [x] Reproduce mobile score menu clipping with Playwright MCP.
- [x] Correct shared dialog positioning in the production CSS.
- [x] Restore score actions descending from the upper right.
- [x] Check score actions and secondary dialogs across six viewport sizes in WebKit, including focus trapping, dismissal, and focus restoration.
- [ ] Repeat score regression checks in Chromium and check desktop dialogs.
- [ ] Audit and match all score gestures, controls, media selection, information, labels, videos, loading/error states, orientation changes, and safe areas.
- [ ] Audit and match welcome, home groups, shared headers, bottom tabs, and navigation.
- [ ] Audit and match popular/classic/easy/new/search/favorites/history lists, sorting, filters, empty/loading states, and transitions.
- [ ] Audit and match random browsing and navigation history.
- [ ] Audit and match label creation, membership, rename, ordering, deletion, and label-tag lists.
- [ ] Audit and match options, data management, backup/restore, about, and logs.
- [ ] Obtain native iOS screenshots and compare corresponding web screenshots at matched sizes.
- [ ] Verify integrated mobile flows in Playwright MCP using WebKit and Chromium.
- [ ] Verify desktop layouts after mobile corrections.
- [ ] Verify installed PWA safe areas and system integrations on physical iOS; Android and desktop installation remain required device checks.

## Evidence

Detailed findings are recorded in `parity-home-browse.md`, `parity-settings-labels.md`, and `parity-ios-reference.md` as those audits complete. Automated score geometry/focus checks live in `e2e/web/score-menu.checks.mjs` and are also run through Playwright MCP.
