import { extractCalendar, subscriptionCalendar, validScope } from './extract.js'

const metadata = 'id, subject_ids, event_types, created_at'
const tokenPattern = /^[A-Za-z0-9_-]{32}$/
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
}

export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function readBody(request) {
  const max = 20_000
  if (Number(request.headers.get('content-length')) > max || !request.body) throw new Error('invalid-body')
  const reader = request.body.getReader()
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > max) { await reader.cancel(); throw new Error('large-body') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid-body')
  return body
}

// Inject only the existing Supabase client factory and environment for offline HTTP tests.
export function createHandler(createClient, env) {
  return async (request) => {
    const respond = (body, status = 200, extra = {}) => new Response(request.method === 'HEAD' ? null : JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json', ...extra } })
    const unavailable = () => respond({ error: 'Calendar unavailable.' }, 404)
    try {
      if (request.method === 'OPTIONS') return new Response(null, { headers })
      if (!['GET', 'HEAD', 'POST'].includes(request.method)) return respond({ error: 'Method not allowed.' }, 405, { Allow: 'GET, HEAD, POST, OPTIONS' })
      const url = new URL(request.url)
      const publicRead = request.method !== 'POST'
      const readToken = url.searchParams.get('token')
      if (publicRead && (!readToken || !tokenPattern.test(readToken) || [...url.searchParams.keys()].length !== 1)) return unavailable()
      if (!publicRead && url.search) return respond({ error: 'Invalid request.' }, 400)
      const { SUPABASE_URL: base, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: secret } = env
      if (!base || !anon || !secret) return respond({ error: 'Service unavailable.' }, 503)

      if (publicRead) {
        const service = createClient(base, secret, { auth: { persistSession: false, autoRefreshToken: false } })
        const { data: sub, error } = await service.from('calendar_subscriptions').select(`${metadata}, user_id`).eq('token_hash', await hashToken(readToken)).is('revoked_at', null).maybeSingle()
        if (error) throw new Error('lookup-failed')
        if (!sub) return unavailable()
        const { data: row, error: rowError } = await service.from('user_data').select('data, updated_at').eq('user_id', sub.user_id).maybeSingle()
        if (rowError) throw new Error('read-failed')
        if (!row) return unavailable()
        const text = subscriptionCalendar(row, sub)
        return new Response(request.method === 'HEAD' ? null : text, { headers: { ...headers, 'Content-Type': 'text/calendar; charset=utf-8' } })
      }

      const bearer = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')
      if (!bearer) return respond({ error: 'Authentication required.' }, 401)
      const auth = createClient(base, anon, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data: authData, error: authError } = await auth.auth.getUser(bearer[1])
      const user = authData?.user
      if (authError || !user || user.is_anonymous) return respond({ error: 'Authentication required.' }, 401)
      let body
      try { body = await readBody(request) } catch { return respond({ error: 'Invalid request.' }, 400) }
      const keys = { create: ['action', 'subjectIds', 'types'], list: ['action'], revoke: ['action', 'id'] }
      if (typeof body.action !== 'string' || !Object.hasOwn(keys, body.action) || Object.keys(body).some((key) => !keys[body.action].includes(key))) return respond({ error: 'Invalid request.' }, 400)
      const service = createClient(base, secret, { auth: { persistSession: false, autoRefreshToken: false } })
      if (body.action === 'list') {
        const { data, error } = await service.from('calendar_subscriptions').select(metadata).eq('user_id', user.id).is('revoked_at', null)
        if (error) throw new Error('list-failed')
        return respond({ subscriptions: data ?? [] })
      }
      if (body.action === 'revoke') {
        if (typeof body.id !== 'string' || !idPattern.test(body.id)) return respond({ error: 'Invalid request.' }, 400)
        const { data, error } = await service.from('calendar_subscriptions').update({ revoked_at: new Date().toISOString() }).eq('user_id', user.id).eq('id', body.id).is('revoked_at', null).select('id').maybeSingle()
        if (error) throw new Error('revoke-failed')
        return data ? respond({ ok: true }) : unavailable()
      }
      if (!validScope(body.subjectIds, body.types)) return respond({ error: 'Invalid request.' }, 400)
      const { data: row, error: rowError } = await service.from('user_data').select('data, updated_at').eq('user_id', user.id).maybeSingle()
      if (rowError) throw new Error('read-failed')
      if (!row) return respond({ error: 'Synchronize your plan first.' }, 409)
      const projected = extractCalendar(row.data, body.subjectIds, body.types)
      if (projected.subjects.length !== body.subjectIds.length) return respond({ error: 'Selected subjects are not synchronized.' }, 409)
      const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replaceAll('+', '-').replaceAll('/', '_')
      const { data, error } = await service.from('calendar_subscriptions').insert({ user_id: user.id, token_hash: await hashToken(token), subject_ids: body.subjectIds, event_types: body.types }).select(metadata).single()
      if (error?.code === '23505') return respond({ error: 'An active subscription already exists. Revoke it first.' }, 409)
      if (error || !data) throw new Error('create-failed')
      return respond({ subscription: data, token })
    } catch {
      // Never log credentials, URLs, planner content or database error details.
      return respond({ error: 'Service unavailable.' }, 503)
    }
  }
}
