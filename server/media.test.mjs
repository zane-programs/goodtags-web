// @vitest-environment node
import { expect, it } from 'vitest'
import { allowedMediaUrl } from './media.mjs'
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
