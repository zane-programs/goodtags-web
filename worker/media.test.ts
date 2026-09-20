// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { allowedMediaUrl, handleMedia, MAX_BYTES, parseRange, type MediaCache } from './media'

const TRACK = 'https://www.barbershoptags.com/tags/Smile-AllParts.mp3'
const bridge = (url: string, init?: RequestInit) =>
  new Request(`https://app.test/media?url=${encodeURIComponent(url)}`, init)
const bytes = (length: number) => Uint8Array.from({ length }, (_, index) => index % 251)

// Stores complete responses and, like the edge, never answers ranges itself here, so
// the handler's own slicing is what gets exercised.
function memoryCache() {
  const entries = new Map<string, Response>()
  const cache: MediaCache = {
    match: async request => entries.get(request.url)?.clone(),
    put: async (request, response) => void entries.set(request.url, response),
  }
  return { cache, entries }
}
function upstream(routes: Record<string, () => Response>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const route = routes[String(input)]
    if (!route) throw new Error(`unexpected upstream request: ${String(input)}`)
    return route()
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>
}

it('only accepts HTTPS media from the exact content host without credentials or ports', () => {
  expect(allowedMediaUrl('https://www.barbershoptags.com/tags/a.pdf')?.hostname).toBe(
    'www.barbershoptags.com',
  )
  for (const value of [
    'http://www.barbershoptags.com/a',
    'https://www.barbershoptags.com.attacker.test/a',
    'https://localhost/a',
    'file:///etc/passwd',
    'https://user:pass@www.barbershoptags.com/a',
    'https://www.barbershoptags.com:123/a',
    undefined,
  ])
    expect(allowedMediaUrl(value)).toBeNull()
})

it.each([
  ['bytes=0-1', { start: 0, end: 1 }],
  ['bytes=10-', { start: 10, end: 99 }],
  ['bytes=-10', { start: 90, end: 99 }],
  ['bytes=50-500', { start: 50, end: 99 }],
  ['bytes=100-', 'invalid'],
  ['bytes=5-2', 'invalid'],
  ['bytes=0-1,5-6', undefined],
  ['items=0-1', undefined],
  [null, undefined],
])('reads the range %s of a 100-byte file', (header, expected) => {
  expect(parseRange(header, 100)).toEqual(expected)
})

describe('media bridge', () => {
  it('rejects other methods, other sites and other hosts before going upstream', async () => {
    const fetch = upstream({})
    expect((await handleMedia(bridge(TRACK, { method: 'POST' }), { fetch })).status).toBe(405)
    expect(
      (await handleMedia(bridge(TRACK, { headers: { 'Sec-Fetch-Site': 'cross-site' } }), { fetch }))
        .status,
    ).toBe(403)
    expect((await handleMedia(bridge('https://attacker.test/a.mp3'), { fetch })).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fetches a file once, then serves everyone else and every range from the cache', async () => {
    const body = bytes(1000)
    const fetch = upstream({
      [TRACK]: () =>
        new Response(body, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'attachment',
            'Set-Cookie': 'PHPSESSID=1',
          },
        }),
    })
    const { cache, entries } = memoryCache()
    const pending: Promise<unknown>[] = []
    const deps = { fetch, cache, waitUntil: (promise: Promise<unknown>) => pending.push(promise) }

    // Safari opens audio with a two-byte probe and refuses a 200.
    const probe = await handleMedia(bridge(TRACK, { headers: { Range: 'bytes=0-1' } }), deps)
    expect(probe.status).toBe(206)
    expect(probe.headers.get('content-range')).toBe('bytes 0-1/1000')
    expect(probe.headers.get('x-goodtags-cache')).toBe('MISS')
    expect(new Uint8Array(await probe.arrayBuffer())).toEqual(body.slice(0, 2))
    await Promise.all(pending)

    const stored = [...entries.values()][0]
    expect(stored.headers.get('content-length')).toBe('1000')
    expect(stored.headers.get('set-cookie')).toBeNull()
    expect(stored.headers.get('content-disposition')).toBeNull()

    const full = await handleMedia(bridge(TRACK), deps)
    expect(full.status).toBe(200)
    expect(full.headers.get('x-goodtags-cache')).toBe('HIT')
    expect(new Uint8Array(await full.arrayBuffer())).toEqual(body)

    const tail = await handleMedia(bridge(TRACK, { headers: { Range: 'bytes=-100' } }), deps)
    expect(tail.headers.get('content-range')).toBe('bytes 900-999/1000')
    expect(new Uint8Array(await tail.arrayBuffer())).toEqual(body.slice(900))

    const beyond = await handleMedia(bridge(TRACK, { headers: { Range: 'bytes=5000-' } }), deps)
    expect(beyond.status).toBe(416)
    expect(beyond.headers.get('content-range')).toBe('bytes */1000')

    const head = await handleMedia(bridge(TRACK, { method: 'HEAD' }), deps)
    expect(head.headers.get('content-length')).toBe('1000')
    expect((await head.arrayBuffer()).byteLength).toBe(0)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('shares one cache entry between differently spelled requests for the same file', async () => {
    const fetch = upstream({
      [TRACK]: () => new Response(bytes(10), { headers: { 'Content-Type': 'audio/mpeg' } }),
    })
    const { cache } = memoryCache()
    await handleMedia(bridge(`${TRACK}#a`), { fetch, cache })
    await handleMedia(new Request(`https://app.test/media?x=1&url=${TRACK}`), { fetch, cache })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('follows redirects only within the content host and without client credentials', async () => {
    const start = 'https://www.barbershoptags.com/dbaction.php?id=1'
    const fetch = upstream({
      [start]: () => new Response(null, { status: 302, headers: { Location: 'tags/a.mp3' } }),
      'https://www.barbershoptags.com/tags/a.mp3': () =>
        new Response(bytes(4), { headers: { 'Content-Type': 'audio/mpeg' } }),
    })
    const request = bridge(start, { headers: { Cookie: 'session=1', Authorization: 'Bearer x' } })
    expect((await handleMedia(request, { fetch })).status).toBe(200)
    for (const [, init] of fetch.mock.calls) {
      expect(Object.keys(init.headers)).toEqual(['User-Agent'])
      expect(init.redirect).toBe('manual')
    }

    const escaping = upstream({
      [start]: () =>
        new Response(null, { status: 302, headers: { Location: 'https://attacker.test/a.mp3' } }),
    })
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await handleMedia(bridge(start), { fetch: escaping })).status).toBe(502)
    expect(logged).toHaveBeenCalledOnce()
    logged.mockRestore()
  })

  it('refuses unexpected types and oversized files, and caches nothing for them', async () => {
    const page = 'https://www.barbershoptags.com/'
    const huge = 'https://www.barbershoptags.com/tags/huge.mp3'
    const fetch = upstream({
      [page]: () => new Response('<html>', { headers: { 'Content-Type': 'text/html' } }),
      [huge]: () =>
        new Response('x', {
          headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(MAX_BYTES + 1) },
        }),
    })
    const { cache, entries } = memoryCache()
    expect((await handleMedia(bridge(page), { fetch, cache })).status).toBe(415)
    expect((await handleMedia(bridge(huge), { fetch, cache })).status).toBe(502)
    expect(entries.size).toBe(0)
  })

  it('remembers missing files briefly but never upstream failures', async () => {
    const missing = 'https://www.barbershoptags.com/tags/missing.gif'
    const broken = 'https://www.barbershoptags.com/tags/broken.gif'
    const fetch = upstream({
      [missing]: () => new Response(null, { status: 404 }),
      [broken]: () => new Response(null, { status: 500 }),
    })
    const { cache } = memoryCache()
    for (let attempt = 0; attempt < 2; attempt++) {
      expect((await handleMedia(bridge(missing), { fetch, cache })).status).toBe(404)
      expect((await handleMedia(bridge(broken), { fetch, cache })).status).toBe(502)
    }
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([missing, broken, broken])
  })
})
