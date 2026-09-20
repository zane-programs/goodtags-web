# goodtags for the web

A local-first React web port of Kenji Matsuoka’s goodtags app, using **React 19, shadcn/ui, Tailwind CSS v4, TypeScript, and Vite**. Browse barbershop tags, view scores, practice learning tracks, and keep favorites and labels on your device.

## Run

Requires Node **22.12+** and the repository’s Yarn 4 release.

```sh
corepack enable
yarn install --immutable
yarn dev
```

If Corepack is unavailable, use `node .yarn/releases/yarn-4.12.0.cjs` in place of `yarn`.

```sh
yarn build     # typecheck + production build + offline service worker
yarn start     # production build on the Workers runtime at http://localhost:4173
yarn test      # unit tests against the real bundled catalog
yarn lint
yarn playwright install chromium webkit
yarn test:e2e  # production-browser checks (build first)
```

`PORT` configures `yarn start`, which runs the same Worker that is deployed (through `wrangler dev`). `yarn dev` and `yarn preview` also support the media bridge. Development mode deliberately does not register a service worker: use the production build to test installation and offline behavior.

## What is included

- Popular, classic, easy, new, random, search, favorites, history, and labeled collections.
- Original Vollkorn/Lato fonts, blue theme, mobile navigation, and compact tag rows. Desktop adds a persistent sidebar and a split list/score workspace.
- Full-text offline search of the bundled 7,021-tag catalog, collection/part/media filters, and sorting.
- Image and multipage PDF scores, zoom controls, learning-track selection/playback/seeking, the original recorded pitch pipe, and YouTube performances.
- Independent favorites and labels, label rename/reorder/delete, 50-entry history, font preference, and screen wake lock where supported.
- Native-compatible JSON backup/restore with merge behavior and validation; unavailable tag IDs are preserved.
- An installable PWA, offline application/catalog/fonts/pitch audio, cached scores, explicit offline media downloads, and opt-in application updates.

## Deploy

The app deploys to Cloudflare as a single Worker: `dist/` as static assets, plus the media bridge with an edge cache. It fits the Workers Free plan; only media requests count against it. Follow [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md): `yarn deploy` creates and uploads the Worker, `tofu -chdir=infra apply` attaches your hostname, and CI can deploy on every push to `main`.

The app currently expects the **root of an origin**, not a subdirectory. There are no API keys or external databases to configure. User libraries remain in the browser; the Worker is stateless.

**Do not deploy only `dist/` to a static host without the media bridge.** The source content host does not send CORS headers for scores and tracks. `worker/media.ts` is a restricted same-origin bridge with HTTPS host validation, redirect checks, byte-range support and edge caching. Vite mounts the same handler in development/preview. The canonical tag database is downloaded directly from its CORS-enabled GitHub Pages origin.

Install from the browser’s install menu on supported Android/desktop browsers. On iPhone/iPad, use Safari → Share → Add to Home Screen. The app includes instructions when a browser does not expose an installation prompt. HTTPS is required in production for service workers, installation, and other secure-context APIs.

## Data and offline behavior

- Favorites, labels, history, preferences, and selected voice part use versioned browser-local storage; writes that fail do not report success. Tabs receive storage changes.
- The read-only catalog runs through SQLite WASM in a dedicated worker. Downloaded catalogs live in IndexedDB. Automatic updates are adopted on the next launch; Data → refresh adopts a validated download immediately.
- The bundled snapshot contains a stale derived FTS index. Catalog validation repairs that index in memory, then rechecks integrity; canonical data corruption, incompatible schemas, and incomplete downloads are rejected.
- The service worker precaches roughly 8 MB of application assets including the catalog. Opened scores are cached; **Save media offline** downloads a tag’s score and all tracks. The media cache is bounded and may be evicted by the browser. Videos require a connection.
- Clearing media cache keeps the catalog and personal library. Clearing browser/site data removes local data. Back up favorites and labels before changing browsers or devices.
- Browsers control system status bars and may deny wake locks. The native status-bar toggle is replaced by supported fullscreen controls and installed-app behavior.

See [the migration notes](docs/web-migration.md) for architecture, parity details, and verification boundaries.

## Repository layout

- `web/`: active React DOM application and tests.
- `worker/`, `wrangler.jsonc`: the Cloudflare Worker (static assets + restricted media bridge with edge caching).
- `infra/`: OpenTofu/Terraform for the Worker's custom domain. Deployer-agnostic; see [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md).
- `vite.config.ts`: Tailwind, worker bundling, PWA manifest, and caching.
- `components.json`, `web/components/ui/`: shadcn/ui configuration and source components.
- `src/assets/`: original fonts, audio, artwork, and SQLite seed. `scripts/prepare-web-assets.mjs` copies these into ignored public directories during development/build.
- `e2e/web/`: desktop Chromium, mobile Chromium, and iPhone-sized WebKit tests.
- `src/` (other than assets), `ios/`, `android/`, and the old native entry/configuration files: preserved as migration references; they are not imported or built by the web app. `legacy/` contains the original package and setup references. Native builds require the pre-port revision’s dependency graph.

The original project’s MIT license and attribution are retained. Tag content remains hosted by [barbershoptags.com](https://www.barbershoptags.com/).
