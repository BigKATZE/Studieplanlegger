import { test, expect } from '@playwright/test'

test('app loads, pensum tab og fagfilter fungerer', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Studieplanlegger' })).toBeVisible()

  await page.getByRole('button', { name: 'Pensum', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Pensum til forelesning' })).toBeVisible()

  await page.getByRole('button', { name: 'Gjøremål', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Alle' })).toBeVisible()
  await page.getByRole('button', { name: 'Forretningsjus' }).click()
  await expect(page.getByText('Arbeidskrav 1 – Obligasjonsrett')).toBeVisible()
})