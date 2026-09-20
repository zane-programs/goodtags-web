// Same-origin bridge for scores and learning tracks. Never forwards client credentials.
const allowedHosts = new Set(['www.barbershoptags.com', 'barbershoptags.com'])
export function allowedMediaUrl(value) {
  try {
    const url = new URL(value)
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
export async function mediaHandler(req, res) {
  const input = new URL(req.url, 'http://localhost').searchParams.get('url')
  let url = allowedMediaUrl(input)
  if (!url) {
    res.writeHead(400)
    res.end('Unsupported media URL')
    return
  }
  try {
    let response
    for (let hops = 0; hops < 5; hops++) {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(30000),
        headers: {
          'User-Agent': 'goodtags-web/4.3',
          ...(req.headers.range ? { Range: req.headers.range } : {}),
        },
      })
      if (![301, 302, 303, 307, 308].includes(response.status)) break
      const next = allowedMediaUrl(new URL(response.headers.get('location') || '', url).href)
      await response.body?.cancel()
      if (!next) throw new Error('Unsupported redirect')
      url = next
    }
    if (!response?.ok) {
      res.writeHead(response?.status === 404 ? 404 : 502)
      res.end('Media is unavailable')
      return
    }
    const contentType = response.headers.get('content-type') || ''
    if (!/^(image\/|audio\/|application\/pdf|application\/octet-stream)/i.test(contentType)) {
      await response.body?.cancel()
      res.writeHead(415)
      res.end('Unsupported media type')
      return
    }
    res.statusCode = response.status
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    // fetch transparently decodes compressed bodies; forward lengths only when unchanged.
    if (!response.headers.get('content-encoding') && response.headers.get('content-length')) {
      res.setHeader('Content-Length', response.headers.get('content-length'))
    }
    for (const name of ['content-type', 'content-range', 'accept-ranges']) {
      const value = response.headers.get(name)
      if (value) res.setHeader(name, value)
    }
    const { Readable } = await import('node:stream')
    const stream = Readable.fromWeb(response.body)
    res.on('close', () => stream.destroy())
    stream.on('error', () => res.destroy())
    stream.pipe(res)
  } catch {
    if (!res.headersSent) res.writeHead(502)
    res.end('Unable to load media. Please try again.')
  }
}
