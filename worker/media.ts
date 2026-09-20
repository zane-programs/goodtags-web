// Same-origin bridge for scores and learning tracks. Never forwards client credentials.
// Written against web-standard Request/Response so the Worker, the Vite dev server and
// the unit tests all run this exact code.
const allowedHosts = new Set(['www.barbershoptags.com', 'barbershoptags.com'])
const REDIRECTS = [301, 302, 303, 307, 308]
const MEDIA_TYPES = /^(image\/|audio\/|application\/pdf|application\/octet-stream)/i
// Complete files are buffered so they can be cached and sliced for range requests.
// Catalog media is a few MB at most; anything near this is not a score or a track.
export const MAX_BYTES = 40 * 1024 * 1024
// Tag files essentially never change, so the edge keeps them far longer than browsers
// are told to. The service worker holds its own copy for 90 days on top of this.
const EDGE_TTL = 60 * 60 * 24 * 30
const BROWSER_TTL = 60 * 60 * 24
const MISSING_TTL = 60 * 10

export interface MediaCache {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<void>
}
export interface MediaDeps {
  fetch: typeof fetch
  /** Edge cache. Optional: local development simply goes upstream every time. */
  cache?: MediaCache
  waitUntil?: (promise: Promise<unknown>) => void
}

export function allowedMediaUrl(value: unknown): URL | null {
  try {
    const url = new URL(value as string)
    return url.protocol === 'https:' &&
      allowedHosts.has(url.hostname) &&
      !url.port &&
      !url.username &&
      !url.password
      ? url
      : null
  } catch {
    return null
  }
}

/** A single satisfiable byte range, 'invalid' (416), or undefined to send everything. */
export function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | 'invalid' | undefined {
  const match = header && /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (!match[1] && !match[2])) return undefined
  let start: number
  let end: number
  if (!match[1]) {
    const suffix = Number(match[2])
    if (!suffix) return 'invalid'
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  }
  return start >= size || start > end ? 'invalid' : { start, end }
}

function plain(status: number, message: string, headers: Record<string, string> = {}) {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

function clientHeaders(source: Headers, state: string) {
  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Cache-Control': `public, max-age=${BROWSER_TTL}`,
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Goodtags-Cache': state,
  })
  for (const name of ['content-type', 'content-length', 'content-range', 'last-modified']) {
    const value = source.get(name)
    if (value) headers.set(name, value)
  }
  return headers
}

function respond(request: Request, body: BodyInit | null, status: number, headers: Headers) {
  return new Response(request.method === 'HEAD' ? null : body, { status, headers })
}

function sliced(request: Request, bytes: ArrayBuffer, source: Headers, state: string) {
  const headers = clientHeaders(source, state)
  const range = parseRange(request.headers.get('range'), bytes.byteLength)
  if (range === 'invalid') {
    return plain(416, 'Range not satisfiable', { 'Content-Range': `bytes */${bytes.byteLength}` })
  }
  if (!range) {
    headers.set('Content-Length', String(bytes.byteLength))
    return respond(request, bytes, 200, headers)
  }
  const length = range.end - range.start + 1
  headers.set('Content-Length', String(length))
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${bytes.byteLength}`)
  return respond(request, new Uint8Array(bytes, range.start, length), 206, headers)
}

async function fetchUpstream(start: URL, deps: MediaDeps) {
  // Called unbound: workerd rejects fetch invoked as a method of another object.
  const { fetch } = deps
  let url = start
  for (let hops = 0; hops < 5; hops++) {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(30000),
      headers: { 'User-Agent': 'goodtags-web/4.3' },
    })
    if (!REDIRECTS.includes(response.status)) return response
    const next = allowedMediaUrl(new URL(response.headers.get('location') || '', url).href)
    await response.body?.cancel()
    if (!next) throw new Error('Unsupported redirect')
    url = next
  }
  throw new Error('Too many redirects')
}

async function readCapped(response: Response): Promise<ArrayBuffer | null> {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) {
    await response.body?.cancel()
    return null
  }
  const reader = response.body?.getReader()
  if (!reader) return new ArrayBuffer(0)
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BYTES) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes.buffer
}

export async function handleMedia(request: Request, deps: MediaDeps): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return plain(405, 'Method not allowed', { Allow: 'GET, HEAD' })
  }
  // The app only ever asks from its own origin; other sites may not embed the bridge.
  if (request.headers.get('sec-fetch-site') === 'cross-site') return plain(403, 'Forbidden')
  const here = new URL(request.url)
  const upstream = allowedMediaUrl(here.searchParams.get('url'))
  if (!upstream) return plain(400, 'Unsupported media URL')
  upstream.hash = ''

  // One entry per upstream file regardless of how the query string was spelled.
  const key = `${here.origin}/media?url=${encodeURIComponent(upstream.href)}`
  const range = request.headers.get('range')
  try {
    const hit = await deps.cache?.match(
      new Request(key, { headers: range ? { Range: range } : {} }),
    )
    if (hit?.status === 404) return plain(404, 'Media is unavailable')
    if (hit?.status === 416) {
      return plain(416, 'Range not satisfiable', {
        'Content-Range': hit.headers.get('content-range') || 'bytes */*',
      })
    }
    // The edge answers ranges itself when it can; otherwise slice the stored file here.
    if (hit?.status === 206 || (hit && !range)) {
      return respond(request, hit.body, hit.status, clientHeaders(hit.headers, 'HIT'))
    }
    if (hit) return sliced(request, await hit.arrayBuffer(), hit.headers, 'HIT')

    const response = await fetchUpstream(upstream, deps)
    if (!response.ok) {
      await response.body?.cancel()
      if (response.status !== 404) return plain(502, 'Media is unavailable')
      // Remember missing files briefly so a broken catalog row cannot hammer upstream.
      const missing = new Response(null, {
        status: 404,
        headers: { 'Cache-Control': `public, max-age=${MISSING_TTL}` },
      })
      const stored = deps.cache?.put(new Request(key), missing)
      if (stored) deps.waitUntil?.(stored.catch(() => {}))
      return plain(404, 'Media is unavailable')
    }
    const contentType = response.headers.get('content-type') || ''
    if (!MEDIA_TYPES.test(contentType)) {
      await response.body?.cancel()
      return plain(415, 'Unsupported media type')
    }
    const bytes = await readCapped(response)
    if (!bytes) return plain(502, 'Media is too large')

    // Stored without upstream cookies or disposition, and with an explicit length so
    // the edge can serve later range requests (Safari requires them for audio).
    const stored = new Headers({
      'Content-Type': contentType,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': `public, max-age=${EDGE_TTL}`,
    })
    const modified = response.headers.get('last-modified')
    if (modified) stored.set('Last-Modified', modified)
    const put = deps.cache?.put(new Request(key), new Response(bytes, { headers: stored }))
    if (put) deps.waitUntil?.(put.catch(() => {}))
    return sliced(request, bytes, stored, 'MISS')
  } catch (error) {
    console.error('media bridge failed', upstream.href, error)
    return plain(502, 'Unable to load media. Please try again.')
  }
}
