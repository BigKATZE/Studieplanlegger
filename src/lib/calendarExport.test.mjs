import assert from 'node:assert/strict'
import { exportCalendar, osloTime, validCalendarDate } from './calendarExport.js'
import { parseIcs } from './ics.js'

const now = new Date('2026-09-05T12:00:00Z')
assert.equal(osloTime('2026-09-08', '09:00'), '20260908T070000Z')
assert.equal(osloTime('2026-01-08', '09:00'), '20260108T080000Z')
assert.equal(osloTime('2026-03-29', '02:30'), null)
assert.equal(osloTime('2026-10-25', '02:30'), '20261025T003000Z')
assert.equal(osloTime('2026-02-30', '09:00'), null)
assert.equal(osloTime('2026-09-08', '25:30'), null)
assert.equal(validCalendarDate('2024-02-29'), true)
assert.equal(validCalendarDate('2026-02-29'), false)
const data = {
  subjects: [{ id: 's', name: 'Jus' }],
  lectures: [{ id: 'lecture', subjectId: 's', date: '2026-09-08', start: '09:00', end: '10:00', room: 'A, 1;2', topic: 'Lov\\rett\nEND:VEVENT\nBEGIN:VEVENT' }, { id: 'done', date: '2026-09-08', done: true }],
  assignments: [{ id: 'a', subjectId: 's', title: 'Frist', deadline: '2026-12-31' }],
  exams: [{ id: 'e', subjectId: 's', title: 'Eksamen', date: '2026-11-04', time: '08:00' }],
  reviews: [{ id: 'r', nextReview: '2026-09-09', title: 'Repetisjon' }],
  aiSources: [{ text: 'HEMMELIG-KILDE' }], semesterArchives: [{ data: { lectures: [{ date: '2026-09-08' }] } }],
}
const before = structuredClone(data)
const exported = exportCalendar(data, {}, now)
assert.equal(exported.count, 4)
assert.equal(exported.skipped, 0)
assert.equal(exported.text.match(/\r\nBEGIN:VEVENT\r\n/g).length, 4)
assert.ok(exported.text.includes('DTSTART:20260908T070000Z\r\nDTEND:20260908T080000Z'))
assert.ok(exported.text.includes('DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101'))
assert.ok(exported.text.includes('LOCATION:A\\, 1\\;2'))
assert.ok(!exported.text.includes('HEMMELIG-KILDE'))
assert.equal(parseIcs(exported.text).length, 4)
assert.deepEqual(data, before)
assert.equal(exportCalendar(data, { types: [] }, now).count, 0)
assert.equal(exportCalendar(data, { subjectId: 's', from: '2026-09-08', to: '2026-09-08' }, now).count, 1)
assert.equal(exportCalendar(data, { includeCompleted: true }, now).count, 5)
assert.throws(() => exportCalendar(data, { from: '2026-09-10', to: '2026-09-01' }), /periode/)
assert.throws(() => exportCalendar(data, { from: 'oops' }), /periode/)
assert.equal(exportCalendar({ lectures: [{ date: '' }, { date: '2026-09-08', start: 'wrong' }, { date: '2026-09-08', start: '10:00', end: '09:00' }] }).skipped, 3)
const unicode = exportCalendar({ assignments: [{ id: 'test\r\nATTENDEE:bad', deadline: '2026-09-08', title: 'ÆØÅ🙂'.repeat(100) }] }, {}, now).text
assert.ok(unicode.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75))
assert.ok(!unicode.includes('\r\nATTENDEE:'))
assert.ok(unicode.replace(/\r\n /g, '').includes('ÆØÅ🙂'.repeat(100)))
assert.equal(exportCalendar(data, {}, now).text, exported.text)
