# Contributing to goodtags web

Use Node 22.12+ and the checked-in Yarn 4 release. Run `yarn install --immutable`, then `yarn dev`.

The active application is in `web/`; retain the original fonts, colors, mobile hierarchy, offline catalog behavior, and native-compatible backup format when making changes. Keep platform-specific code in browser adapters rather than importing React Native dependencies.

Before submitting changes:

```sh
yarn lint
yarn test
yarn build
yarn playwright install chromium webkit
yarn test:e2e
```

Use `yarn format` for the web source. Add behavioral tests for meaningful changes to data, media, or browser flows. Test PWA functionality against a production build, including offline reloads. Keep generated assets, caches, screenshots, and test reports out of commits.

Read [README.md](README.md) for serving/deployment and [docs/web-migration.md](docs/web-migration.md) for native feature mapping. Original native setup instructions are retained in `legacy/README.native.md`.
