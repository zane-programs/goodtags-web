import { expect, test } from '@playwright/test'
import { fork } from 'node:child_process'
import { once } from 'node:events'

test('home, catalog search, filters, sorting and responsive layout', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter goodtags' }).click()
  await expect(
    page.getByRole('main').getByRole('link', { name: 'popular', exact: true }),
  ).toBeVisible()
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-home.png`, fullPage: true })
  await page.getByRole('main').getByRole('link', { name: 'popular', exact: true }).click()
  await expect(page.locator('.tag-row')).toHaveCount(50)
  await page.goto('/search?q=smile')
  await expect(page.locator('.tag-row').first()).toBeVisible()
  await page.getByRole('button', { name: 'Search filters' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('combobox').first().selectOption('classic')
  await dialog.getByRole('switch').first().check()
  await dialog.getByRole('button', { name: 'show tags' }).click()
  await expect(page.locator('.filter-chips')).toContainText('classic')
  await page.getByRole('combobox', { name: 'Sort tags' }).selectOption('id')
  await expect(page.locator('.tag-row').first()).toContainText('#1')
  await page.locator('.tag-row').first().click()
  await expect(page.getByRole('region', { name: 'Smile', exact: true })).toBeVisible()
  await expect
    .poll(() =>
      page
        .getByRole('img', { name: 'Sheet music for Smile' })
        .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true)
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-score.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (testInfo.project.name.startsWith('mobile'))
    await expect(page.locator('.browse-list')).toBeHidden()
  else await expect(page.locator('.browse-list')).toBeVisible()
  expect(errors).toEqual([])
})

test('favorites, independent labels, backup restore, and persistence', async ({ page }) => {
  await page.goto('/tag/1')
  await page.getByRole('button', { name: 'Add favorite', exact: true }).click()
  if (await page.getByRole('button', { name: 'Tag menu', exact: true }).isVisible())
    await page.getByRole('button', { name: 'Tag menu', exact: true }).click()
  await page.getByRole('button', { name: 'Tag labels', exact: true }).click()
  await page.getByRole('textbox', { name: 'New label' }).fill('Quartet rehearsal')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('switch')).toBeChecked()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await page.getByRole('button', { name: 'Remove favorite', exact: true }).click()
  await page.goto('/labels/Quartet%20rehearsal')
  await expect(page.locator('.tag-row')).toContainText('Smile')
  await page.goto('/favorites')
  await expect(page.getByText('no faves yet')).toBeVisible()
  await page.goto('/data')
  await page.getByLabel('Restore backup file').setInputFiles({
    name: 'native-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        favorites: [{ id: 2, title: 'Native favorite' }],
        labels: [{ label: 'Imported', tags: [{ id: 3 }] }],
        date: '2026-01-01',
      }),
    ),
  })
  await expect(page.getByText('Restored 1 favorites and 2 labels')).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'backup', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^faves-labels-.*\.json$/)
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream!) chunks.push(chunk)
  const backup = JSON.parse(Buffer.concat(chunks).toString())
  expect(backup.favorites.map((f: { id: number }) => f.id)).toEqual([2])
  expect(backup.labels.map((l: { label: string }) => l.label)).toEqual([
    'Quartet rehearsal',
    'Imported',
  ])
  await page.goto('/favorites')
  await page.reload()
  await expect(page.locator('.tag-row')).toHaveCount(1)
  await page.goto('/history')
  await expect(page.locator('.tag-row')).toContainText('Smile')
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
      ? fork('server/index.mjs', { env: { ...process.env, PORT: '0' }, silent: true })
      : undefined
  let origin = 'http://localhost:4173'
  if (isolated) {
    const [ready] = await once(isolated, 'message')
    origin = `http://localhost:${ready.port}`
  }
  try {
    await page.goto(`${origin}/search?q=love`)
    await expect(page.locator('.tag-row').first()).toBeVisible()
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
    await expect(page.locator('.tag-row').first()).toBeVisible()
    await page.getByRole('textbox', { name: 'Search tags' }).fill('1')
    await page.locator('form').getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.locator('.tag-row').filter({ hasText: '#1' }).first()).toBeVisible()
    await page.goto(`${origin}/options`)
    await page.getByRole('switch').first().uncheck()
    await page.reload()
    await expect(page.getByRole('switch').first()).not.toBeChecked()
    await expect(page.locator('html')).toHaveAttribute('data-font', 'sans')
  } finally {
    isolated?.kill()
  }
})

test('label rename, reorder and deletion preserve favorites', async ({ page }) => {
  await page.goto('/labels')
  for (const name of ['First', 'Second']) {
    await page.getByRole('button', { name: 'create label', exact: true }).click()
    await page.getByRole('textbox', { name: 'Label name' }).fill(name)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Move First up', exact: true }).click()
  await expect(page.locator('.label-row').first()).toContainText('First')
  await page.getByRole('button', { name: 'Rename First', exact: true }).click()
  await page.getByRole('textbox', { name: 'Label name' }).fill('Renamed')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.locator('.label-row').first()).toContainText('Renamed')
  await page.getByRole('button', { name: 'Delete Renamed', exact: true }).click()
  await page.getByRole('button', { name: 'Remove', exact: true }).click()
  await expect(page.locator('.label-row')).toHaveCount(1)
})
