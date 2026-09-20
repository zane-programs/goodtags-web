# Deploying to Cloudflare

The app is one Cloudflare Worker: `dist/` as static assets plus the media bridge
(`worker/`). Nothing in the repository names an account, zone or hostname; those are
supplied by whoever deploys.

## How it fits together

| Piece | Owned by | Where |
| --- | --- | --- |
| The Worker: code, static assets, bindings, rate limit | Wrangler | `wrangler.jsonc`, `worker/`, `public/_headers` |
| The custom domain (DNS record + certificate) | OpenTofu/Terraform | `infra/` |
| The zone itself, its other records, zone-wide rules | Not this repository | — |

`wrangler deploy` only touches custom domains listed in its own config, and none are,
so code deploys never disturb what `infra/` attached. The zone usually serves more than
this app, so `infra/` only looks it up.

### Request flow and cost

- **Static assets** (`run_worker_first: ["/media"]`): every path except `/media` is
  served from Cloudflare's asset store without invoking the Worker. Those requests are
  free and unmetered. Unknown paths get the app shell (`single-page-application`).
  `/assets/*` is content-hashed and immutable; everything else revalidates by ETag, so
  `sw.js`, the shell and the catalog update promptly.
- **`/media`** is the only thing that counts against the Workers Free quota (100,000
  requests/day, 10 ms CPU each). The bridge does almost no CPU work: it waits on I/O.
- The browser asks at most once per file: the service worker keeps media for 90 days,
  and responses carry `max-age=86400` for browsers without one.

### Edge cache

The Worker stores each complete upstream file in the data center's cache
(`caches.default`) for 30 days, under a key derived from the validated upstream URL.
Because people singing together are served by the same data center, the first person
to open a tag warms it for everyone else; they get `X-Goodtags-Cache: HIT` and the
content host is not contacted. The Cache API is free and has no request charge, but it
is per data center and evicts cold entries, so it is an accelerator, not storage.

Details that are easy to break:

- Files are stored whole, with an explicit `Content-Length`, and ranges are answered
  from the stored copy (by the edge when it can, otherwise sliced in the Worker). The
  content host ignores `Range` on its download endpoint, and Safari refuses audio that
  is not served as `206`. `cache.put` rejects `206`, so partial responses are never
  stored.
- Upstream `Set-Cookie` and `Content-Disposition` are dropped before storing; a
  response with `Set-Cookie` would not be cached at all.
- `404` is remembered for 10 minutes; other upstream failures are never cached.
- Files over 40 MB are refused rather than buffered (Workers have 128 MB of memory).
- Simultaneous first requests for the same file each go upstream. Collapsing them
  would need a Durable Object, which is not worth it for files this small.
- The Cache API is only documented to work on a custom domain. On `*.workers.dev`
  treat the edge cache as absent; the app still works, every miss just goes upstream.

### Abuse limits

The bridge can only reach the content host, only by `GET`/`HEAD`, and refuses requests
that browsers mark `Sec-Fetch-Site: cross-site`, so other sites cannot embed it. A
[rate limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
allows 60 media requests per client per 10 seconds per location, which is far above
real use and exists so one client cannot drain the daily quota. It is scoped to this
Worker; no zone-level WAF rules are created. On the Free plan the failure mode of
exceeding the daily quota is that `/media` returns errors until 00:00 UTC while the
rest of the app, being static, keeps working.

## First deployment

You need a Cloudflare account, a zone already active in it (for example
`example.com`), Node 22+, and [OpenTofu](https://opentofu.org) or Terraform ≥ 1.6
(substitute `terraform` for `tofu` below).

1. **Create an API token.** Dashboard → My Profile → API Tokens → Create Token →
   *Edit Cloudflare Workers* template. Under *Account Resources* pick your account and
   under *Zone Resources* pick the one zone. Export it together with the account ID
   (`yarn wrangler whoami`, or the Workers & Pages overview):

   ```sh
   export CLOUDFLARE_API_TOKEN=…
   export CLOUDFLARE_ACCOUNT_ID=…
   ```

2. **Upload the app.** The first deploy creates the Worker.

   ```sh
   yarn install --immutable
   yarn deploy            # yarn build && wrangler deploy
   ```

   It is now live at `goodtags-web.<your-subdomain>.workers.dev`, without an edge
   cache.

3. **Attach the hostname.** This has to come second: Cloudflare refuses to attach a
   custom domain to a Worker that has no deployment (error 100124).

   ```sh
   cp infra/terraform.tfvars.example infra/terraform.tfvars   # gitignored; fill it in
   tofu -chdir=infra init
   tofu -chdir=infra apply
   ```

   This creates a proxied DNS record for the hostname and its certificate. The
   hostname must not already have a DNS record.

4. **Check it.** A score or track requested twice should go `MISS` then `HIT`:

   ```sh
   curl -sI "https://goodtags.example.com/media?url=https%3A%2F%2Fwww.barbershoptags.com%2Ftags%2FSmile.gif" | grep -i x-goodtags-cache
   ```

   Then open the site, play a learning track in Safari (range requests), install it,
   and reload it offline.

Once the custom domain works you can set `"workers_dev": false` in `wrangler.jsonc`
so the app has a single origin. That matters for a PWA: storage, installation and
the service worker are per origin, so people should only ever meet one.

To try it without a domain, stop after step 2.

### State

`infra/` uses local state (`infra/terraform.tfstate`, gitignored). It holds no secrets
but is the record of what the stack owns, so keep it, or configure a
[remote backend](https://opentofu.org/docs/language/settings/backends/configuration/)
in a `backend.tf` of your own. If it is lost, `tofu import` the custom domain rather than
re-applying.

## Continuous deployment

`.github/workflows/test.yml` deploys after lint, unit, build and browser tests pass on
`main`, but only when the repository opts in, so forks stay green without credentials:

- Settings → Secrets and variables → Actions → **Secrets**: `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`.
- Same page → **Variables**: `CLOUDFLARE_DEPLOY` = `true`.

CI never runs `tofu apply`; it only validates `infra/`. Infrastructure changes are
rare and are applied by hand from a machine that has the state.

## Operating it

- **Logs:** `yarn wrangler tail`, or Workers & Pages → goodtags-web → Logs.
  Bridge failures are logged as `media bridge failed <url> <error>`.
- **Usage:** the same page shows requests against the daily quota. Only `/media`
  counts.
- **Roll back:** `yarn wrangler rollback`, or Deployments in the dashboard.
- **Purge a bad cached file:** Caching → Configuration → Custom Purge by URL with the
  exact `/media?url=…` URL the app requested, or wait out the TTL.
- **Tear down:** `tofu -chdir=infra destroy`, then `yarn wrangler delete`, then delete
  the leftover certificate if the dashboard still lists one.

## Local equivalents

`yarn start` serves the production build on workerd through `wrangler dev`
(`scripts/serve.mjs`), including a local edge cache, asset routing and `_headers`; the
browser tests run against it. `yarn dev`/`yarn preview` mount the same
`handleMedia` function in Vite without a cache. Call `fetch` unbound inside Worker
code: workerd throws "Illegal invocation" for `deps.fetch(…)`, which Node does not.
