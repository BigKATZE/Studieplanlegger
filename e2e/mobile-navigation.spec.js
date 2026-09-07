import { test, expect } from '@playwright/test'

for (const width of [320, 375, 767, 1280]) {
  test(`navigation scroll stays horizontal at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 })
    await page.goto('/')
    const nav = page.getByRole('navigation', { name: 'Sider' })
    await expect(nav).toBeVisible()
    await page.evaluate(() => document.fonts.ready)

    const layout = await nav.evaluate((element) => {
      element.scrollTop = 100
      element.scrollLeft = 100
      return {
        verticalRange: element.scrollHeight - element.clientHeight,
        scrollTop: element.scrollTop,
        scrollLeft: element.scrollLeft,
        buttonHeight: element.querySelector('button').getBoundingClientRect().height,
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    })
    expect(layout.pageOverflow).toBe(0)
    if (width < 768) {
      expect(layout.verticalRange).toBe(0)
      expect(layout.scrollTop).toBe(0)
      expect(layout.buttonHeight).toBeGreaterThanOrEqual(44)
    }
    if (width <= 375) expect(layout.scrollLeft).toBeGreaterThan(0)

    for (const name of ['Arkiv', 'Oversikt', 'Timeplan']) {
      const button = nav.getByRole('button', { name, exact: true })
      await button.click()
      await expect(button).toHaveAttribute('aria-current', 'page')
      if (width < 768) {
        expect(await nav.evaluate((element) => element.scrollHeight - element.clientHeight)).toBe(0)
      }
    }
  })
}

test('mobile navigation stays visible and add actions collapse accessibly', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  const add = page.getByRole('button', { name: 'Legg til', exact: true })
  await expect(add).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('button', { name: 'Nytt fag', exact: true })).toBeHidden()
  await page.screenshot({ path: testInfo.outputPath('mobile-toolbar.png'), animations: 'disabled' })
  await add.click()
  await page.getByRole('button', { name: 'Nytt fag', exact: true }).focus()
  await page.keyboard.press('Escape')
  await expect(add).toBeFocused()
  await expect(add).toHaveAttribute('aria-expanded', 'false')
  await add.click()
  await page.getByRole('button', { name: 'Nytt fag', exact: true }).click()
  await page.getByRole('dialog', { name: 'Nytt fag', exact: true }).getByRole('button', { name: 'Lukk', exact: true }).click()
  await expect(add).toBeFocused()
  await expect(add).toHaveAttribute('aria-expanded', 'false')
  const nav = page.getByRole('navigation', { name: 'Sider' })
  await nav.getByRole('button', { name: 'Oversikt', exact: true }).click()
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(nav).toBeInViewport()
  await nav.getByRole('button', { name: 'Timeplan', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Uke for uke' })).toBeInViewport()
  await expect(nav).toBeInViewport()
  expect((await nav.boundingBox()).y).toBeGreaterThanOrEqual(0)
  await page.screenshot({ path: testInfo.outputPath('mobile-sticky-nav.png'), animations: 'disabled' })
  await page.setViewportSize({ width: 1280, height: 812 })
  await expect(add).toBeHidden()
  await expect(page.getByRole('button', { name: 'Nytt fag', exact: true })).toBeVisible()
})
