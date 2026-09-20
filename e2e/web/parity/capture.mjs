// Captures the web app in the same states as the native Maestro screenshot tour
// (e2e/maestro/screenshots.yaml), at iPhone 17 size with its safe areas simulated, so the
// two sets can be compared side by side. Usage: node e2e/web/parity/capture.mjs <outDir> [baseUrl]
import { webkit } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const out = process.argv[2] || 'artifacts/parity-web'
const base = process.argv[3] || 'http://localhost:5173'
mkdirSync(out, { recursive: true })

const browser = await webkit.launch()
const context = await browser.newContext({
  viewport: { width: 402, height: 874 },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
})
const page = await context.newPage()
page.on('pageerror', error => console.error('pageerror:', error.message))
await page.addInitScript(() => {
  const apply = () => document.documentElement?.setAttribute('style', '--sat:62px;--sab:34px')
  apply()
  document.addEventListener('DOMContentLoaded', apply)
})
const shot = async name => {
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log('captured', name)
}
const row = name => page.locator('[data-slot="item"]:visible', { hasText: new RegExp(`^${name}$`) }).click()
const tap = async (role, name) => page.getByRole(role, { name, exact: true }).first().click()

await page.goto(base)
await page.evaluate(() => localStorage.clear())
await page.reload()
await shot('01-welcome-screen')
await tap('button', 'enter goodtags')
await shot('02-home-screen')

await row('labels')
await shot('03-labels-01-main')
await tap('button', 'new')
await page.getByLabel('label').fill('low')
await shot('03-labels-03-create-low')
await page.keyboard.press('Enter')
await tap('button', 'new')
await page.getByLabel('label').fill('first')
await page.keyboard.press('Enter')
await tap('button', 'edit')
await tap('button', 'rename low')
await page.getByLabel('label').fill('lower')
await shot('03-labels-05-rename')
await page.keyboard.press('Enter')
await tap('button', 'back')
await tap('button', 'back')

await row('popular')
await page.waitForSelector('[data-tag-id]')
await shot('04-popular-01-main')
await tap('button', 'menu')
await shot('x1-list-menu')
await page.mouse.click(60, 700)
await page.locator('[data-tag-id]').first().click()
await page.waitForSelector('[data-loaded="true"], img', { timeout: 30000 }).catch(() => {})
await shot('08-sheet-music-02-main')
await tap('button', 'menu')
await shot('08-sheet-music-04-menu')
await tap('button', 'tag info')
await shot('08-sheet-music-05-tag-info')
await page.mouse.click(200, 90)
await page.waitForTimeout(600)
await tap('button', 'menu')
await tap('button', 'tracks')
await shot('08-sheet-music-09-tracks')
await page.mouse.click(200, 90)
await page.waitForTimeout(600)
await tap('button', 'menu')
await tap('button', 'labels')
await shot('08-sheet-music-08-labels-popular')
await tap('button', 'back')
await tap('button', 'back')
await tap('button', 'back')

await page.getByLabel('tab_search').click()
await shot('10-search-01-form')
await page.getByRole('searchbox').fill('moonlight')
await page.keyboard.press('Enter')
await page.waitForSelector('[data-tag-id]')
await shot('10-search-02-results')

await page.getByLabel('tab_faves').click()
await shot('x2-faves')
await page.getByLabel('tab_history').click()
await shot('x5-history')
await page.getByLabel('tab_home').click()
await row('options')
await shot('11-options-01-main')
await tap('button', 'back')
await row('data')
await shot('12-backup-01-data')
await tap('button', 'back')
await row('about')
await shot('x6-about')
await browser.close()
