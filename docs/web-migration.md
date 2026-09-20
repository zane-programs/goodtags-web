# Web migration

## Architecture decisions

This fork’s default application is React DOM, not React Native Web. React Router supplies shareable URLs and browser history; on top of it, `web/navigation` reproduces the native navigator (a root stack over keep-alive tabs with a nested home stack, native fade transitions, state carried in `history.state`). All styling is Tailwind v4 utilities on shadcn/ui components themed from the native Paper theme; there is no component CSS. See [web-design-system.md](web-design-system.md) for tokens, components, navigation and how parity is checked, and [mobile-parity.md](mobile-parity.md) for what has been compared with the iOS app.

`web/lib/queries.ts` retains the native catalog schema, full-text search semantics, exact-ID precedence, collection filters, and tag/track/video relationships. `catalog.worker.ts` keeps WASM initialization, validation, index rebuilding, and queries off the UI thread. RPC requests are paired with IDs and failures reject callers. Forced catalog replacements serialize with queries. Background downloads do not block queries and do not swap the live database.

The user library stores IDs rather than duplicating thousands of tag objects. Native backups intentionally contain only favorite/label IDs and titles; the browser import/export format remains compatible. Import validates the complete file before writing, merges instead of deleting existing data, deduplicates IDs, supports labels without favorites, and retains IDs absent from the current catalog. Label names are values in arrays, not object properties.

The media bridge is a Cloudflare Worker (`worker/`); static files are served by Cloudflare without invoking it. It forwards neither cookies nor authorization headers. Only HTTPS requests to the exact barbershoptags.com hostnames are allowed, including every redirect. Unexpected MIME types are rejected. Complete files are kept in the edge cache and byte ranges are answered from them, so a group opening the same tag contacts the content host once; the service worker can also produce range responses from complete cached media. See [cloudflare-deployment.md](cloudflare-deployment.md). YouTube embeds use the privacy-enhanced host and validated video IDs.

## Native feature mapping

| Native behavior | Web implementation |
| --- | --- |
| Welcome, home groups, four navigation tabs | Same screens and layout; bottom tabs, or a rail on wide windows |
| Popular/classic/easy/new lists | Matching collections and original limits (50/125/125/100); sort, reload and clear from the list menu |
| Search | SQLite FTS4 in a worker; the native full-window search dialog with collection, parts and media filters; 33-row paging |
| Random tags | Random score-bearing tag with the shuffle button |
| Favorites and history | Persistent local library, sorting, remove/clear; a tag enters the 50-tag history after 7 seconds |
| Labels | Independent membership, creation, inline rename, drag (or keyboard) reorder, deletion behind a confirmation sheet |
| PDF and image scores | PDF.js canvas rendering, all pages with a 16px gap; pinch, ctrl-scroll or double-tap zoom to 2x; no zoom buttons, as natively |
| Learning tracks | All Parts/Tenor/Lead/Bari/Bass with remembered preference and native fallback order; play/pause in the action bar, part selection in a bottom sheet |
| Pitch pipe | Original MP3 recordings; hold using pointer or keyboard, stop on release, large note overlay |
| Metadata and videos | Tag info bottom sheet; videos as a paged full screen that loads only the visible player |
| File picker | JSON download and file upload for backups (in place of the iOS share sheet and document picker) |
| Font option | Same bundled Vollkorn/Lato fonts, switched by one theme token |
| Keep awake | Screen Wake Lock while a tag is focused, reacquired on visibility changes when allowed |
| System status-bar toggle | Shown but disabled; browsers cannot hide OS chrome |
| Database refresh | Same upstream manifest/schema version; validated atomic IndexedDB installation |
| PDF cache clear | Clears cached PDFs without deleting preferences/library/catalog |
| Logs | The latest 25 console entries, colored by level |

## PWA lifecycle

The manifest defines standalone display, stable app identity/start URL/scope, 192/512-pixel icons, an Apple touch icon, maskable artwork, and search/favorites shortcuts. A browser installation event exposes the install prompt; browsers without that event show platform-specific instructions.

The generated Workbox service worker precaches the application shell, lazy PDF viewer, PDF worker, SQLite worker/WASM/database, fonts, and all pitch recordings. First activation claims existing clients. Later app versions are offered in a snackbar (“update”) and otherwise apply the next time the app is backgrounded. Navigation falls back to the app shell; `/media` is excluded from navigation fallback. Media uses a bounded cache with range-request support. No private user data passes through that cache or the server.

## Verification and remaining device checks

Unit tests exercise the real bundled SQLite database, query filters and pagination, index repair, backup merging/invalid files, unavailable IDs, label/favorite independence, history, pitch mapping, and the media bridge (URL restrictions, redirects, caching, ranges) against a fake cache and upstream. Browser tests run the production build on workerd through `wrangler dev`. `web/styles.test.ts` guards the styling rule (one tokens-only stylesheet). Browser tests cover desktop Chromium, phone-sized Chromium, and iPhone-sized WebKit: the stack (push, previous/next in place, back, browser back/forward, deep links), keep-alive tabs, control dimming, the tag menu and sheets, search/filter/sort, favorites, label operations including reorder, backup download/import, preferences, layout overflow, manifest, and offline reload. Because covered screens stay mounted, tests target only non-`inert` content.

WebKit’s `context.setOffline` emulation currently rejects service-worker fetches in this environment. Its offline test instead starts a dedicated origin, installs the worker, **stops that server**, then reloads and searches successfully with no origin server available. Chromium tests use network-offline emulation. This is a real offline-origin test, not a mocked app response.

Real upstream PDF rendering and MP3 playback are checked separately from data tests. Automated browser/device emulation is not a substitute for physical iOS/Android/desktop installation, Safari OS integration, battery-policy wake locks, background audio, native share sheets, and a side-by-side screenshot review against the native app. Layout and metrics were compared screen by screen with captures of the native app running in the iOS Simulator; what was compared, what was matched from source, and what still needs a physical device is tracked in [mobile-parity.md](mobile-parity.md).

## Reference documentation

- [shadcn/ui with Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [Vite PWA precaching](https://vite-pwa-org.netlify.app/guide/service-worker-precache)
- [PWA installation requirements](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
