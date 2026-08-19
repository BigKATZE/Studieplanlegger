import assert from 'node:assert'
import { mapCanvasRows } from './canvas.js'

const isoLocal = (s) => {
  const d = new Date(s)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const subjects = [
  { id: 's1', code: 'EXC3401', name: 'Business Communication, Culture and Ethics', short: 'BizCom' },
  { id: 's2', code: 'JUR3420', name: 'Forretningsjus', short: 'Forretningsjus' },
]

const courses = [
  { id: 1, course_code: 'JUR3420', name: 'Forretningsjus' },
  { id: 2, course_code: 'NY101', name: 'Rar ny fag' },
]
const byCourse = {
  1: [
    { name: 'Arbeidskrav 1', due_at: '2026-10-01T10:00:00Z', published: true },
    { name: 'Uten frist', due_at: null, published: true },
  ],
  2: [{ name: 'Oblig 1', due_at: '2026-09-15T23:59:00Z', published: true }],
}

const rows = mapCanvasRows(courses, byCourse, subjects)
assert.equal(rows.length, 2, 'skips assignments without due date')
assert.equal(rows[0].subjectId, 's2', 'matches existing subject by course code')
assert.equal(rows[0].title, 'Arbeidskrav 1')
assert.equal(rows[0].deadline, isoLocal('2026-10-01T10:00:00Z'))
assert.equal(rows[1].subjectId, null, 'unmatched course -> new subject')
assert.equal(rows[1].deadline, isoLocal('2026-09-15T23:59:00Z'))

console.log('canvas mapCanvasRows: ok')