import assert from 'node:assert/strict'
import { isValidBackupData, normalizePlannerData } from './store.js'

const normalized = normalizePlannerData({
  subjects: [], lectures: [], assignments: [], exams: [], readings: [],
  reviews: [{ id: ' good ', title: '  Gyldig  ', nextReview: ' 2026-08-21 ', details: 2 }, { id: 'good', title: 'Duplikat', nextReview: '2026-08-22' }, { id: '', title: 'Tom id', nextReview: '2026-08-21' }, { id: '   ', title: 'Tom id to', nextReview: '2026-08-21' }, { id: 'bad-date', title: 'Ugyldig', nextReview: 'ikke dato' }, { id: 'bad-day', title: 'Ugyldig dato', nextReview: '2026-02-30' }, { title: 4, nextReview: '2026-08-21' }],
  weekTemplates: [{ id: ' template ', name: ' Fast ', lectures: [{ weekday: 9, chapters: [{ text: ' Kapittel ', done: true }, { text: 4 }] }, null] }, { id: 'template', name: 'Duplikat', lectures: [] }, { id: '', name: 'Tom', lectures: [] }, { id: ' ', name: 'Tom to', lectures: [] }, { name: 4, lectures: [] }],
})
assert.deepEqual(normalized.reviews, [{ id: 'good', subjectId: '', title: 'Gyldig', details: '', intervalIndex: 0, nextReview: '2026-08-21', lastReviewed: '', createdAt: '' }])
assert.equal(normalized.weekTemplates.length, 1)
assert.equal(normalized.weekTemplates[0].name, 'Fast')
assert.equal(normalized.weekTemplates[0].id, 'template')
assert.equal(normalized.weekTemplates[0].lectures[0].weekday, 1)
assert.deepEqual(normalized.weekTemplates[0].lectures[0].chapters, [{ text: 'Kapittel', done: false }])
assert.equal(isValidBackupData({ subjects: [], lectures: [], reviews: [] }), true)
assert.equal(isValidBackupData({ subjects: [], lectures: [], reviews: {} }), false)
assert.equal(isValidBackupData(null), false)
