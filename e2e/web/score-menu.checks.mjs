// Shared by the Playwright runner and interactive Playwright MCP QA.
export async function checkScoreMenu(page, viewports) {
  const results = []
  const dialog = page.getByRole('dialog')
  const trigger = page.getByRole('button', { name: 'Tag menu', exact: true })
  async function inViewport(locator, name) {
    const box = await locator.boundingBox()
    const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
    if (
      !box ||
      box.x < -1 ||
      box.y < -1 ||
      box.x + box.width > viewport.width + 1 ||
      box.y + box.height > viewport.height + 1
    )
      throw new Error(`${name} outside viewport: ${JSON.stringify({ box, viewport })}`)
    return box
  }
  async function closed() {
    await dialog.waitFor({ state: 'hidden' })
    await page.waitForFunction(
      () => document.activeElement?.getAttribute('aria-label') === 'Tag menu',
    )
  }
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await trigger.click()
    await dialog.waitFor()
    const menu = await inViewport(dialog, 'Score action menu')
    const firstAction = await inViewport(
      dialog.getByRole('button', { name: 'Tag information', exact: true }),
      'First action',
    )
    if (firstAction.y > 120 || Math.abs(menu.x + menu.width - viewport.width) > 1)
      throw new Error('Score menu must open downward at the upper right')
    for (const action of await dialog.getByRole('button').all()) {
      await action.scrollIntoViewIfNeeded()
      await inViewport(action, (await action.getAttribute('aria-label')) || 'Close')
    }
    // Keyboard focus cannot escape the open modal.
    for (let n = 0; n < 9; n++) {
      await page.keyboard.press('Tab')
      if (!(await dialog.evaluate(el => el.contains(document.activeElement))))
        throw new Error('Focus escaped the score menu')
    }
    await page.keyboard.press('Escape')
    await closed()
    await trigger.click()
    // An unobscured part of the backdrop dismisses the action menu.
    await page
      .locator('[data-slot="dialog-overlay"]')
      .click({ position: { x: 2, y: viewport.height - 2 } })
    await closed()
    const sheets = []
    for (const name of ['Tag information', 'Tag labels', 'Choose learning track', 'Videos']) {
      await trigger.click()
      const action = dialog.getByRole('button', { name, exact: true })
      if (!(await action.count())) {
        await page.keyboard.press('Escape')
        await closed()
        continue
      }
      await action.click()
      await page.locator('.goodtags-dialog').waitFor()
      const box = await inViewport(dialog, name)
      if (viewport.width <= 480 && Math.abs(box.y + box.height - viewport.height) > 1)
        throw new Error(`${name} is not bottom-aligned on a phone`)
      sheets.push({ name, box })
      await dialog.getByRole('button', { name: 'Close', exact: true }).click()
      await closed()
    }
    if (!(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)))
      throw new Error('Score page overflows horizontally')
    results.push({ viewport, menu, sheets })
  }
  return results
}
