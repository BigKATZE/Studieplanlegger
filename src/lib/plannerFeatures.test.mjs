import assert from 'node:assert/strict'
import { advanceReview, applyWeekTemplate, createWeekTemplate, examSubjectProgress, findLectureConflictIds } from './plannerFeatures.js'

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
