import assert from 'node:assert/strict'
import { buildSuggestionPayload } from './aiSuggestions.js'

const payload = buildSuggestionPayload({
  subjects: [{ id: 's1', code: 'JUS2010', name: 'Statsrett', short: 'JUS2010' }],
  assignments: [
    { subjectId: 's1', title: 'Oblig 1', deadline: '2026-08-22', status: 'in_progress' },
    { subjectId: 's1', title: 'Ferdig', deadline: '2026-08-23', status: 'done' },
  ],
  exams: [{ subjectId: 's1', title: 'Eksamen', date: '2026-09-01' }],
  lectures: [{ subjectId: 's1', topic: 'Statsrett', date: '2026-08-25', done: false }],
  readings: [{ subjectId: 's1', title: 'Statsrett', week: 35, done: false, chapters: [{ text: 'Grunnloven § 49', done: false }] }],
}, new Date(2026, 7, 21))

assert.equal(payload.today, '2026-08-21')
assert.equal(payload.items.length, 4)
assert.equal(payload.items[0].subject, 'JUS2010 – Statsrett')
assert.ok(!payload.items.some((item) => item.title === 'Ferdig'))
assert.equal(payload.items.find((item) => item.kind === 'Pensum').details, 'Grunnloven § 49')
