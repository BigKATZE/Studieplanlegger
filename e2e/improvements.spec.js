import { test, expect } from '@playwright/test'

async function seed(page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('oliarev-study-planner-v2')) return
    localStorage.setItem('planner-theme', 'light')
    localStorage.setItem('oliarev-study-planner-v2', JSON.stringify({
      subjects: [{ id: 's1', name: 'Avtalerett', short: 'Avtalerett' }, { id: 's2', name: 'Økonomi', short: 'Økonomi' }],
      lectures: [], assignments: [], exams: [], reviews: [],
      readings: [{ id: 'r1', subjectId: 's1', title: 'Avtaleinngåelse', week: null, done: false, chapters: [{ id: 'c1', text: 'Tilbud og aksept', done: false }, { id: 'c2', text: 'Ugyldige avtaler', done: false }] }],
      workPlans: [
        { id: 'p1', subjectId: 's1', title: 'Drøft avtaleinngåelsen', summary: 'Undersøk om partene har inngått en bindende avtale.', steps: [
          { id: 'step1', title: 'Kartlegg rettsspørsmål', description: 'Les faktum og identifiser partenes krav.', doneCriteria: 'Du har formulert de sentrale rettsspørsmålene.', estimatedMinutes: 30, completed: false },
          { id: 'step2', title: 'Skriv drøftelsen', description: 'Knytt rettsreglene til faktum.', estimatedMinutes: 60, completed: false },
        ] },
        { id: 'p2', subjectId: 's2', title: 'Beregn budsjettet', steps: [{ id: 'step3', title: 'Samle kostnader', completed: true }] },
      ],
    }))
  })
  await page.goto('/')
}

test('ukemenyen støtter piltaster, valg, Escape og Tab uten å miste fokus', async ({ page }) => {
  await seed(page)
  const trigger = page.getByRole('button', { name: 'Filtrer på uke' })
  await trigger.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { name: 'Alle uker', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  const next = page.getByRole('option').nth(1)
  await expect(next).toBeFocused()
  const label = await next.innerText()
  await page.keyboard.press('Enter')
  await expect(trigger).toBeFocused()
  await expect(trigger).toContainText(label)
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('option', { name: label, exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await expect(trigger).not.toBeFocused()
  await trigger.click()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await expect(trigger).not.toBeFocused()
})

test('kapitler uten uke kan fullføres, skjules og bevares etter oppdatering', async ({ page }) => {
  await seed(page)
  await page.getByRole('button', { name: 'Pensum', exact: true }).click()
  const chapter = page.getByRole('checkbox', { name: 'Tilbud og aksept' })
  await expect(chapter).toBeVisible()
  await chapter.check()
  await page.getByRole('button', { name: /Skjul 1 fullførte elementer/ }).click()
  await expect(chapter).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: 'Ugyldige avtaler' })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Pensum', exact: true }).click()
  await page.getByRole('button', { name: /Vis 1 fullførte elementer/ }).click()
  await expect(chapter).toBeChecked()
  await chapter.uncheck()
  await expect(chapter).not.toBeChecked()
})

test('arbeidsplaner følger fagfilteret og viser detaljer, fremdrift og angre sletting', async ({ page }, testInfo) => {
  await seed(page)
  await page.getByRole('button', { name: 'Arbeidskrav', exact: true }).click()
  await page.getByRole('button', { name: 'Avtalerett', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Beregn budsjettet' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Skjul 0 fullførte elementer/ })).toBeVisible()
  const plan = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Drøft avtaleinngåelsen' }) })
  await plan.locator('summary').first().click()
  await expect(plan.getByText('Les faktum og identifiser partenes krav.')).toBeVisible()
  await expect(plan.getByText('Du har formulert de sentrale rettsspørsmålene.', { exact: false })).toBeVisible()
  await plan.getByRole('checkbox', { name: 'Fullfør Kartlegg rettsspørsmål' }).check()
  await expect(plan.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  await expect(plan.getByText('Ca. 60 min gjenstår')).toBeVisible()
  await plan.screenshot({ path: testInfo.outputPath('workplan-desktop.png') })
  await plan.getByRole('button', { name: 'Slett', exact: true }).click()
  await expect(plan).toHaveCount(0)
  await page.getByRole('button', { name: 'Angre', exact: true }).click()
  await expect(plan.getByRole('checkbox', { name: 'Fullfør Kartlegg rettsspørsmål' })).toBeChecked()
  await page.reload()
  await page.getByRole('button', { name: 'Arbeidskrav', exact: true }).click()
  await expect(plan.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
})

test('arbeidsplaner fungerer på mobil i mørk modus og med redusert bevegelse', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seed(page)
  await page.getByRole('button', { name: 'Bytt til mørk modus' }).click()
  await page.getByRole('button', { name: 'Arbeidskrav', exact: true }).click()
  const plan = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Drøft avtaleinngåelsen' }) })
  await plan.locator('summary').first().click()
  await plan.getByRole('checkbox', { name: 'Fullfør Kartlegg rettsspørsmål' }).check()
  await expect(plan.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
  expect(await plan.locator('.work-plan-progress').evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(0.001)
  expect(await plan.locator('.step-details').first().evaluate((el) => parseFloat(getComputedStyle(el).animationDuration))).toBeLessThan(0.001)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
  await plan.screenshot({ path: testInfo.outputPath('workplan-mobile-dark.png') })
  await page.getByRole('button', { name: 'Pensum', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Tilbud og aksept' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
})
