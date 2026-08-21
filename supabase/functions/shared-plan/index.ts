import { createClient } from 'npm:@supabase/supabase-js@2'
import { extractSharedPlan } from './extract.js'

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_BODY_BYTES = 2_000
const LINK_LIFETIME_DAYS = 30

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function createToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

async function readBody(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) throw new Error('too-large')
  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) throw new Error('too-large')
  const value = JSON.parse(raw)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid')
  return value as Record<string, unknown>
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Kun POST er støttet.' }, 405)

  let body: Record<string, unknown>
  try {
    body = await readBody(request)
  } catch {
    return json({ error: 'Ugyldig forespørsel.' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: 'Tjenesten er ikke konfigurert.' }, 500)

  const service = createClient(supabaseUrl, serviceKey)

  if (body.action === undefined) {
    if (Object.keys(body).some((key) => key !== 'token') || typeof body.token !== 'string' || !TOKEN_PATTERN.test(body.token)) {
      return json({ error: 'Ugyldig forespørsel.' }, 400)
    }

    const { data: link, error: linkError } = await service
      .from('shared_plan_links')
      .select('user_id, plan_id, expires_at')
      .eq('token', body.token)
      .is('revoked_at', null)
      .maybeSingle()
    if (linkError) return json({ error: 'Kunne ikke åpne planen.' }, 500)
    if (!link || new Date(link.expires_at).getTime() <= Date.now()) {
      return json({ error: 'Planen finnes ikke eller lenken er utløpt.' }, 404)
    }

    const { data: row, error: rowError } = await service
      .from('user_data')
      .select('data')
      .eq('user_id', link.user_id)
      .maybeSingle()
    if (rowError) return json({ error: 'Kunne ikke åpne planen.' }, 500)

    const plan = extractSharedPlan(row?.data, link.plan_id)
    return plan ? json({ plan }) : json({ error: 'Planen finnes ikke.' }, 404)
  }

  if (!['create', 'revoke'].includes(String(body.action))) return json({ error: 'Ugyldig forespørsel.' }, 400)
  const allowedKeys = body.action === 'create' ? ['action', 'planId'] : ['action', 'token']
  if (Object.keys(body).some((key) => !allowedKeys.includes(key))) return json({ error: 'Ugyldig forespørsel.' }, 400)

  const authorization = request.headers.get('authorization')
  if (!authorization) return json({ error: 'Du må være logget inn.' }, 401)
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: authData, error: authError } = await authClient.auth.getUser()
  if (authError || !authData.user) return json({ error: 'Du må være logget inn.' }, 401)
  const userId = authData.user.id

  if (body.action === 'create') {
    if (typeof body.planId !== 'string' || !UUID_PATTERN.test(body.planId)) return json({ error: 'Ugyldig plan.' }, 400)

    const { data: row, error: rowError } = await service
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle()
    if (rowError) return json({ error: 'Kunne ikke kontrollere planen.' }, 500)
    if (!extractSharedPlan(row?.data, body.planId)) return json({ error: 'Planen finnes ikke.' }, 404)

    const { data: existing, error: existingError } = await service
      .from('shared_plan_links')
      .select('token, expires_at')
      .eq('user_id', userId)
      .eq('plan_id', body.planId)
      .is('revoked_at', null)
      .maybeSingle()
    if (existingError) return json({ error: 'Kunne ikke kontrollere delingslenken.' }, 500)
    if (existing && new Date(existing.expires_at).getTime() > Date.now()) {
      return json({ token: existing.token, expiresAt: existing.expires_at, reused: true })
    }
    if (existing) {
      const { error: expireError } = await service
        .from('shared_plan_links')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('plan_id', body.planId)
        .is('revoked_at', null)
      if (expireError) return json({ error: 'Kunne ikke fornye delingslenken.' }, 500)
    }

    const token = createToken()
    const expiresAt = new Date(Date.now() + LINK_LIFETIME_DAYS * 86_400_000).toISOString()
    const { error: insertError } = await service
      .from('shared_plan_links')
      .insert({ user_id: userId, plan_id: body.planId, token, expires_at: expiresAt })
    return insertError
      ? json({ error: 'Kunne ikke lage delingslenke.' }, 500)
      : json({ token, expiresAt, reused: false })
  }

  if (typeof body.token !== 'string' || !TOKEN_PATTERN.test(body.token)) return json({ error: 'Ugyldig delingslenke.' }, 400)
  const { data: revoked, error: revokeError } = await service
    .from('shared_plan_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('token', body.token)
    .is('revoked_at', null)
    .select('token')
    .maybeSingle()
  if (revokeError) return json({ error: 'Kunne ikke tilbakekalle lenken.' }, 500)
  return revoked ? json({ ok: true }) : json({ error: 'Delingslenken finnes ikke.' }, 404)
})
