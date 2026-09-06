import assert from 'node:assert/strict'
import { advanceReview, applyWeekTemplate, createWeekTemplate, examSubjectProgress, findLectureConflictIds, proposeReschedules } from './plannerFeatures.js'

const conflict = findLectureConflictIds([{ id: 'a', date: '2026-08-24', start: '09:00', end: '10:00' }, { id: 'b', date: '2026-08-24', start: '09:30', end: '10:30' }, { id: 'c', date: '2026-08-24', start: '', end: '11:00' }, { id: 'd', date: '2026-08-24', start: '10:30', end: '11:00' }])
assert.deepEqual([...conflict].sort(), ['a', 'b'])
assert.deepEqual([...findLectureConflictIds([
  { id: 'bad-text-a', date: 'not-a-date', start: '09:00', end: '10:00' },
  { id: 'bad-text-b', date: 'not-a-date', start: '09:30', end: '10:30' },
  { id: 'bad-day-a', date: '2026-02-30', start: '09:00', end: '10:00' },
  { id: 'bad-day-b', date: '2026-02-30', start: '09:30', end: '10:30' },
  { id: 'touch-a', date: '2026-08-24', start: '10:00', end: '11:00' },
  { id: 'touch-b', date: '2026-08-24', start: '11:00', end: '12:00' },
])], [])

const progressed = advanceReview({ intervalIndex: 3, nextReview: '2026-08-21' }, new Date('2026-08-21T08:00:00'))
assert.equal(progressed.intervalIndex, 3)
assert.equal(progressed.nextReview, '2026-09-04')
assert.equal(advanceReview({ intervalIndex: 0 }, new Date('2026-08-21T08:00:00')).nextReview, '2026-08-22')

assert.deepEqual(examSubjectProgress({ subjectId: 's' }, { lectures: [{ subjectId: 's', done: true }], readings: [{ subjectId: 's', chapters: [{ text: '1', done: true }] }], assignments: [{ subjectId: 's', status: 'done' }] }), { completed: 3, total: 3 })

const template = createWeekTemplate('Fast', [{ subjectId: 's', date: '2026-08-24', start: '09:00', end: '10:00', topic: 'Tema', chapters: [{ text: '1', done: true }] }], new Date('2026-08-21T08:00:00'), 't')
const applied = applyWeekTemplate(template, 35, [{ subjectId: 's', date: '2026-08-24', start: '09:00', end: '10:00', topic: 'Tema' }], (() => { let n = 0; return () => `id-${++n}` })())
assert.equal(applied.length, 0)
const fresh = applyWeekTemplate(template, 35, [], (() => { let n = 0; return () => `id-${++n}` })())
assert.equal(fresh[0].done, false)
assert.equal(fresh[0].chapters[0].done, false)
const mixedTemplate = { ...template, lectures: [...template.lectures, { ...template.lectures[0], subjectId: 'deleted', topic: 'Slettet fag' }] }
const onlyExisting = applyWeekTemplate(mixedTemplate, 36, [], (() => { let n = 0; return () => `id-${++n}` })(), new Date('2026-08-21T08:00:00'), new Set(['s']))
assert.equal(onlyExisting.length, 1)
assert.equal(onlyExisting[0].subjectId, 's')
assert.deepEqual(applyWeekTemplate({ ...template, lectures: [{ ...template.lectures[0], subjectId: 'deleted' }] }, 36, [], () => 'id', new Date('2026-08-21T08:00:00'), new Set(['s'])), [])
assert.deepEqual(proposeReschedules({ assignments: [{ id: 'a', title: 'Oppgave', deadline: '2026-08-18', status: 'not_started' }], reviews: [{ id: 'r', title: 'Kort', nextReview: '2026-08-19' }], exams: [{ date: '2026-08-22' }] }, new Date('2026-08-21T12:00:00')), [{ type: 'assignment', id: 'a', title: 'Oppgave', from: '2026-08-18', to: '2026-08-23' }, { type: 'review', id: 'r', title: 'Kort', from: '2026-08-19', to: '2026-08-24' }])

// More than 21 overdue items must still receive valid, balanced dates.
const rescheduleNow = new Date('2026-08-21T12:00:00')
const backlog = {
  assignments: Array.from({ length: 50 }, (_, index) => ({ id: `a${index}`, title: `Oppgave ${index}`, deadline: '2026-08-01', status: 'not_started' })),
  reviews: [{ id: 'review', title: 'Repetisjon', nextReview: '2026-08-02' }],
  exams: [{ date: '2026-08-22' }],
}
const unchanged = structuredClone(backlog)
const rescheduled = proposeReschedules(backlog, rescheduleNow)
assert.equal(rescheduled.length, 51)
assert.ok(rescheduled.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.to) && item.to > '2026-08-21' && item.to <= '2026-09-11' && item.to !== '2026-08-22'))
const perDay = Object.values(rescheduled.reduce((counts, item) => ({ ...counts, [item.to]: (counts[item.to] || 0) + 1 }), {}))
assert.ok(Math.max(...perDay) - Math.min(...perDay) <= 1)
assert.deepEqual(backlog, unchanged)
assert.deepEqual(proposeReschedules(backlog, rescheduleNow), rescheduled)

const examDates = Array.from({ length: 21 }, (_, index) => {
  const date = new Date(rescheduleNow)
  date.setDate(date.getDate() + index + 1)
  return { date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
})
assert.ok(proposeReschedules({ ...backlog, exams: examDates }, rescheduleNow).every((item) => examDates.some((exam) => exam.date === item.to)))
assert.equal(proposeReschedules({ ...backlog, assignments: backlog.assignments.slice(0, 1), reviews: [], exams: examDates.slice(0, 7) }, rescheduleNow)[0].to, '2026-08-29')
assert.deepEqual(proposeReschedules({ assignments: [{ id: 'done', deadline: '2026-08-01', status: 'done' }, { id: 'invalid', deadline: 'invalid' }, { id: 'future', deadline: '2026-09-01' }], reviews: [{ nextReview: '2026-02-30' }] }, rescheduleNow), [])
assert.equal(proposeReschedules({ assignments: [{ id: 'overdue', deadline: '2026-08-01' }, { id: 'scheduled', deadline: '2026-08-22' }], reviews: [{ nextReview: '2026-08-23' }], lectures: [{ date: '2026-08-24' }] }, rescheduleNow)[0].to, '2026-08-25')
