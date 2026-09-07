import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractCalendar, subscriptionCalendar, validScope } from '../../supabase/functions/calendar-subscription/extract.js'
import { createHandler, hashToken } from '../../supabase/functions/calendar-subscription/handler.js'

const id = '11111111-1111-4111-8111-111111111111'
const created = '2026-09-07T12:00:00Z'
const plan = {
  subjects: [{ id: 's', name: 'Law', notes: 'SECRET' }, { id: 'other', name: 'PRIVATE' }],
  lectures: [{ id: 'l', subjectId: 's', date: '2026-09-08', start: '09:00', end: '10:00', topic: 'Lecture', room: 'A', done: true, notes: 'SECRET', chapters: [{ text: 'SECRET' }] }, { id: 'hidden', subjectId: 'other', date: '2026-09-08', topic: 'PRIVATE' }],
  assignments: [{ id: 'a', subjectId: 's', title: 'Deadline', deadline: '2026-09-09', status: 'done' }],
  exams: [{ id: 'e', subjectId: 's', title: 'Exam', date: '2026-09-10', time: '10:00' }],
  reviews: [{ id: 'r', subjectId: 's', title: 'Review', nextReview: '2026-09-11', details: 'SECRET' }],
  aiSources: [{ text: 'SECRET' }], quizAttempts: [{ userAnswer: 'SECRET' }], workPlans: [{ title: 'SECRET' }],
  semesterArchives: [{ data: { lectures: [{ topic: 'SECRET' }] } }],
}
const subscription = { id, subject_ids: ['s'], event_types: ['lectures', 'assignments', 'exams', 'reviews'], created_at: created }
const row = () => ({ data: structuredClone(plan), updated_at: created })

test('calendar projection is scoped, private, bounded and stable, including completed history', () => {
  const source = row()
  const before = structuredClone(source)
  const calendar = subscriptionCalendar(source, subscription)
  assert.equal(calendar.match(/BEGIN:VEVENT/g).length, 4)
  assert.ok(calendar.includes(`UID:${id}-lectures-l@studieplanlegger`))
  assert.ok(calendar.includes('DTSTART:20260908T070000Z'))
  assert.ok(!/SECRET|PRIVATE|DESCRIPTION|ATTENDEE/.test(calendar))
  assert.equal(subscriptionCalendar(source, subscription), calendar)
  assert.deepEqual(source, before)
  source.data.lectures[0].topic = 'New\r\nATTENDEE:bad'
  source.data.lectures[0].date = '2026-09-09'
  const changed = subscriptionCalendar(source, subscription)
  assert.ok(changed.includes(`UID:${id}-lectures-l@studieplanlegger`))
  assert.ok(!changed.includes('\r\nATTENDEE:'))
  assert.equal(extractCalendar(plan, ['s'], ['exams']).lectures, undefined)
  assert.equal(extractCalendar(plan, ['missing'], ['lectures']).lectures.length, 0)
  assert.ok(!subscriptionCalendar({ data: {}, updated_at: created }, subscription).includes('BEGIN:VEVENT'))
  for (const [subjects, types] of [[[], ['exams']], [['s'], []], [['s', 's'], ['exams']], [['s'], ['notes']], [['s'], ['exams', 'exams']], [['s'], ['constructor']], [['x'.repeat(129)], ['exams']]]) assert.equal(validScope(subjects, types), false)
  assert.throws(() => extractCalendar(null, ['s'], ['lectures']))
  assert.throws(() => extractCalendar({ subjects: {} }, ['s'], ['lectures']))
  assert.throws(() => extractCalendar({ subjects: Array(10001) }, ['s'], ['lectures']))
  assert.throws(() => extractCalendar({ ...plan, lectures: [plan.lectures[0], plan.lectures[0]] }, ['s'], ['lectures']))
  assert.throws(() => extractCalendar({ ...plan, lectures: Array.from({ length: 2001 }, (_, i) => ({ ...plan.lectures[0], id: String(i) })) }, ['s'], ['lectures']))
  assert.throws(() => subscriptionCalendar({ data: plan, updated_at: 'bad' }, subscription))
  const malformed = { ...plan, lectures: [null, { ...plan.lectures[0], id: '' }, { ...plan.lectures[0], date: '2026-09-08garbage' }] }
  assert.ok(!subscriptionCalendar({ data: malformed, updated_at: created }, { ...subscription, event_types: ['lectures'] }).includes('BEGIN:VEVENT'))
})

// Stateful Data API double: executes filters and projections, not canned authorization results.
function backend() {
  const state = { links: [], rows: { alice: row(), bob: row() }, queries: [], fail: '', anonymous: false }
  const client = (_url, key) => key === 'anon' ? {
    auth: { getUser: async (jwt) => ({ data: { user: ['alice', 'bob'].includes(jwt) ? { id: jwt, is_anonymous: state.anonymous } : null }, error: null }) },
  } : {
    from(table) {
      let operation = 'select', fields = '*', values
      const filters = []
      const query = {
        select(value) { fields = value; return query },
        eq(key, value) { filters.push([key, value]); return query },
        is(key, value) { filters.push([key, value]); return query },
        insert(value) { operation = 'insert'; values = value; return query },
        update(value) { operation = 'update'; values = value; return query },
        maybeSingle() { return execute(true) },
        single() { return execute(true) },
        then(resolve, reject) { return execute(false).then(resolve, reject) },
      }
      async function execute(single) {
        state.queries.push({ table, operation, filters, fields })
        if (state.fail === table) return { data: null, error: { message: 'SECRET DATABASE ERROR' } }
        let rows = table === 'user_data' ? Object.entries(state.rows).map(([user_id, value]) => ({ user_id, ...value })) : state.links
        if (operation === 'insert') {
          if (rows.some((item) => item.user_id === values.user_id && item.revoked_at === null)) return { error: { code: '23505' } }
          const inserted = { ...values, id: state.links.length ? '22222222-2222-4222-8222-222222222222' : id, created_at: created, revoked_at: null }
          state.links.push(inserted)
          rows = [inserted]
        } else rows = rows.filter((item) => filters.every(([key, value]) => item[key] === value))
        if (operation === 'update') rows.forEach((item) => Object.assign(item, values))
        const selected = rows.map((item) => Object.fromEntries(fields.split(',').map((key) => [key.trim(), item[key.trim()]])))
        return { data: single ? selected[0] ?? null : selected, error: null }
      }
      return query
    },
  }
  const handle = createHandler(client, { SUPABASE_URL: 'https://example.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' })
  const post = (body, user = 'alice') => handle(new Request('https://example.test/calendar-subscription', { method: 'POST', headers: user ? { Authorization: `Bearer ${user}` } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) }))
  const get = (token, method = 'GET') => handle(new Request(`https://example.test/calendar-subscription?token=${token}`, { method }))
  return { state, handle, post, get }
}

test('endpoint authentication, ownership, create/list contract, hashing and revocation', async () => {
  const { state, post, get } = backend()
  for (const action of ['create', 'list', 'revoke']) {
    assert.equal((await post({ action, id }, '')).status, 401)
    assert.equal((await post({ action, id }, 'forged')).status, 401)
  }
  state.anonymous = true
  assert.equal((await post({ action: 'list' })).status, 401)
  state.anonymous = false
  assert.equal(state.queries.length, 0)
  const createdResponse = await post({ action: 'create', subjectIds: ['s'], types: ['lectures'] })
  assert.equal(createdResponse.status, 200)
  const result = await createdResponse.json()
  assert.deepEqual(Object.keys(result).sort(), ['subscription', 'token'])
  assert.deepEqual(result.subscription, { ...subscription, event_types: ['lectures'] })
  assert.match(result.token, /^[A-Za-z0-9_-]{32}$/)
  assert.equal(state.links[0].token_hash, await hashToken(result.token))
  assert.ok(!JSON.stringify(state.links).includes(result.token))
  assert.deepEqual(await (await post({ action: 'list' })).json(), { subscriptions: [result.subscription] })
  assert.deepEqual(await (await post({ action: 'list' }, 'bob')).json(), { subscriptions: [] })
  assert.equal((await post({ action: 'revoke', id }, 'bob')).status, 404)
  assert.equal(state.links[0].revoked_at, null)
  assert.equal((await post({ action: 'create', subjectIds: ['s'], types: ['lectures'] })).status, 409)
  assert.equal((await post({ action: 'list' }, result.token)).status, 401)
  const feed = await get(result.token)
  assert.equal(feed.status, 200)
  assert.match(feed.headers.get('content-type'), /^text\/calendar/)
  assert.equal(feed.headers.get('cache-control'), 'private, no-store')
  const first = await feed.text()
  assert.ok(!/PRIVATE|SECRET/.test(first))
  state.rows.alice.data.lectures[0].topic = 'Saved update'
  assert.ok((await (await get(result.token)).text()).includes('Saved update'))
  const head = await get(result.token, 'HEAD')
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
  assert.deepEqual(await (await post({ action: 'revoke', id })).json(), { ok: true })
  assert.equal((await get(result.token)).status, 404)
  const revokedHead = await get(result.token, 'HEAD')
  assert.equal(revokedHead.status, 404)
  assert.equal(await revokedHead.text(), '')
  assert.equal((await post({ action: 'create', subjectIds: ['s'], types: ['exams'] })).status, 200)
  for (const query of state.queries.filter((q) => q.table === 'user_data' || q.operation === 'update' || q.table === 'calendar_subscriptions' && q.operation === 'select' && !q.filters.some(([key]) => key === 'token_hash'))) {
    assert.ok(query.filters.some(([key]) => key === 'user_id'), 'owner filter required')
  }
})

test('endpoint rejects bad requests and fails closed without leaking backend errors', async () => {
  const { state, post, get, handle } = backend()
  for (const body of ['null', '[]', '{', JSON.stringify({ action: 'list', padding: '\u00e6'.repeat(11000) }), { action: 'constructor' }, { action: { toString: null } }, { action: 'create', subjectIds: [], types: ['exams'] }, { action: 'create', subjectIds: ['s'], types: ['notes'] }, { action: 'list', user_id: 'bob' }, { action: 'revoke', id: 'bad' }]) assert.equal((await post(body)).status, 400)
  assert.equal((await post({ action: 'create', subjectIds: ['unknown'], types: ['exams'] })).status, 409)
  delete state.rows.alice
  assert.equal((await post({ action: 'create', subjectIds: ['s'], types: ['exams'] })).status, 409)
  state.rows.alice = row()
  const { token } = await (await post({ action: 'create', subjectIds: ['s'], types: ['exams'] })).json()
  for (const table of ['calendar_subscriptions', 'user_data']) {
    state.fail = table
    const response = await get(token)
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { error: 'Service unavailable.' })
  }
  state.fail = 'calendar_subscriptions'
  assert.equal((await post({ action: 'list' })).status, 503)
  assert.equal((await post({ action: 'revoke', id })).status, 503)
  assert.equal(state.links[0].revoked_at, null)
  state.fail = ''
  state.rows.alice.data.exams = {}
  assert.equal((await get(token)).status, 503)
  assert.equal((await get('bad')).status, 404)
  assert.equal((await get('x'.repeat(32))).status, 404)
  assert.equal((await get(`${token}&types=lectures`)).status, 404)
  assert.equal((await handle(new Request('https://example.test', { method: 'DELETE' }))).status, 405)
})

test('concurrent creation returns one token, empty saved plans stay valid, raw UTF-8 is checked', async () => {
  const { state, post, get, handle } = backend()
  const responses = await Promise.all([1, 2].map(() => post({ action: 'create', subjectIds: ['s'], types: ['lectures'] })))
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409])
  assert.equal(state.links.length, 1)
  const { token } = await responses.find((response) => response.status === 200).json()
  state.rows.alice.data = { subjects: [], lectures: [], semesterArchives: [{ data: plan }] }
  const empty = await get(token)
  assert.equal(empty.status, 200)
  const calendar = await empty.text()
  assert.ok(calendar.includes('BEGIN:VCALENDAR'))
  assert.ok(!calendar.includes('BEGIN:VEVENT'))
  const badUtf8 = new Request('https://example.test', { method: 'POST', headers: { Authorization: 'Bearer alice' }, body: new Uint8Array([0xff]) })
  assert.equal((await handle(badUtf8)).status, 400)
})
