import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const key = 'oliarev-study-planner-v2'
const fixture = {
  subjects: [{ id: 's', name: 'Avtalerett', short: 'Avtalerett' }],
  lectures: [{ id: 'l', subjectId: 's', date: '2026-09-08', start: '09:00', end: '10:00', topic: 'Avtaleinngåelse', room: 'A1' }],
  assignments: [{ id: 'a', subjectId: 's', title: 'Arbeidskrav 1', deadline: '2026-09-15' }],
  readings: [{ id: 'r', subjectId: 's', title: 'Avtaler', chapters: [{ id: 'c', text: 'Kapittel 1', done: true }] }],
  exams: [{ id: 'e', subjectId: 's', title: 'Skriftlig', date: '2026-12-01', time: '09:00' }],
  reviews: [{ id: 'rv', subjectId: 's', title: 'Repeter avtaler', nextReview: '2026-09-09' }],
  aiSources: [{ id: 'source', subjectId: 's', title: 'Notater', text: 'HEMMELIG KILDE', sourceType: 'notes' }],
}

async function seed(page) {
  await page.addInitScript(({ key, fixture }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture))
  }, { key, fixture })
  await page.goto('/')
}
async function archive(page) {
  await page.getByRole('button', { name: 'Arkiv', exact: true }).click()
  await page.getByRole('textbox', { name: 'Navn på semester' }).fill('Høst 2026')
  await page.getByRole('button', { name: 'Arkiver semester', exact: true }).click()
  await page.getByRole('button', { name: 'Arkiver og start tom plan' }).click()
}
const archiveArticle = (page) => page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Høst 2026', exact: true }) })

test('arkivering krever bekreftelse og bevarer innhold etter oppdatering', async ({ page }, testInfo) => {
  await seed(page)
  await page.getByRole('button', { name: 'Arkiv', exact: true }).click()
  await page.getByRole('button', { name: 'Arkiver semester', exact: true }).click()
  await page.getByRole('button', { name: 'Avbryt', exact: true }).click()
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).subjects.length, key)).toBe(1)
  await archive(page)
  await expect(page.getByText('Semesteret er arkivert. Den aktive planen er nå tom.')).toBeVisible()
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)
  expect(stored.subjects).toEqual([])
  expect(stored.semesterArchives[0].data.aiSources[0].text).toBe('HEMMELIG KILDE')
  await page.reload()
  await page.getByRole('button', { name: 'Arkiv', exact: true }).click()
  await archiveArticle(page).locator('summary').click()
  await expect(archiveArticle(page).getByText('Avtaleinngåelse', { exact: true })).toBeVisible()
  await page.getByRole('heading', { name: 'Semesterarkiv', exact: true }).scrollIntoViewIfNeeded()
  await page.locator('section[aria-labelledby="archive-title"]').screenshot({ path: testInfo.outputPath('archive-desktop.png'), animations: 'disabled' })
  await archiveArticle(page).getByRole('button', { name: 'Gjenopprett', exact: true }).click()
  await page.getByRole('button', { name: 'Bekreft gjenoppretting' }).click()
  await page.getByRole('button', { name: 'Timeplan', exact: true }).click()
  await expect(page.getByText('Avtaleinngåelse', { exact: true })).toBeVisible()
})

test('gjenoppretting arkiverer den aktive planen først', async ({ page }) => {
  await seed(page)
  await archive(page)
  await page.getByRole('button', { name: 'Nytt fag', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Nytt fag', exact: true })
  await dialog.getByRole('textbox').first().fill('Økonomi')
  await dialog.getByRole('button', { name: /Legg til|Lagre/ }).click()
  await archiveArticle(page).getByRole('button', { name: 'Gjenopprett', exact: true }).click()
  await page.getByRole('button', { name: 'Bekreft gjenoppretting' }).click()
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)
  expect(stored.subjects[0].name).toBe('Avtalerett')
  expect(stored.semesterArchives[0].data.subjects[0].name).toBe('Økonomi')
})

test('full lagring stopper arkivering uten å endre aktiv plan', async ({ page }) => {
  await seed(page)
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Full', 'QuotaExceededError')
      return original.call(this, name, value)
    }
  }, key)
  await archive(page)
  await expect(page.getByRole('alert')).toContainText('Den aktive planen er ikke endret')
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)
  expect(stored.subjects[0].name).toBe('Avtalerett')
  expect(stored.semesterArchives ?? []).toEqual([])
})

test('arkivbackup kan lastes ned og sletting krever bekreftelse', async ({ page }) => {
  await seed(page)
  await archive(page)
  const downloading = page.waitForEvent('download')
  await archiveArticle(page).getByRole('button', { name: 'Last ned sikkerhetskopi' }).click()
  const download = await downloading
  const backup = JSON.parse(await readFile(await download.path(), 'utf8'))
  expect(backup.aiSources[0].text).toBe('HEMMELIG KILDE')
  expect(backup.semesterArchives).toBeUndefined()
  await archiveArticle(page).getByRole('button', { name: 'Slett arkiv' }).click()
  await page.getByRole('button', { name: 'Avbryt', exact: true }).click()
  await expect(archiveArticle(page)).toBeVisible()
  await archiveArticle(page).getByRole('button', { name: 'Slett arkiv' }).click()
  await page.getByRole('button', { name: 'Slett permanent', exact: true }).click()
  await expect(archiveArticle(page)).toHaveCount(0)
})

test('kalendereksport filtrerer, laster ned og bevarer klokkeslett', async ({ page }, testInfo) => {
  await seed(page)
  await page.getByRole('button', { name: 'Eksporter kalender', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Eksporter kalender' })
  await expect(dialog.getByText('4 hendelser klare for eksport.')).toBeVisible()
  await dialog.getByLabel('Fra dato (valgfritt)').fill('2026-09-08')
  await dialog.getByLabel('Til dato (valgfritt)').fill('2026-09-08')
  await expect(dialog.getByText('1 hendelse klar for eksport.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Last ned .ics', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Lukk', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Last ned .ics', exact: true })).toBeFocused()
  await dialog.screenshot({ path: testInfo.outputPath('calendar-desktop.png'), animations: 'disabled' })
  const downloading = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Last ned .ics', exact: true }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('studieplanlegger.ics')
  const text = await readFile(await download.path(), 'utf8')
  expect(text).toContain('DTSTART:20260908T070000Z')
  expect(text).not.toContain('HEMMELIG KILDE')
  await dialog.getByLabel('Fra dato (valgfritt)').fill('2026-09-10')
  await expect(dialog.getByRole('alert')).toContainText('gyldig periode')
  await expect(dialog.getByRole('button', { name: 'Last ned .ics' })).toBeDisabled()
})

test('arkiv og kalendereksport fungerer på mobil i mørk modus', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page)
  await page.getByRole('button', { name: 'Bytt til mørk modus' }).click()
  await archive(page)
  await page.getByRole('heading', { name: 'Semesterarkiv', exact: true }).scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
  await page.locator('section[aria-labelledby="archive-title"]').screenshot({ path: testInfo.outputPath('archive-mobile.png'), animations: 'disabled' })
  await page.getByRole('button', { name: 'Eksporter kalender', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Last ned .ics' })).toBeDisabled()
  await page.screenshot({ path: testInfo.outputPath('calendar-mobile-top.png'), animations: 'disabled' })
  await page.getByRole('button', { name: 'Lukk eksport' }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: 'Lukk eksport' })).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Last ned .ics' })).toBeInViewport()
  await page.screenshot({ path: testInfo.outputPath('calendar-mobile.png'), animations: 'disabled' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
})

test('synkkonflikt etter arkivering bevarer lokal kopi og gjest har eget arkiv', async ({ page }) => {
  const user = { id: '55555555-5555-5555-5555-555555555555', email: 'archive@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated' }
  const session = { access_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fake', user }
  await page.addInitScript(({ session, key }) => {
    localStorage.setItem('sb-icihdeerjveozgotyqbm-auth-token', JSON.stringify(session))
    localStorage.setItem(key, JSON.stringify({ subjects: [], lectures: [], semesterArchives: [{ id: 'guest', name: 'Gjestearkiv', data: { subjects: [], lectures: [] } }] }))
  }, { session, key })
  let sent
  await page.route('**/rest/v1/user_data*', (route) => {
    if (route.request().method() === 'PATCH') {
      sent = route.request().postDataJSON()
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: fixture, updated_at: '2026-09-05T10:00:00Z' }) })
  })
  await page.goto('/')
  await archive(page)
  await expect(page.getByRole('alert')).toContainText('en annen enhet')
  expect(sent.data.semesterArchives[0].data.subjects[0].name).toBe('Avtalerett')
  await expect(archiveArticle(page)).toBeVisible()
  await expect(page.getByText('Gjestearkiv')).toHaveCount(0)
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).semesterArchives[0].name, key)).toBe('Gjestearkiv')
})

test('komplett sikkerhetskopi kan importeres med semesterarkivet intakt', async ({ page }) => {
  await seed(page)
  await archive(page)
  await page.getByRole('button', { name: 'Importer', exact: true }).click()
  let dialog = page.getByRole('dialog', { name: 'Importer', exact: true })
  await dialog.getByRole('button', { name: 'Sikkerhetskopi', exact: true }).click()
  const downloading = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Eksporter data' }).click()
  const file = await (await downloading).path()
  const backup = JSON.parse(await readFile(file, 'utf8'))
  expect(backup.semesterArchives[0].data.aiSources[0].text).toBe('HEMMELIG KILDE')
  await dialog.getByRole('button', { name: 'Lukk', exact: true }).click()
  await archiveArticle(page).getByRole('button', { name: 'Slett arkiv' }).click()
  await page.getByRole('button', { name: 'Slett permanent', exact: true }).click()
  await page.getByRole('button', { name: 'Importer', exact: true }).click()
  dialog = page.getByRole('dialog', { name: 'Importer', exact: true })
  await dialog.getByRole('button', { name: 'Sikkerhetskopi', exact: true }).click()
  await dialog.locator('input[type="file"]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  await expect(dialog.getByText(/1 arkiverte semestre/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Erstatt og importer' }).click()
  await expect(archiveArticle(page)).toBeVisible()
  const loaded = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)
  expect(loaded).toEqual(backup)
})

test('arkivet sendes til egen konto og kan lastes fra synk uten lokal cache', async ({ page }) => {
  const user = { id: '66666666-6666-6666-6666-666666666666', email: 'saved-archive@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated' }
  const session = { access_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fake', user }
  await page.addInitScript((session) => localStorage.setItem('sb-icihdeerjveozgotyqbm-auth-token', JSON.stringify(session)), session)
  let row = { data: fixture, updated_at: '2026-09-05T10:00:00Z' }
  await page.route('**/rest/v1/user_data*', (route) => {
    if (route.request().method() === 'PATCH') {
      expect(route.request().url()).toContain(`user_id=eq.${user.id}`)
      row = route.request().postDataJSON()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ updated_at: row.updated_at }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) })
  })
  await page.goto('/')
  await archive(page)
  await expect.poll(() => row.data.semesterArchives?.length).toBe(1)
  await expect(page.getByRole('status').first()).toHaveText('Synkronisert')
  await page.evaluate((cacheKey) => localStorage.removeItem(cacheKey), `${key}-${user.id}`)
  await page.reload()
  await page.getByRole('button', { name: 'Arkiv', exact: true }).click()
  await expect(archiveArticle(page)).toBeVisible()
})
