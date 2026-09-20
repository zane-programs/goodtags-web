# Web migration

## Architecture decisions

This fork’s default application is React DOM, not React Native Web. React Router supplies shareable URLs and browser back/forward navigation. shadcn/ui’s Radix-based dialogs, switches, inputs, and buttons provide keyboard/focus behavior; Tailwind v4 and the original theme tokens reproduce the mobile visual language.

`web/lib/queries.ts` retains the native catalog schema, full-text search semantics, exact-ID precedence, collection filters, and tag/track/video relationships. `catalog.worker.ts` keeps WASM initialization, validation, index rebuilding, and queries off the UI thread. RPC requests are paired with IDs and failures reject callers. Forced catalog replacements serialize with queries. Background downloads do not block queries and do not swap the live database.

The user library stores IDs rather than duplicating thousands of tag objects. Native backups intentionally contain only favorite/label IDs and titles; the browser import/export format remains compatible. Import validates the complete file before writing, merges instead of deleting existing data, deduplicates IDs, supports labels without favorites, and retains IDs absent from the current catalog. Label names are values in arrays, not object properties.

The media bridge forwards neither cookies nor authorization headers. Only HTTPS requests to the exact barbershoptags.com hostnames are allowed, including every redirect. Unexpected MIME types are rejected. Browser requests can use byte ranges; the service worker can produce range responses from complete cached media. YouTube embeds use the privacy-enhanced host and validated video IDs.

## Native feature mapping

| Native behavior | Web implementation |
| --- | --- |
| Welcome, home groups, four navigation tabs | Original branding/home layout; bottom tabs on mobile, sidebar on desktop |
| Popular/classic/easy/new lists | Matching collections and original limits (50/125/125/100) |
| Search | SQLite FTS4 in a worker; query, ID, collection, voice count, score/track filters; pagination |
| Random tags | Random score-bearing tag, plus session back/forward |
| Favorites and history | Persistent local library, sorting, remove/clear, 50-tag recent history |
| Labels | Independent membership, creation, rename, reorder by dragging or keyboard-accessible buttons, deletion |
| PDF and image scores | PDF.js canvas rendering on Safari/Chromium, all pages, zoom and original/download links |
| Learning tracks | All Parts/Tenor/Lead/Bari/Bass selection with remembered preference and native fallback order; browser audio controls |
| Pitch pipe | Original MP3 recordings; hold using pointer or keyboard, stop on release/cancel/blur |
| Metadata and videos | Accessible dialogs and responsive YouTube embeds |
| Native sharing and file picker | Web Share or clipboard for links, JSON downloads and file uploads for backups |
| Font option | Same bundled Vollkorn/Lato fonts |
| Keep awake | Screen Wake Lock while viewing tags, reacquired on visibility changes when allowed |
| System status-bar toggle | Browser-supported fullscreen control and standalone PWA; browsers cannot freely change OS chrome |
| Database refresh | Same upstream manifest/schema version; validated atomic IndexedDB installation |
| PDF cache clear | Clear scores and tracks without deleting preferences/library/catalog |
| Logs | In-session data-operation log |

## PWA lifecycle

The manifest defines standalone display, stable app identity/start URL/scope, 192/512-pixel icons, an Apple touch icon, maskable artwork, and search/favorites shortcuts. A browser installation event exposes the install prompt; browsers without that event show platform-specific instructions.

The generated Workbox service worker precaches the application shell, lazy PDF viewer, PDF worker, SQLite worker/WASM/database, fonts, and all pitch recordings. First activation claims existing clients. Later app versions wait for the user’s “Update now” action. Navigation falls back to the app shell; `/media` is excluded from navigation fallback. Media uses a bounded cache with range-request support. No private user data passes through that cache or the server.

## Verification and remaining device checks

Unit tests exercise the real bundled SQLite database, query filters and pagination, index repair, backup merging/invalid files, unavailable IDs, label/favorite independence, history, pitch mapping, and proxy URL restrictions. Browser tests cover desktop Chromium, phone-sized Chromium, and iPhone-sized WebKit: navigation, layout overflow, search/filter/sort, saving data, label operations, backup download/import, preferences, manifest, offline reload, and route fallback.

WebKit’s `context.setOffline` emulation currently rejects service-worker fetches in this environment. Its offline test instead starts a dedicated origin, installs the worker, **stops that server**, then reloads and searches successfully with no origin server available. Chromium tests use network-offline emulation. This is a real offline-origin test, not a mocked app response.

Real upstream PDF rendering and MP3 playback are checked separately from data tests. Automated browser/device emulation is not a substitute for physical iOS/Android/desktop installation, Safari OS integration, battery-policy wake locks, background audio, native share sheets, and a side-by-side screenshot review against the native app. Mobile colors, fonts, spacing, and hierarchy were ported from native source; no claim of pixel-identical rendering across operating systems is made.

## Reference documentation

- [shadcn/ui with Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [Vite PWA precaching](https://vite-pwa-org.netlify.app/guide/service-worker-precache)
- [PWA installation requirements](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
