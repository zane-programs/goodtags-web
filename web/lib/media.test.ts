import { describe, expect, it } from 'vitest'
import { mediaUrl, noteName, safeUrl } from './media'
describe('media URLs and pitch pipe', () => {
  it('bridges approved media and upgrades legacy HTTP links', () => {
    expect(mediaUrl('http://www.barbershoptags.com/tags/Smile.gif')).toBe(
      '/media?url=https%3A%2F%2Fwww.barbershoptags.com%2Ftags%2FSmile.gif',
    )
  })
  it('rejects script and malformed URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined()
    expect(mediaUrl('not a URL')).toBe('')
  })
  it.each([
    ['Major:F#', 'gflat'],
    ['Minor:Eb', 'eflat'],
    ['Major:Cb', 'bnatural'],
    ['Major:C', 'cnatural'],
    ['Major:B#', 'cnatural'],
  ])('plays %s as %s', (key, filename) => {
    expect(noteName(key)).toBe(filename)
  })
  it('disables unsupported keys', () => {
    expect(noteName('invalid')).toBeUndefined()
  })
})
