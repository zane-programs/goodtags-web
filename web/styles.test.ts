import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname)
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

// The web app is styled with Tailwind utilities only. styles.css may declare tokens
// (@theme), fonts, variants and the one font-swap rule; it must not grow component CSS.
describe('styling stays in Tailwind', () => {
  it('has a single stylesheet', () => {
    expect(files(root).filter(file => file.endsWith('.css'))).toEqual([join(root, 'styles.css')])
  })

  it('declares tokens, not component rules', () => {
    const css = readFileSync(join(root, 'styles.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const outsideTheme = css.replace(/@theme\s*\{[\s\S]*?\n\}/, '')
    const selectors = [...outsideTheme.matchAll(/(^|\n)\s*([^@\s{}][^{}]*)\{/g)].map(m =>
      m[2].trim(),
    )
    expect(selectors).toEqual([":root[data-font='sans']"])
    expect(css).not.toMatch(/\.[a-z][\w-]*\s*[{,]/i)
  })

  it('never reaches for inline class-free styling hooks', () => {
    const offenders = files(root)
      .filter(file => /\.tsx$/.test(file))
      .filter(file => /import\s+['"][^'"]+\.css['"]/.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([join(root, 'main.tsx')])
  })
})
