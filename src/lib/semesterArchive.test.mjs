import assert from 'node:assert/strict'
import { normalizePlannerData, isValidBackupData, PLANNER_COLLECTIONS } from './store.js'
import { archiveSemester, restoreSemester, hasSemesterContent } from './semesterArchive.js'

const now = new Date('2026-09-05T12:00:00Z')
const active = normalizePlannerData({ subjects: [{ id: 's', name: 'Jus' }], lectures: [{ id: 'l', subjectId: 's', date: '2026-09-08', topic: 'Avtaler' }], readings: [{ id: 'r', chapters: [{ id: 'c', text: 'Kapittel 1', done: true }] }], workPlans: [{ id: 'p', title: 'Plan', steps: [{ id: 'ps', title: 'Les', completed: true }] }], aiSources: [{ id: 'source', subjectId: 's', title: 'Notater', text: 'Privat tekst', sourceType: 'notes' }] })
const before = structuredClone(active)
const archived = archiveSemester(active, ' Høst 2026 ', 'archive-1', now)
assert.equal(hasSemesterContent(archived), false)
assert.equal(archived.semesterArchives[0].name, 'Høst 2026')
assert.equal(archived.semesterArchives[0].data.semesterArchives, undefined)
for (const key of PLANNER_COLLECTIONS) assert.deepEqual(archived.semesterArchives[0].data[key], active[key])
assert.deepEqual(active, before)
assert.deepEqual(normalizePlannerData(JSON.parse(JSON.stringify(archived))), archived)
assert.equal(isValidBackupData(archived), true)
assert.equal(isValidBackupData(archived.semesterArchives[0].data), true)
assert.deepEqual(normalizePlannerData({ subjects: [], lectures: [] }).semesterArchives, [])
assert.throws(() => archiveSemester(normalizePlannerData({}), 'Tomt', 'empty'), /tom/)
assert.throws(() => archiveSemester(active, ' ', 'empty'), /navn/)
assert.throws(() => archiveSemester({ ...active, semesterArchives: Array.from({ length: 20 }, (_, i) => ({ id: String(i) })) }, 'Fullt', 'new'), /fullt/)

const restored = restoreSemester(archived, 'archive-1', 'unused', now)
assert.deepEqual(restored, active)
const current = normalizePlannerData({ ...archived, subjects: [{ id: 'new', name: 'Økonomi' }] })
const swapped = restoreSemester(current, 'archive-1', 'automatic', now)
assert.deepEqual(swapped.subjects, active.subjects)
assert.equal(swapped.semesterArchives.length, 1)
assert.equal(swapped.semesterArchives[0].data.subjects[0].id, 'new')
assert.equal(current.subjects[0].id, 'new')
assert.throws(() => restoreSemester(current, 'missing', 'x', now), /Fant ikke/)

for (const value of [null, {}, 'bad', [null], [{ id: 'a', name: 'A', data: { subjects: [], lectures: [], semesterArchives: [] } }]]) {
  assert.equal(isValidBackupData({ subjects: [], lectures: [], semesterArchives: value }), false)
}
const nested = { id: 'a', name: 'A', data: { ...active, semesterArchives: [] } }
nested.data.semesterArchives.push(nested)
assert.equal(normalizePlannerData({ semesterArchives: [nested] }).semesterArchives[0].data.semesterArchives, undefined)
const huge = { ...active, semesterArchives: [{ id: 'old', name: 'Old', data: { aiSources: [{ text: 'x'.repeat(4 * 1024 * 1024) }] } }] }
assert.throws(() => archiveSemester(huge, 'Too big', 'new', now), /mye plass/)
