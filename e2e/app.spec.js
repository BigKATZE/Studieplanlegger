import { test, expect } from '@playwright/test'

test('uten økt brukes appen som gjest, med Logg inn-knapp', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Studieplanlegger' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Logg inn' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Lagret lokalt')
  await page.getByRole('button', { name: 'Changelog' }).click()
  const changelog = page.getByRole('dialog', { name: 'Changelog' })
  await expect(changelog).toBeVisible()
  await expect(changelog.getByRole('heading', { name: 'Nytt i studiehverdagen' })).toBeVisible()
  await expect(changelog.getByText('Bryt ned arbeidskrav med kort, standard eller grundig detaljnivå og valgfritt tidsbudsjett.')).toBeVisible()
  await changelog.getByRole('button', { name: 'Lukk' }).click()
  await page.getByRole('button', { name: 'Logg inn' }).click()
  await expect(page.getByRole('button', { name: 'Logg inn', exact: true })).toBeVisible()
})

test('leser v1-data når v2 ikke finnes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('oliarev-study-planner-v1', JSON.stringify({
      subjects: [{ id: 's1', code: 'JUS2010', name: 'JUS2010', short: 'JUS2010', color: '#7c3aed', levelOverride: null }],
      lectures: [],
      assignments: [],
      exams: [],
      readings: [],
    }))
  })
  await page.goto('/')
  await expect(page.getByText('JUS2010').first()).toBeVisible()
})

test('feilet synkronisering bruker innlogget brukers cache, ikke gjestedata', async ({ page }) => {
  const user = { id: '11111111-1111-1111-1111-111111111111', email: 'isolated@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated' }
  const session = { access_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fake', user }
  await page.addInitScript(({ session, userId }) => {
    localStorage.setItem('sb-icihdeerjveozgotyqbm-auth-token', JSON.stringify(session))
    localStorage.setItem('oliarev-study-planner-v2', JSON.stringify({ subjects: [{ id: 'guest', name: 'Gjestefag', short: 'Gjestefag' }], lectures: [], assignments: [], exams: [], readings: [] }))
    localStorage.setItem(`oliarev-study-planner-v2-${userId}`, JSON.stringify({ subjects: [{ id: 'member', name: 'Innlogget fag', short: 'Innlogget fag' }], lectures: [], assignments: [], exams: [], readings: [] }))
  }, { session, userId: user.id })
  await page.route('**/rest/v1/user_data*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"testfeil"}' }))
  await page.goto('/')
  await expect(page.getByText('Innlogget fag').first()).toBeVisible()
  await expect(page.getByText('Gjestefag')).toHaveCount(0)
})

test('feilet synkronisering uten brukercache viser ikke gjestedata', async ({ page }) => {
  const user = { id: '22222222-2222-2222-2222-222222222222', email: 'empty@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated' }
  const session = { access_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fake', user }
  await page.addInitScript((value) => {
    localStorage.setItem('sb-icihdeerjveozgotyqbm-auth-token', JSON.stringify(value))
    localStorage.setItem('oliarev-study-planner-v2', JSON.stringify({ subjects: [{ id: 'guest', name: 'Gjestefag', short: 'Gjestefag' }], lectures: [], assignments: [], exams: [], readings: [] }))
  }, session)
  await page.route('**/rest/v1/user_data*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"testfeil"}' }))
  await page.goto('/')
  await expect(page.getByRole('status')).toHaveText('Synkfeil')
  await expect(page.getByText('Gjestefag')).toHaveCount(0)
  await expect(page.getByText('Ingen forelesninger ennå. Importer en timeplan eller legg til manuelt.')).toBeVisible()
})

test('utlogging laster gjestedata etter innlogget plan', async ({ page }) => {
  const user = { id: '33333333-3333-3333-3333-333333333333', email: 'logout@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated' }
  const session = { access_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fake', user }
  await page.addInitScript(({ session, userId }) => {
    localStorage.setItem('sb-icihdeerjveozgotyqbm-auth-token', JSON.stringify(session))
    localStorage.setItem('oliarev-study-planner-v2', JSON.stringify({ subjects: [{ id: 'guest', name: 'Gjestefag', short: 'Gjestefag' }], lectures: [], assignments: [], exams: [], readings: [] }))
    localStorage.setItem(`oliarev-study-planner-v2-${userId}`, JSON.stringify({ subjects: [{ id: 'member', name: 'Innlogget fag', short: 'Innlogget fag' }], lectures: [], assignments: [], exams: [], readings: [] }))
  }, { session, userId: user.id })
  await page.route('**/rest/v1/user_data*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/auth/v1/logout*', (route) => route.fulfill({ status: 204 }))
  await page.goto('/')
  await expect(page.getByText('Innlogget fag').first()).toBeVisible()
  await page.getByRole('button', { name: 'Logg ut' }).click()
  await expect(page.getByRole('button', { name: 'Logg inn' })).toBeVisible()
  await expect(page.getByText('Gjestefag').first()).toBeVisible()
  await expect(page.getByText('Innlogget fag')).toHaveCount(0)
})

test('bryter ned arbeidskrav til en tilpasset og avkryssbar arbeidsplan', async ({ page }) => {
  const user = { id: '44444444-4444-4444-4444-444444444444', email: 'ai@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated' }
  const session = { access_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fake', user }
  await page.addInitScript(({ session, userId }) => {
    localStorage.setItem('sb-icihdeerjveozgotyqbm-auth-token', JSON.stringify(session))
    localStorage.setItem(`oliarev-study-planner-v2-${userId}`, JSON.stringify({
      subjects: [{ id: 's1', code: 'JUS2010', name: 'Avtalerett', short: 'Avtalerett', color: '#7c3aed' }],
      lectures: [], readings: [], exams: [], reviews: [], weekTemplates: [],
      assignments: [{ id: 'a1', subjectId: 's1', title: 'Arbeidskrav 2', deadline: '2026-10-15', status: 'not_started' }],
    }))
  }, { session, userId: user.id })
  await page.route('**/rest/v1/user_data*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  let requestBody
  await page.route('**/functions/v1/study-suggestions', (route) => {
    requestBody = route.request().postDataJSON()
    const steps = Array.from({ length: 8 }, (_, index) => ({
      title: index === 0 ? 'Kartlegg krav' : `Deloppgave ${index + 1}`,
      description: 'Arbeid systematisk med denne delen.',
      doneCriteria: 'Resultatet er kontrollert mot oppgaveteksten.',
      estimatedMinutes: 45,
    }))
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: 'En grundig arbeidsplan for arbeidskravet.',
        requirements: ['Bruk juridisk metode', 'Lever som PDF'],
        steps,
        clarifications: ['Kontroller hvilken henvisningsstil som skal brukes'],
      }),
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'AI', exact: true }).click()
  await page.locator('#ai-assignment').selectOption('a1')
  await page.locator('#ai-breakdown-detail').selectOption('detailed')
  await page.locator('#ai-time-budget').fill('12')
  await page.locator('#ai-source').fill('Drøft hvilke krav kjøperen kan gjøre gjeldende etter forbrukerkjøpsloven.')
  await page.getByRole('button', { name: 'Lag arbeidsplan' }).click()

  await expect(page.getByRole('heading', { name: 'Arbeidsplan' })).toBeVisible()
  expect(requestBody.breakdown).toEqual({ detail: 'detailed', timeBudgetHours: 12 })
  expect(requestBody.context.assignment).toContain('frist 2026-10-15')
  await expect(page.getByText('Estimert arbeidstid: 6 t')).toBeVisible()
  await expect(page.getByText('Bruk juridisk metode')).toBeVisible()
  await expect(page.getByText('Kontroller hvilken henvisningsstil som skal brukes')).toBeVisible()
  const progress = page.getByRole('progressbar', { name: 'Fremdrift i arbeidsplan' })
  await expect(progress).toHaveAttribute('aria-valuenow', '0')
  await page.getByRole('checkbox', { name: 'Fullfør Kartlegg krav' }).check()
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByRole('button', { name: 'Kopier plan' })).toBeVisible()
})

test('ukemal kan brukes i en tom uke', async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date()
    const schoolYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
    const jan4 = new Date(schoolYear, 0, 4)
    const weekday = jan4.getDay() || 7
    const monday = new Date(schoolYear, 0, 4 - (weekday - 1))
    monday.setDate(monday.getDate() + (34 - 1) * 7)
    const date = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
    localStorage.setItem('oliarev-study-planner-v2', JSON.stringify({
      subjects: [{ id: 's1', name: 'Maltest', short: 'Maltest', color: '#7c3aed' }],
      lectures: [{ id: 'l1', subjectId: 's1', date, start: '09:00', end: '10:00', topic: 'Malforelesning', chapters: [], done: false }],
      assignments: [], exams: [], readings: [], reviews: [], weekTemplates: [],
    }))
  })
  await page.goto('/')
  const chooseWeek = async (week) => {
    await page.getByRole('button', { name: 'Filtrer på uke' }).click()
    await page.getByRole('option', { name: `Uke ${week}`, exact: true }).click()
  }
  await chooseWeek(34)
  await expect(page.getByText('Malforelesning')).toBeVisible()
  await page.locator('#template-name').fill('Fast forelesning')
  await page.getByRole('button', { name: 'Lagre uke som mal' }).click()
  await expect(page.getByText('Ukemalen er lagret.')).toBeVisible()
  await chooseWeek(35)
  await expect(page.getByRole('heading', { name: 'Uke 35' })).toBeVisible()
  await page.getByRole('button', { name: 'Bruk i uke 35' }).click()
  await expect(page.getByText('Malforelesning')).toBeVisible()
})

test('normaliserer eldre data, legger til repetisjon og åpner fokus med konflikt', async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    localStorage.setItem('oliarev-study-planner-v2', JSON.stringify({
      subjects: [{ id: 's1', code: 'TEST', name: 'Testfag', short: 'Testfag', color: '#7c3aed' }],
      lectures: [
        { id: 'l1', subjectId: 's1', date: today, start: '09:00', end: '10:00', topic: 'Konflikt A', chapters: [], done: false },
        { id: 'l2', subjectId: 's1', date: today, start: '09:30', end: '10:30', topic: 'Konflikt B', chapters: [], done: false },
      ],
      assignments: [], exams: [], readings: [],
      reviews: [{ id: 'bad', title: 4, nextReview: today }],
      weekTemplates: [{ name: 4, lectures: null }],
    }))
  })
  await page.goto('/')
  await expect(page.getByText('Tidskonflikt med en annen forelesning denne dagen.')).toHaveCount(2)

  await page.getByRole('button', { name: 'Oversikt', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Dagens plan' })).toBeVisible()
  await page.locator('#review-title').fill('E2E repetisjon')
  await page.getByRole('button', { name: 'Legg til', exact: true }).click()
  await expect(page.getByText('E2E repetisjon').first()).toBeVisible()

  await page.getByRole('button', { name: 'Fokus', exact: true }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Fokusøkt' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('25:00')).toBeVisible()
  await expect(dialog.getByRole('combobox')).toBeVisible()
})

test('app loads, pensum tab og fagfilter fungerer', async ({ page }) => {
  await page.route('**/rest/v1/user_data*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  }))
  const user = {
    id: '00000000-0000-0000-0000-000000000000',
    email: 'e2e@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
  }
  const session = {
    access_token: 'fake',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'fake',
    user,
  }
  await page.addInitScript(({ session, data }) => {
    localStorage.setItem('sb-icihdeerjveozgotyqbm-auth-token', JSON.stringify(session))
    localStorage.setItem(
      'oliarev-study-planner-v2-00000000-0000-0000-0000-000000000000',
      JSON.stringify(data),
    )
  }, {
    session,
    data: {
      subjects: [{ id: 's1', code: 'JUR3420', name: 'Forretningsjus', short: 'Forretningsjus', color: '#7c3aed', levelOverride: null }],
      lectures: [],
      assignments: [{ id: 'a1', subjectId: 's1', title: 'Arbeidskrav 1 – Obligasjonsrett', deadline: '2026-10-01', status: 'not_started' }],
      exams: [],
      readings: [],
    },
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Studieplanlegger' })).toBeVisible()

  await page.getByRole('button', { name: 'Pensum', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Pensum til forelesning' })).toBeVisible()

  await page.getByRole('button', { name: 'Arbeidskrav', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Alle' })).toBeVisible()
  await page.getByRole('button', { name: 'Forretningsjus' }).click()
  await expect(page.getByText('Arbeidskrav 1 – Obligasjonsrett')).toBeVisible()

  await page.getByRole('button', { name: 'Importer', exact: true }).click()
  await page.getByRole('button', { name: 'iCal', exact: true }).click()
  await page.locator('input[type="file"]').setInputFiles('test-kalender.ics')
  await expect(page.getByText(/Fant 12 hendelser:/)).toBeVisible()
  await page.getByRole('button', { name: 'Importer 12 nye' }).click()
  await page.getByRole('button', { name: 'Timeplan', exact: true }).click()
  await page.getByRole('button', { name: 'Alle', exact: true }).click()
  await expect(page.getByText('C432')).toBeVisible()
  await page.getByRole('button', { name: 'Pensum', exact: true }).click()
  await page.getByRole('button', { name: 'Alle', exact: true }).click()
  await expect(page.getByText('Pensum TEST1234 – Les kapittel 1–3')).toBeVisible()

  await page.getByRole('button', { name: 'Importer', exact: true }).click()
  await page.getByRole('button', { name: 'iCal', exact: true }).click()
  await page.locator('input[type="file"]').setInputFiles('test-kalender.ics')
  await expect(page.getByText(/12 duplikater hoppes over/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Importer 0 nye' })).toBeDisabled()
  await page.getByRole('button', { name: 'Avbryt' }).click()

  await page.getByRole('button', { name: 'Oversikt', exact: true }).click()
  await expect(page.getByText('Forelesninger').first()).toBeVisible()
  await page.getByRole('button', { name: 'Neste 7 dager' }).click()
  await expect(page.getByText('Forelesning TEST1234 – Introduksjon og studieteknikk')).toBeVisible()

  await page.getByRole('button', { name: 'Slett alt' }).click()
  await page.getByRole('button', { name: 'Ja, fortsett' }).click()
  await expect(page.getByRole('heading', { name: 'Bekreft permanent sletting' })).toBeVisible()
  await page.getByRole('button', { name: 'Ja, slett alt' }).click()
  await expect(page.getByText('Ingen fag ennå. Legg til et fag eller importer en timeplan.')).toBeVisible()
})
