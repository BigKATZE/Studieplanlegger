import { test, expect } from '@playwright/test'

const key = 'oliarev-study-planner-v2'
const user = { id: '77777777-7777-4777-8777-777777777777', email: 'calendar@example.com', is_anonymous: false, app_metadata: {}, user_metadata: {}, aud: 'authenticated' }
const fixture = {
  subjects: [{ id: 's1', name: 'Avtalerett', short: 'Avtalerett' }, { id: 's2', name: 'Økonomi', short: 'Økonomi' }],
  lectures: [{ id: 'l1', subjectId: 's1', topic: 'Avtaler', date: '2026-09-08', start: '09:00', end: '10:00', done: true }],
  assignments: [], readings: [], exams: [], reviews: [],
}
const metadata = { id: '88888888-8888-4888-8888-888888888888', subject_ids: ['s1'], event_types: ['lectures'], created_at: '2026-09-07T10:00:00Z' }
const token = 'test-calendar-secret-token-123456'

async function setup(page, { guest = false, anonymous = false, syncError = false, active = false, listError = false, createError = false, revokeError = false } = {}) {
  const account = { ...user, is_anonymous: anonymous }
  const session = { access_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fake', user: account }
  await page.addInitScript(({ session, fixture, key, guest }) => {
    if (!guest) localStorage.setItem('sb-icihdeerjveozgotyqbm-auth-token', JSON.stringify(session))
    localStorage.setItem(guest ? key : `${key}-${session.user.id}`, JSON.stringify(fixture))
  }, { session, fixture, key, guest })
  // Mock getUser as well as the persisted session; never depend on remote auth.
  await page.route('**/auth/v1/user', (route) => route.fulfill({ status: 200, json: account }))
  await page.route('**/rest/v1/user_data*', (route) => route.fulfill(syncError
    ? { status: 500, json: { message: 'test sync error' } }
    : { status: 200, json: { data: fixture, updated_at: '2026-09-07T10:00:00Z' } }))
  const state = { subscriptions: active ? [metadata] : [], calls: [], listError, createError, revokeError }
  await page.route('**/functions/v1/calendar-subscription', async (route) => {
    expect(route.request().method()).toBe('POST')
    const body = route.request().postDataJSON()
    state.calls.push(body)
    if (body.action === 'list') return route.fulfill(state.listError
      ? { status: 503, json: { error: 'Kunne ikke hente abonnement.' } }
      : { status: 200, json: { subscriptions: state.subscriptions } })
    if (body.action === 'create') {
      if (state.createError) return route.fulfill({ status: 503, contentType: 'text/plain', body: 'Unavailable' })
      const subscription = { ...metadata, subject_ids: body.subjectIds, event_types: body.types }
      state.subscriptions = [subscription]
      if (state.createGate) await state.createGate
      return route.fulfill({ status: 200, json: { subscription, token } })
    }
    expect(body).toEqual({ action: 'revoke', id: metadata.id })
    if (state.revokeError) return route.fulfill({ status: 503, json: { error: 'Kunne ikke deaktivere abonnement.' } })
    state.subscriptions = []
    return route.fulfill({ status: 200, json: { ok: true } })
  })
  await page.goto('/')
  if (!guest && !syncError) await expect(page.getByRole('status').first()).toHaveText('Synkronisert')
  return state
}

async function open(page) {
  await page.getByRole('button', { name: 'Eksporter', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Eksporter', exact: true })
  await expect(dialog.getByRole('radio', { name: 'Last ned kalenderfil', exact: true })).toBeChecked()
  await dialog.getByRole('radio', { name: 'Abonner på kalender', exact: true }).check()
  return dialog
}

test('opprett bevisst utvalg, kopier, behold lenke mellom faner og vis bare metadata etter reload', async ({ page }) => {
  const state = await setup(page)
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.copiedCalendarUrl = text } } }))
  let dialog = await open(page)
  await expect(dialog.getByText(/Ingen aktive abonnement/)).toBeVisible()
  expect(state.calls.every((call) => call.action === 'list')).toBe(true)
  await expect(dialog.getByRole('checkbox', { name: 'Avtalerett', exact: true })).toBeChecked()
  await expect(dialog.getByRole('checkbox', { name: 'Økonomi', exact: true })).toBeChecked()
  await dialog.getByRole('checkbox', { name: 'Økonomi', exact: true }).uncheck()
  for (const name of ['Arbeidskrav (frister)', 'Eksamener', 'Repetisjoner']) await dialog.getByRole('checkbox', { name, exact: true }).uncheck()
  await dialog.getByRole('button', { name: 'Opprett abonnement', exact: true }).click()
  const input = dialog.getByRole('textbox', { name: 'Hemmelig kalenderlenke' })
  await expect(input).toHaveValue(new RegExp(`/functions/v1/calendar-subscription\\?token=${token}$`))
  await expect(input).toHaveAttribute('readonly', '')
  const url = await input.inputValue()
  expect(state.calls.filter((call) => call.action === 'create')).toEqual([{ action: 'create', subjectIds: ['s1'], types: ['lectures'] }])
  await dialog.getByRole('button', { name: 'Kopier lenke', exact: true }).click()
  await expect(dialog.getByRole('status')).toHaveText('Lenken er kopiert.')
  expect(await page.evaluate(() => window.copiedCalendarUrl)).toBe(url)
  await dialog.getByRole('radio', { name: 'Last ned kalenderfil', exact: true }).check()
  await expect(input).toBeHidden()
  await dialog.getByRole('button', { name: 'Sikkerhetskopi', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Last ned sikkerhetskopi', exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Kalender', exact: true }).click()
  await dialog.getByRole('radio', { name: 'Abonner på kalender', exact: true }).check()
  await expect(input).toHaveValue(url)
  expect(await page.evaluate((token) => Object.values(localStorage).some((value) => value.includes(token)), token)).toBe(false)
  await page.reload()
  dialog = await open(page)
  await expect(dialog.getByRole('heading', { name: 'Aktivt kalenderabonnement' })).toBeVisible()
  await expect(dialog.getByText('Fag: Avtalerett', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Hendelser: Forelesninger', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Hemmelig kalenderlenke' })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Deaktiver abonnement', exact: true }).click()
  expect(state.calls.filter((call) => call.action === 'revoke')).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Avbryt', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Aktivt kalenderabonnement' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Deaktiver abonnement', exact: true }).click()
  await dialog.getByRole('button', { name: 'Bekreft deaktivering', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Opprett abonnement', exact: true })).toBeEnabled()
  expect(state.calls.filter((call) => call.action === 'create')).toHaveLength(1)
  expect(state.calls.filter((call) => call.action === 'revoke')).toHaveLength(1)
})

test('feil ved lasting er ikke tom liste; retry, validering og manuell kopiering på mobil', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const state = await setup(page, { listError: true, createError: true })
  const dialog = await open(page)
  await expect(dialog.getByRole('alert')).toHaveText('Kunne ikke hente abonnement.')
  await expect(dialog.getByText(/Ingen aktive abonnement/)).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Opprett abonnement', exact: true })).toHaveCount(0)
  state.listError = false
  await dialog.getByRole('button', { name: 'Prøv igjen', exact: true }).click()
  const create = dialog.getByRole('button', { name: 'Opprett abonnement', exact: true })
  await expect(create).toBeEnabled()
  for (const name of ['Avtalerett', 'Økonomi']) await dialog.getByRole('checkbox', { name, exact: true }).uncheck()
  await expect(create).toBeDisabled()
  await dialog.getByRole('checkbox', { name: 'Avtalerett', exact: true }).check()
  await create.click()
  await expect(dialog.getByRole('alert')).toContainText('Kunne ikke kontakte kalendertjenesten')
  state.createError = false
  await create.click()
  await expect(dialog.getByRole('textbox', { name: 'Hemmelig kalenderlenke' })).toBeVisible()
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied') } } }))
  await dialog.getByRole('button', { name: 'Kopier lenke', exact: true }).click()
  await expect(dialog.getByRole('status')).toContainText('kopier den manuelt')
  const input = dialog.getByRole('textbox', { name: 'Hemmelig kalenderlenke' })
  await expect(input).toBeFocused()
  expect(await input.evaluate((element) => element.selectionEnd - element.selectionStart)).toBe((await input.inputValue()).length)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})

test('synkfeil blokkerer opprettelse men ikke listing eller bekreftet deaktivering', async ({ page }) => {
  const state = await setup(page, { syncError: true, active: true, revokeError: true })
  const dialog = await open(page)
  await expect(dialog.getByText(/Planen er ikke ferdig synkronisert/)).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Aktivt kalenderabonnement' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Deaktiver abonnement', exact: true }).click()
  await dialog.getByRole('button', { name: 'Bekreft deaktivering', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Kunne ikke deaktivere abonnement.')
  await expect(dialog.getByRole('heading', { name: 'Aktivt kalenderabonnement' })).toBeVisible()
  state.revokeError = false
  await dialog.getByRole('button', { name: 'Bekreft deaktivering', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Opprett abonnement', exact: true })).toBeDisabled()
  expect(state.calls.some((call) => call.action === 'create')).toBe(false)
})

test('opprettelse er låst mens den pågår og sent svar gir ikke hemmelig lenke i gjenåpnet dialog', async ({ page }) => {
  const state = await setup(page)
  let release
  state.createGate = new Promise((resolve) => { release = resolve })
  let dialog = await open(page)
  await dialog.getByRole('button', { name: 'Opprett abonnement', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Oppretter…', exact: true })).toBeDisabled()
  await expect.poll(() => state.calls.filter((call) => call.action === 'create').length).toBe(1)
  await dialog.getByRole('button', { name: 'Lukk eksport', exact: true }).click()
  dialog = await open(page)
  await expect(dialog.getByRole('heading', { name: 'Aktivt kalenderabonnement' })).toBeVisible()
  const response = page.waitForResponse((response) => response.url().includes('/calendar-subscription') && response.request().postDataJSON()?.action === 'create')
  release()
  await response
  await expect(dialog.getByRole('textbox', { name: 'Hemmelig kalenderlenke' })).toHaveCount(0)
  expect(state.calls.filter((call) => call.action === 'create')).toHaveLength(1)
})

for (const anonymous of [false, true]) test(`gjest beholder fileksport uten abonnementskall (anonym konto: ${anonymous})`, async ({ page }) => {
  const state = await setup(page, { guest: !anonymous, anonymous })
  const dialog = await open(page)
  await expect(dialog.getByText(/Logg inn med en konto/)).toBeVisible()
  expect(state.calls).toEqual([])
  await dialog.getByRole('radio', { name: 'Last ned kalenderfil', exact: true }).check()
  await dialog.getByRole('checkbox', { name: 'Ta også med fullførte elementer', exact: true }).check()
  const downloading = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Last ned .ics', exact: true }).click()
  expect((await downloading).suggestedFilename()).toBe('studieplanlegger.ics')
})
