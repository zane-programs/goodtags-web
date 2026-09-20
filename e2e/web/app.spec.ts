import { test, expect, type Page } from '@playwright/test'
import { fork } from 'node:child_process'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'

// Screens beneath the focused one stay mounted (as native stack screens do) and are marked
// `inert`. During the half-second fade both are on screen, so locators target only content a
// person could actually interact with.
const live = (page: Page) => page.locator(':not([inert] *)')
const rows = (page: Page) => page.locator('[data-tag-id]').and(live(page))
const homeRow = (page: Page, name: string) =>
  page.locator('[data-slot="item"]', { hasText: new RegExp(`^${name}$`) }).and(live(page))
const tab = (page: Page, label: string) =>
  page.locator('nav[aria-label="tabs"]:visible a', { hasText: new RegExp(`^${label}$`) })
const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', { name, exact: true }).and(live(page)).first()

async function enter(page: Page, path = '/') {
  await page.goto(path)
  const arrow = page.getByRole('button', { name: 'enter goodtags' })
  if (await arrow.isVisible().catch(() => false)) await arrow.click()
}

test('welcome, home, a collection, and stepping through tags like the native stack', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByText('Welcome to')).toBeVisible()
  await button(page, 'enter goodtags').click()
  await expect(homeRow(page, 'popular')).toBeVisible()

  await homeRow(page, 'popular').click()
  await expect(page).toHaveURL(/\/popular$/)
  await expect(rows(page)).toHaveCount(50)
  const second = await rows(page).nth(1).getAttribute('data-tag-id')

  await rows(page).first().click()
  await expect(page).toHaveURL(/\/popular\/tag\/\d+$/)
  await expect(button(page, 'previous tag')).toBeDisabled()
  await button(page, 'next tag').click()
  await expect(page).toHaveURL(new RegExp(`/popular/tag/${second}$`))

  // Going back reveals the same list instance, with the last-viewed row marked.
  await button(page, 'back').click()
  await expect(page).toHaveURL(/\/popular$/)
  await expect(page.locator(`[data-tag-id="${second}"]`)).toHaveAttribute('aria-current', 'true')

  // The browser's own back and forward walk the same stack.
  await page.goBack()
  await expect(homeRow(page, 'popular')).toBeVisible()
  await page.goForward()
  await expect(rows(page)).toHaveCount(50)
})

test('controls dim after four seconds and wake on a tap of the sheet', async ({ page }) => {
  await enter(page, '/popular')
  await rows(page).first().click()
  const play = button(page, /^(play|pause)$/)
  await expect(play).toHaveAttribute('data-dim', 'false')
  await expect(play).toHaveAttribute('data-dim', 'true', { timeout: 6000 })
  await page.getByTestId('sheet-music').click({ position: { x: 40, y: 200 } })
  await expect(play).toHaveAttribute('data-dim', 'false')
})

test('tag menu, info and tracks sheets, labels and videos', async ({ page }) => {
  await enter(page, '/popular')
  await rows(page).first().click()
  await button(page, 'menu').click()
  const menu = page.getByRole('dialog', { name: 'tag menu' })
  await expect(menu.getByRole('button')).toHaveText([/tag info/, /labels/, /tracks/, /videos/])

  await menu.getByRole('button', { name: 'tag info' }).click()
  const info = page.getByRole('dialog', { name: 'tag info' })
  await expect(info.getByText('arranger:')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(info).toBeHidden()

  await button(page, 'menu').click()
  await menu.getByRole('button', { name: 'tracks' }).click()
  const tracks = page.getByRole('dialog', { name: 'tracks' })
  await expect(tracks.getByRole('radio', { name: /All Parts/ })).toBeChecked()
  await page.keyboard.press('Escape')

  await button(page, 'menu').click()
  await menu.getByRole('button', { name: 'labels' }).click()
  await expect(page).toHaveURL(/\/tag\/\d+\/labels$/)
  await button(page, 'new label').click()
  await page.getByRole('textbox', { name: 'label' }).fill('contest')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('checkbox').and(live(page))).toBeChecked()
  await button(page, 'back').click()
  await expect(button(page, 'menu')).toBeVisible()
})

test('search dialog, filters, sorting, and tabs that keep their state', async ({ page }) => {
  await enter(page)
  await tab(page, 'search').click()
  const dialog = page.getByRole('dialog', { name: 'search for tags' })
  await expect(dialog.getByRole('searchbox')).toBeFocused()
  await dialog.getByRole('searchbox').fill('moonlight')
  await dialog.getByRole('radio', { name: 'classic' }).click()
  await dialog.getByRole('button', { name: 'search' }).click()
  await expect(dialog).toBeHidden()
  await expect(rows(page).first()).toBeVisible()
  await expect(
    page.locator('main, div').getByText('classic', { exact: true }).and(live(page)).last(),
  ).toBeVisible()
  const byDownloads = await rows(page).first().getAttribute('data-tag-id')

  await button(page, 'menu').click()
  await page.getByRole('button', { name: 'sort alphabetically' }).click()
  await expect(rows(page).first()).not.toHaveAttribute('data-tag-id', byDownloads!)

  await tab(page, 'history').click()
  await expect(page.getByText('tags you have viewed will show up here')).toBeVisible()
  await tab(page, 'search').click()
  await expect(button(page, /moonlight/)).toBeVisible()
  await expect(rows(page).first()).toBeVisible()

  await button(page, 'new search').click()
  await expect(dialog.getByRole('searchbox')).toHaveValue('')
})

test('favorites, labels, backup and restore persist', async ({ page }) => {
  await enter(page, '/popular')
  await rows(page).first().click()
  await button(page, 'add favorite').click()
  await expect(button(page, 'remove favorite')).toBeVisible()
  await button(page, 'back').click()
  await tab(page, 'faves').click()
  await expect(rows(page)).toHaveCount(1)

  // The home tab comes back where it was left; pressing it again pops to its first screen.
  await tab(page, 'home').click()
  await expect(rows(page)).toHaveCount(50)
  await tab(page, 'home').click()
  await homeRow(page, 'data').click()
  const download = page.waitForEvent('download')
  await homeRow(page, 'backup').click()
  const file = await (await download).path()
  await expect(page.getByRole('status')).toContainText('exported 1 favorite and 0 labels')
  const backup = JSON.parse(await readFile(file, 'utf8'))
  expect(backup.favorites).toHaveLength(1)

  await page.evaluate(() => localStorage.clear())
  await enter(page, '/data')
  await page.getByLabel('restore backup file').setInputFiles(file)
  await expect(page.getByRole('status')).toContainText('imported 1 favorite and 0 labels')
  await page.reload()
  await tab(page, 'faves').click()
  await expect(rows(page)).toHaveCount(1)

  await button(page, 'menu').click()
  await page.getByRole('button', { name: 'remove all favorites' }).click()
  await page
    .getByRole('dialog', { name: 'remove all favorites' })
    .getByRole('button', { name: 'remove all favorites' })
    .click()
  await expect(page.getByText('to add favorites,')).toBeVisible()
})

test('labels: create, rename, reorder, delete', async ({ page }) => {
  await enter(page, '/labels')
  await expect(page.getByText('no labels yet')).toBeVisible()
  for (const name of ['first', 'second']) {
    await button(page, 'new').click()
    await page.getByRole('textbox', { name: 'label' }).fill(name)
    await page.keyboard.press('Enter')
    await expect(homeRow(page, name)).toBeVisible()
  }
  await button(page, 'new').click()
  await page.getByRole('textbox', { name: 'label' }).fill('first')
  await expect(page.getByRole('alert')).toHaveText('label already exists')
  await button(page, 'cancel').click()

  await button(page, 'edit').click()
  await button(page, 'rename first').click()
  await page.getByRole('textbox', { name: 'label' }).fill('warmups')
  await page.keyboard.press('Enter')
  await expect(button(page, 'rename warmups')).toBeVisible()

  const handle = button(page, 'reorder warmups')
  await handle.focus()
  // dnd-kit measures between key presses, so give each step a frame to land.
  for (const key of ['Space', 'ArrowUp', 'Space']) {
    await page.keyboard.press(key)
    await page.waitForTimeout(150)
  }
  const order = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem('goodtags.library.v1')!).labels.map(
        (l: { name: string }) => l.name,
      ),
    )
  expect(await order()).toEqual(['warmups', 'second'])

  await button(page, 'rename second').click()
  await button(page, 'delete second').click()
  await page
    .getByRole('dialog', { name: 'delete label' })
    .getByRole('button', { name: 'delete label' })
    .click()
  expect(await order()).toEqual(['warmups'])
})

test('options persist and switch the whole app font', async ({ page }) => {
  await enter(page, '/options')
  const serif = page.getByRole('checkbox').first()
  await expect(serif).toBeChecked()
  await page.getByText('use serif fonts').click()
  await expect(page.locator('html')).toHaveAttribute('data-font', 'sans')
  await page.reload()
  await expect(page.getByRole('checkbox').first()).not.toBeChecked()
})

test('a deep link rebuilds the stack beneath it', async ({ page }) => {
  await enter(page, '/popular/tag/1809')
  await expect(button(page, 'menu')).toBeVisible()
  await button(page, 'back').click()
  await expect(page).toHaveURL(/\/popular$/)
  await expect(rows(page)).toHaveCount(50)
  await button(page, 'back').click()
  await expect(homeRow(page, 'popular')).toBeVisible()
})

test('links decorated with tracking queries open the page they point at', async ({ page }) => {
  await enter(page, '/?fbclid=IwAR0abc')
  await expect(homeRow(page, 'popular')).toBeVisible()
  await expect(page.getByText('page not found')).toHaveCount(0)
  await enter(page, '/popular/tag/1809/?utm_source=share&fbclid=x')
  await expect(button(page, 'menu')).toBeVisible()
  await button(page, 'back').click()
  await expect(rows(page)).toHaveCount(50)
})

test('nothing scrolls the page sideways at any supported width', async ({ page }) => {
  await enter(page, '/popular')
  await expect(rows(page).first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('PWA manifest, offline catalog and direct-route reload', async ({
  page,
  context,
  browserName,
}) => {
  // WebKit's setOffline emulation blocks SW responses too. Stop an isolated origin
  // instead, proving real offline navigation without changing app behavior.
  const isolated =
    browserName === 'webkit'
      ? fork('scripts/serve.mjs', { env: { ...process.env, PORT: '0' }, silent: true })
      : undefined
  let origin = 'http://localhost:4173'
  if (isolated) {
    const [ready] = await once(isolated, 'message')
    origin = `http://localhost:${ready.port}`
  }
  try {
    await enter(page, `${origin}/classic`)
    await expect(rows(page).first()).toBeVisible()
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true)
    const manifest = await page.evaluate(async () =>
      fetch('/manifest.webmanifest').then(r => r.json()),
    )
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toContain('512x512')
    if (isolated) {
      isolated.kill()
      await once(isolated, 'exit')
    } else await context.setOffline(true)
    await page.reload()
    await expect(rows(page)).toHaveCount(125)
  } finally {
    isolated?.kill()
  }
})
