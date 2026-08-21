import assert from 'node:assert'
import { extractSharedSubject } from '../../supabase/functions/shared-subject/extract.js'

const data = {
  subjects: [
    { id: 's1', code: 'JUR3420', name: 'Forretningsjus', short: 'Forretningsjus', color: '#111111' },
    { id: 's2', code: 'BØK3430', name: 'Bedriftsøkonomi', short: 'Bedøk', color: '#222222' },
  ],
  lectures: [
    { id: 'l1', subjectId: 's1', date: '2026-08-17', start: '10:00', end: '11:45', room: 'A-201', topic: 'Avtaler', done: true, chapters: [{ id: 'c1', text: 'Kapittel 3', done: true }] },
    { id: 'l2', subjectId: 's2', date: '2026-08-18', start: '12:00', end: '13:45', room: 'B-101', topic: 'Verdsettelse', chapters: [] },
    { id: 'l3', subjectId: 's1', date: '2026-08-19', start: '10:00', end: '11:45', room: 'A-201', topic: 'Forhandlinger', chapters: [] },
  ],
  readings: [
    { id: 'r1', subjectId: 's1', title: 'Avtaleloven', week: 34, chapters: [] },
    { id: 'r2', subjectId: 's2', title: 'Finansregning', week: 34, chapters: [] },
  ],
  assignments: [
    { id: 'a1', subjectId: 's1', title: 'Arbeidskrav 1', deadline: '2026-10-01' },
    { id: 'a2', subjectId: 's2', title: 'Arbeidskrav 2', deadline: '2026-10-08' },
  ],
  exams: [
    { id: 'e1', subjectId: 's1', title: 'Skriftlig skoleeksamen', date: '2026-12-15' },
    { id: 'e2', subjectId: 's2', title: 'Skriftlig skoleeksamen', date: '2026-12-18' },
  ],
}

const out = extractSharedSubject(data, 's1')

assert.deepEqual(Object.keys(out), ['subject', 'lectures', 'readings'], 'returnerer kun delte datatyper')

assert.equal(out.subject.id, 's1')
assert.deepEqual(out.lectures.map((l) => l.id), ['l1', 'l3'], 'kun forelesninger for s1')
assert.equal(out.lectures[0].chapters[0].text, 'Kapittel 3', 'kapitler følger med forelesningen')
assert.deepEqual(out.readings.map((r) => r.id), ['r1'], 'kun pensum for s1')

const serialized = JSON.stringify(out)
assert.ok(!serialized.includes('s2'), 'ingen andre fag')
assert.ok(!serialized.includes('BØK3430'), 'ingen andre fagkoder')
assert.ok(!serialized.includes('l2'), 'ingen forelesninger fra andre fag')
assert.ok(!serialized.includes('r2'), 'ingen pensum fra andre fag')
assert.ok(!serialized.includes('Arbeidskrav'), 'ingen gjøremål')
assert.ok(!serialized.includes('skoleeksamen'), 'ingen eksamener')
assert.ok(!serialized.includes('a1') && !serialized.includes('a2'), 'ingen arbeidskrav-id-er')
assert.ok(!serialized.includes('e1') && !serialized.includes('e2'), 'ingen eksamens-id-er')
assert.ok(!serialized.includes('subjectId'), 'fjerner intern knytning')
assert.ok(!serialized.includes('"done"'), 'fjerner privat studieprogresjon')

assert.equal(extractSharedSubject(data, 'finnes-ikke'), null, 'ukjent fag gir null')
assert.equal(extractSharedSubject({ subjects: [] }, 's1'), null, 'tom subjects gir null')
assert.deepEqual(extractSharedSubject(undefined, 's1'), null, 'manglende data gir null')
