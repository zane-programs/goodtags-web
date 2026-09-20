# goodtags web

The active application is a React DOM port using React 19, TypeScript, Vite, shadcn/ui, and Tailwind v4. Read README.md and docs/web-migration.md before changing architecture.

- UI: `web/`, with `@/` imports. Preserve the original Vollkorn/Lato fonts, blue theme, mobile tabs and score layout. Desktop uses a sidebar and split list/score layout.
- Data: read-only SQLite WASM in `web/lib/catalog.worker.ts`; keep long work off the UI thread. Validate and persist a downloaded catalog before adopting it. Broken updates must preserve the working catalog. Background updates are adopted next launch.
- User state: versioned browser-local storage in `web/lib/store.tsx`; use its `update` API so storage failures are surfaced. Backup JSON must remain compatible with native favorites/labels exports. Labels do not imply favorites.
- Media: use `web/lib/media.ts` and the restricted same-origin handler in `server/media.mjs`. Preserve URL/redirect allowlisting, MIME checks, and byte-range behavior.
- PWA: configured in `vite.config.ts`. Application updates require an explicit user action; offline navigation must include lazy viewer/worker assets and the bundled catalog.
- Original native source/platform files remain as references and must not be imported into the web runtime. Assets are shared from `src/assets/`.
- Use `yarn lint`, `yarn test`, `yarn build`, and `yarn test:e2e`. Browser tests run against the production server. Add behavioral coverage for meaningful logic changes.
