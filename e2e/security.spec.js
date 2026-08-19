import { test, expect } from '@playwright/test'

// Kjører mot produksjon/Supabase – krever nettverk og at siden er deployet.
const SITE_URL = process.env.SITE_URL || 'https://studieplanlegger.vercel.app'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://icihdeerjveozgotyqbm.supabase.co'
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Hgnqklpjuy4ZMlk-LAQc3Q_na0HwOEN'

test('RLS: anon/publishable-nøkkel kan ikke lese andre brukeres data', async ({ request }) => {
  const res = await request.get(`${SUPABASE_URL}/rest/v1/user_data?select=*`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  })
  // Avvist = 403 (ingen tilgang på tabellen) eller 200 med tom liste (RLS filtrerer bort alt).
  expect([200, 401, 403]).toContain(res.status())
  if (res.status() === 200) {
    const rows = await res.json()
    expect(Array.isArray(rows)).toBeTruthy()
    expect(rows.length).toBe(0)
  }
})

test('Sikkerhetsheadere er til stede på produksjonssiden', async ({ request }) => {
  const res = await request.get(SITE_URL)
  const headers = res.headers()
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['content-security-policy']).toContain("default-src 'self'")
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
})