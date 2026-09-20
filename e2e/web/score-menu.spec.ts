import { expect, test } from '@playwright/test'
import { checkScoreMenu } from './score-menu.checks.mjs'

test('score menu and secondary sheets stay visible and restore focus', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Native score menu is mobile-only')
  await page.goto('/tag/1')
  await checkScoreMenu(page, [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 480, height: 800 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
  ])
})

test('desktop tag information stays centered', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'Desktop layout')
  await page.goto('/tag/1')
  await page.getByRole('button', { name: 'Tag information', exact: true }).click()
  const box = await page.getByRole('dialog').boundingBox()
  const viewport = page.viewportSize()!
  expect(box).not.toBeNull()
  expect(Math.abs(box!.x + box!.width / 2 - viewport.width / 2)).toBeLessThan(1)
  expect(Math.abs(box!.y + box!.height / 2 - viewport.height / 2)).toBeLessThan(1)
})
