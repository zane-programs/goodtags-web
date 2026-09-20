import { handleMedia } from './media'

interface Env {
  ASSETS: Fetcher
  MEDIA_LIMITER?: RateLimit
}

// Static assets are served by Cloudflare without running this Worker at all
// (see run_worker_first in wrangler.jsonc); only the media bridge costs an invocation.
export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname !== '/media') return env.ASSETS.fetch(request)
    const client = request.headers.get('cf-connecting-ip')
    if (client && env.MEDIA_LIMITER) {
      const { success } = await env.MEDIA_LIMITER.limit({ key: client })
      if (!success) {
        return new Response('Too many requests', { status: 429, headers: { 'Retry-After': '10' } })
      }
    }
    return handleMedia(request, {
      fetch,
      cache: caches.default,
      waitUntil: promise => ctx.waitUntil(promise),
    })
  },
} satisfies ExportedHandler<Env>
