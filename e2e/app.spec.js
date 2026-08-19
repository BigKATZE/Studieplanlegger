import { test, expect } from '@playwright/test'

test('uten økt brukes appen som gjest, med Logg inn-knapp', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Studieplanlegger' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Logg inn' })).toBeVisible()
  await page.getByRole('button', { name: 'Logg inn' }).click()
  await expect(page.getByRole('button', { name: 'Logg inn', exact: true })).toBeVisible()
})

test('app loads, pensum tab og fagfilter fungerer', async ({ page }) => {
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

  await page.getByRole('button', { name: 'Gjøremål', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Alle' })).toBeVisible()
  await page.getByRole('button', { name: 'Forretningsjus' }).click()
  await expect(page.getByText('Arbeidskrav 1 – Obligasjonsrett')).toBeVisible()
})