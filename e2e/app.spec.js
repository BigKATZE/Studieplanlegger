import { test, expect } from '@playwright/test'

test('uten økt brukes appen som gjest, med Logg inn-knapp', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Studieplanlegger' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Logg inn' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Lagret lokalt')
  const githubLink = page.getByRole('link', { name: 'Åpne GitHub-repositoriet' })
  await expect(githubLink).toHaveAttribute('href', 'https://github.com/BigKATZE/Studieplanlegger')
  const [githubBox, headingBox] = await Promise.all([
    githubLink.boundingBox(),
    page.getByRole('heading', { name: 'Studieplanlegger' }).boundingBox(),
  ])
  expect(githubBox.y).toBeLessThan(headingBox.y)
  await page.getByRole('button', { name: 'Changelog', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Changelog' })).toBeVisible()
  const latestRelease = page.getByRole('article').first()
  await expect(latestRelease.getByRole('heading', { name: 'v1.3', exact: true })).toBeVisible()
  await expect(latestRelease.getByText('Nyeste versjon', { exact: true })).toBeVisible()
  await expect(latestRelease.getByRole('heading', { name: 'Semesterarkiv', exact: true })).toBeVisible()
  await expect(latestRelease.getByRole('heading', { name: 'Kalendereksport', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'v1.1' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nytt i studiehverdagen' })).toBeVisible()
  await expect(page.getByText('Bryt ned arbeidskrav med kort, standard eller grundig detaljnivå og valgfritt tidsbudsjett.')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Changelog' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Logg inn' }).click()
  await expect(page.getByRole('button', { name: 'Logg inn', exact: true })).toBeVisible()
})

test('changelog fungerer som egen side på mobil', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Changelog', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'v1.1' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sikkerhet og utvikling' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Changelog' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
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
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
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
      lectures: [{ id: 'today-lecture', subjectId: 's1', date: today, start: '08:00', end: '09:00', topic: 'Dagens testforelesning', chapters: [], done: false }],
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
  await expect(page.getByText('Dagens testforelesning')).toBeVisible()

  await page.getByRole('button', { name: 'Slett alt' }).click()
  await page.getByRole('button', { name: 'Ja, fortsett' }).click()
  await expect(page.getByRole('heading', { name: 'Bekreft permanent sletting' })).toBeVisible()
  await page.getByRole('button', { name: 'Ja, slett alt' }).click()
  await expect(page.getByText('Ingen fag ennå. Legg til et fag eller importer en timeplan.')).toBeVisible()
})

test('skjuler fullførte elementer på tvers av faner og husker valget', async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const tomorrowDate = new Date(now)
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`
    const yesterdayDate = new Date(now)
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`
    localStorage.setItem('oliarev-study-planner-v2', JSON.stringify({
      subjects: [{ id: 's1', name: 'Filterfag', short: 'Filterfag', color: '#7c3aed' }],
      lectures: [
        { id: 'l1', subjectId: 's1', date: today, start: '09:00', end: '10:00', topic: 'Fullført forelesning', chapters: [], done: true },
        { id: 'l2', subjectId: 's1', date: today, start: '11:00', end: '12:00', topic: 'Åpen forelesning', chapters: [{ id: 'c1', text: 'Lest kapittel', done: true }, { id: 'c2', text: 'Ulest kapittel', done: false }], done: false },
      ],
      readings: [
        { id: 'r1', subjectId: 's1', title: 'Fullført pensum', week: null, chapters: [], done: true },
        { id: 'r2', subjectId: 's1', title: 'Åpent pensum', week: null, chapters: [], done: false },
      ],
      assignments: [
        { id: 'a1', subjectId: 's1', title: 'Fullført arbeidskrav', deadline: tomorrow, status: 'done' },
        { id: 'a2', subjectId: 's1', title: 'Åpent arbeidskrav', deadline: tomorrow, status: 'not_started' },
      ],
      exams: [
        { id: 'e1', subjectId: 's1', title: 'Gjennomført eksamen', date: yesterday, time: '09:00' },
        { id: 'e2', subjectId: 's1', title: 'Kommende eksamen', date: tomorrow, time: '09:00' },
      ],
      workPlans: [{ id: 'p1', subjectId: 's1', title: 'Arbeidsplan', steps: [{ id: 'p1s1', title: 'Fullført steg', completed: true }, { id: 'p1s2', title: 'Åpent steg', completed: false }] }],
      reviews: [], weekTemplates: [], aiSources: [], quizAttempts: [],
    }))
  })

  await page.goto('/')
  const timeplanControls = page.getByRole('heading', { name: 'Uke for uke' }).locator('..')
  await expect(timeplanControls.getByRole('button', { name: 'Filtrer på uke' })).toBeVisible()
  await timeplanControls.getByRole('button', { name: /Skjul 2 fullførte elementer/ }).click()
  await expect(page.getByText('Fullført forelesning')).toHaveCount(0)
  await expect(page.getByText('Lest kapittel', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Åpen forelesning')).toBeVisible()
  await expect(page.getByText('Ulest kapittel')).toBeVisible()

  await page.getByRole('button', { name: 'Pensum', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Pensum til forelesning' }).locator('..').getByRole('button', { name: /Vis 1 fullførte elementer/ })).toBeVisible()
  await expect(page.getByText('Fullført pensum')).toHaveCount(0)
  await expect(page.getByText('Åpent pensum')).toBeVisible()

  await page.getByRole('button', { name: 'Arbeidskrav', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Arbeidskrav' }).locator('..').getByRole('button', { name: /Vis 2 fullførte elementer/ })).toBeVisible()
  await expect(page.getByText('Fullført arbeidskrav')).toHaveCount(0)
  await expect(page.getByText('Åpent arbeidskrav')).toBeVisible()
  await expect(page.getByText('Fullført steg')).toHaveCount(0)
  await expect(page.getByText('Åpent steg')).toBeVisible()

  await page.getByRole('button', { name: 'Eksamener', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Eksamensdatoer' }).locator('..').getByRole('button', { name: /Vis 1 fullførte elementer/ })).toBeVisible()
  await expect(page.getByText('Gjennomført eksamen')).toHaveCount(0)
  await expect(page.getByText('Kommende eksamen')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: /Vis 2 fullførte elementer/ })).toHaveAttribute('aria-pressed', 'true')
})

test('forslag til ny dato må godkjennes før arbeidskravet flyttes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('oliarev-study-planner-v2', JSON.stringify({ subjects: [{ id: 's', name: 'Test', short: 'Test' }], lectures: [], readings: [], exams: [], reviews: [], weekTemplates: [], aiSources: [], quizAttempts: [], workPlans: [], assignments: [{ id: 'a', subjectId: 's', title: 'Forfalt oppgave', deadline: '2020-01-01', status: 'not_started' }] })))
  await page.goto('/')
  await page.getByRole('button', { name: 'Oversikt', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Forslag til ny dato' })).toBeVisible()
  await expect(page.getByText('2020-01-01')).toBeVisible()
  await page.getByRole('button', { name: 'Bruk', exact: true }).click()
  await page.getByRole('button', { name: 'Arbeidskrav', exact: true }).click()
  await expect(page.getByText('2020-01-01')).toHaveCount(0)
})

test('delt arbeidsplan bruker kun det offentlige funksjonssvaret', async ({ page }) => {
  await page.route('**/functions/v1/shared-plan', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ plan: { id: 'p', title: 'Delt plan', summary: 'Kun synlig tekst', steps: [{ id: 's', title: 'Les kilden', description: 'Start her' }] } }) }))
  await page.goto('/?plan=abcdefghijklmnop')
  await expect(page.getByRole('heading', { name: 'Delt plan' })).toBeVisible()
  await expect(page.getByText('Les kilden')).toBeVisible()
})

async function aiPage(page, suffix = 'ai-new') {
  const user = { id: '55555555-5555-5555-5555-000000000001', email: `${suffix}@example.com`, app_metadata: {}, user_metadata: {}, aud: 'authenticated' }
  const session = { access_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'fake', user }
  await page.addInitScript(({ session, user }) => localStorage.setItem('sb-icihdeerjveozgotyqbm-auth-token', JSON.stringify(session)) || localStorage.setItem(`oliarev-study-planner-v2-${user.id}`, JSON.stringify({ subjects: [{ id: 's', name: 'Kjemi', short: 'Kjemi' }], lectures: [], readings: [], assignments: [], exams: [], reviews: [], weekTemplates: [], aiSources: [], quizAttempts: [], workPlans: [] })), { session, user })
  await page.route('**/rest/v1/user_data*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto('/'); await page.getByRole('button', { name: 'AI', exact: true }).click()
  return user
}

test('lagrer kilde og viser bundet kildehenvisning fra AI-søk', async ({ page }) => {
  await aiPage(page, 'source')
  await page.getByLabel('Fag for kilde').selectOption('s'); await page.getByLabel('Kildetittel').fill('Kapittel 1'); await page.getByLabel('Kildetekst').fill('Atomer består av protoner og elektroner.')
  await page.getByRole('button', { name: 'Lagre kilde' }).click(); await expect(page.getByText('Kapittel 1')).toBeVisible()
  let body
  await page.route('**/functions/v1/study-suggestions', (route) => { body = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ answer: 'Et atom har protoner.', grounded: true, citations: [{ passageId: body.search.passages[0].id, sourceTitle: 'Kapittel 1', index: 1 }] }) }) })
  await page.getByRole('button', { name: 'Søk i kilder', exact: true }).first().click(); await page.locator('#ai-subject').selectOption('s'); await page.locator('#source-query').fill('Hva er et atom?'); await page.getByRole('button', { name: 'Søk i kilder', exact: true }).last().click()
  expect(body.search.passages.reduce((n, x) => n + x.text.length, 0)).toBeLessThanOrEqual(12000); await expect(page.getByText('Kapittel 1 · avsnitt 1')).toBeVisible()
})

test('adaptiv quiz vurderer skrevet svar og lagrer feil forsøk', async ({ page }) => {
  await aiPage(page, 'quiz')
  const quizRequests = []
  await page.route('**/functions/v1/study-suggestions', (route) => {
    const body = route.request().postDataJSON()
    if (body.tool === 'quiz') quizRequests.push(body)
    if (body.tool === 'exam-feedback') {
      const perQuestion = body.examFeedback.questions.map((q, i) => i === 0 ? { feedback: 'Forklar protonene også.', score: 5 } : { feedback: 'Bra.', score: 9 })
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ perQuestion, totalScore: perQuestion.reduce((s, x) => s + x.score, 0), summary: 'Oppsummert', focusAreas: [] }) })
    }
    const response = body.tool === 'feedback'
      ? { verdict: 'partial', feedback: 'Forklar protonene også.' }
      : { questions: Array.from({ length: 5 }, (_, i) => ({ question: `Spørsmål ${i + 1}`, answer: 'Fasit' })) }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) })
  })
  await page.getByRole('button', { name: 'Lag øvingsspørsmål', exact: true }).click(); await page.locator('#ai-subject').selectOption('s'); await page.locator('#ai-source').fill('Atomer har protoner, nøytroner og elektroner i atommodellen.'); await page.getByRole('button', { name: 'Lag 5 spørsmål' }).click()
  for (let i = 1; i <= 5; i++) await page.getByLabel(`Ditt svar på Spørsmål ${i}`).fill(`Svar ${i}`)
  await page.getByRole('button', { name: 'Vurder alle svar' }).click()
  await expect(page.getByText('Forklar protonene også. (partial')).toBeVisible(); await page.waitForTimeout(150); const stored = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('oliarev-study-planner-v2')).map((key) => JSON.parse(localStorage.getItem(key))).flatMap((data) => data.quizAttempts || [])); expect(stored).toHaveLength(5); expect(stored.find((x) => x.question === 'Spørsmål 1').verdict).toBe('partial')
  await page.getByRole('button', { name: 'Lag 5 spørsmål' }).click()
  expect(quizRequests).toHaveLength(2)
  expect(quizRequests[1].quiz.weakQuestions).toContain('Spørsmål 1')
})

test('oppsummering viser AI-resultat og repetisjonsspørsmål', async ({ page }) => {
  await aiPage(page, 'summary')
  await page.route('**/functions/v1/study-suggestions', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ summary: 'Kort oppsummering.', keyPoints: ['Viktig punkt'], keyConcepts: ['Atom'], reviewQuestions: [{ question: 'Hva er et atom?', answer: 'Grunnenhet' }] }) }))
  await page.getByRole('button', { name: 'Oppsummer', exact: true }).click(); await page.locator('#ai-source').fill('Atomer er grunnenheter som inneholder protoner og elektroner.'); await page.getByRole('button', { name: 'Lag oppsummering' }).click(); await expect(page.getByText('Kort oppsummering.')).toBeVisible(); await expect(page.getByText('Atom', { exact: true })).toBeVisible(); await expect(page.getByText('Hva er et atom?')).toBeVisible()
})

test('ukerapport viser fullført, forfalt, kommende og anbefalt fokus', async ({ page }) => {
  await aiPage(page, 'weekly')
  await page.route('**/functions/v1/study-suggestions', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      summary: 'Kort status for studieuken.',
      completed: ['Forelesning fullført'],
      overdue: ['Arbeidskrav er forfalt'],
      upcoming: ['Eksamen nærmer seg'],
      focus: ['Prioriter arbeidskravet'],
    }),
  }))
  await page.getByRole('button', { name: 'Ukerapport', exact: true }).click()
  await page.getByRole('button', { name: 'Lag ukesrapport' }).click()
  await expect(page.getByRole('heading', { name: 'Fullført denne uken' })).toBeVisible()
  await expect(page.getByText('Arbeidskrav er forfalt')).toBeVisible()
  await expect(page.getByText('Eksamen nærmer seg')).toBeVisible()
  await expect(page.getByText('Prioriter arbeidskravet')).toBeVisible()
})
