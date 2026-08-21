import assert from 'node:assert'
import { restoreChapter, restoreItem, restoreSubject } from './undo.js'

const base = {
  subjects: [{ id: 's1' }, { id: 's2' }],
  lectures: [{ id: 'l1', subjectId: 's1', topic: 'Nyere tittel', chapters: [] }],
  assignments: [{ id: 'a2', subjectId: 's2', status: 'done' }],
  exams: [],
  readings: [],
}

const withAssignment = restoreItem(base, 'assignments', { id: 'a1', subjectId: 's1' }, 0)
assert.equal(withAssignment.assignments[1].status, 'done', 'senere endringer skal bevares')
assert.deepEqual(withAssignment.assignments.map((a) => a.id), ['a1', 'a2'])

const withChapter = restoreChapter(base, 'l1', { id: 'c1', text: 'Kapittel 1' }, 0)
assert.equal(withChapter.lectures[0].topic, 'Nyere tittel', 'forelesningen skal ikke erstattes av et gammelt snapshot')
assert.equal(withChapter.lectures[0].chapters[0].id, 'c1')
assert.equal(restoreChapter(base, 'mangler', { id: 'c1' }, 0).lectures.length, 1)

const withoutS1 = { ...base, subjects: [{ id: 's2' }], lectures: [], assignments: base.assignments }
const restored = restoreSubject(withoutS1, {
  subject: { id: 's1' },
  index: 0,
  items: { lectures: [{ id: 'l1', subjectId: 's1', topic: 'Gammel' }], assignments: [], exams: [], readings: [] },
})
assert.deepEqual(restored.subjects.map((s) => s.id), ['s1', 's2'])
assert.equal(restored.assignments[0].status, 'done')
