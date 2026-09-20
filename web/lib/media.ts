export function safeUrl(value: string): string | undefined {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      url.protocol = 'https:'
      return url.href
    }
  } catch {
    /* invalid source */
  }
}
export function mediaUrl(value: string): string {
  const url = safeUrl(value)
  if (!url) return ''
  const parsed = new URL(url)
  return ['www.barbershoptags.com', 'barbershoptags.com'].includes(parsed.hostname)
    ? `/media?url=${encodeURIComponent(url)}`
    : url
}
export function noteName(key: string): string | undefined {
  const note = (key.split(':')[1] || key || 'F').replace('♭', 'b').replace('♯', '#').toLowerCase()
  const aliases: Record<string, string> = {
    'c#': 'dflat',
    'd#': 'eflat',
    'f#': 'gflat',
    'g#': 'aflat',
    'a#': 'bflat',
    cb: 'bnatural',
    'e#': 'fnatural',
    fb: 'enatural',
    'b#': 'cnatural',
  }
  if (aliases[note]) return aliases[note]
  if (/^[a-g]$/.test(note)) return `${note}natural`
  if (/^[abdeg]b$/.test(note)) return `${note[0]}flat`
}
export async function shareTag(id: number, title: string) {
  const url = `${location.origin}/tag/${id}`
  if (navigator.share) await navigator.share({ title, url })
  else {
    await navigator.clipboard.writeText(url)
    return 'Link copied'
  }
}
export function downloadFile(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
