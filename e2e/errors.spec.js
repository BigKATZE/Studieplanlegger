import { test, expect } from '@playwright/test'

test('ukjente adresser viser 404 og lar brukeren gå trygt hjem', async ({ page }, testInfo) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/finnes-ikke')
  await expect(page.getByRole('heading', { name: 'Siden finnes ikke' })).toBeVisible()
  await expect(page).toHaveTitle('404 – Siden finnes ikke | Studieplanlegger')
  await expect(page.getByRole('button', { name: 'Logg inn' })).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('oliarev-study-planner-v2'))).toBeNull()
  await page.screenshot({ path: testInfo.outputPath('404-desktop.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('link', { name: 'Til studieplanleggeren' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Studieplanlegger' })).toBeVisible()
  expect(errors).toEqual([])
})

test('404 fungerer på mobil, i mørk modus og på nestede adresser', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => localStorage.setItem('planner-theme', 'dark'))
  await page.goto('/ukjent/side?plan=ikke-en-plan')
  await expect(page.getByRole('heading', { name: 'Siden finnes ikke' })).toBeVisible()
  await expect(page.locator('html')).toHaveClass('dark')
  await expect(page.getByRole('link', { name: 'Til studieplanleggeren' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
  await page.screenshot({ path: testInfo.outputPath('404-mobile-dark.png'), fullPage: true, animations: 'disabled' })
})

test('404-byggfilen har riktige ressurser og skal ikke indekseres', async ({ page, request }) => {
  const html = await (await request.get('/404.html')).text()
  expect(html).toContain('<meta name="robots" content="noindex"')
  expect(html).toContain('404 – Siden finnes ikke | Studieplanlegger')
  expect(html).toMatch(/src="\/assets\/index-[^"]+\.js"/)
  await page.goto('/404.html')
  await expect(page.getByRole('heading', { name: 'Siden finnes ikke' })).toBeVisible()
  await page.goto('/index.html')
  await expect(page.getByRole('heading', { name: 'Studieplanlegger' })).toBeVisible()
})

test('uventet renderfeil viser gjenoppretting uten feildetaljer eller sletting av data', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('error-test-triggered')) return
    sessionStorage.setItem('error-test-triggered', 'true')
    localStorage.setItem('error-test-preserve', 'behold')
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = function (key) {
      if (key === 'planner-hide-completed') throw new Error('INTERN-HEMMELIG-FEIL')
      return original.call(this, key)
    }
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Noe gikk galt' })).toBeVisible()
  await expect(page).toHaveTitle('Noe gikk galt | Studieplanlegger')
  await expect(page.getByText('INTERN-HEMMELIG-FEIL')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('error-test-preserve'))).toBe('behold')
  await page.screenshot({ path: testInfo.outputPath('error-desktop.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: 'Last inn på nytt' }).click()
  await expect(page.getByRole('heading', { name: 'Studieplanlegger' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('error-test-preserve'))).toBe('behold')
})
