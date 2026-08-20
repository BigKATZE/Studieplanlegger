import assert from 'node:assert'
import { search, MAX_PER_GROUP } from './search.js'

const data = {
  subjects: [
    { id: 's1', code: 'JUR3420', name: 'Forretningsjus', short: 'Forretningsjus', color: '#111111' },
    { id: 's2', code: 'BØK3430', name: 'Bedriftsøkonomi og finans', short: 'Bedøk', color: '#222222' },
  ],
  lectures: [
    {
      id: 'l1', subjectId: 's1', date: '2026-08-17', start: '10:00', end: '11:45',
      room: 'A-201', lecturer: 'Gunnar Lund', topic: 'Avtaler', chapters: [{ id: 'c1', text: 'Kapittel 3', done: false }],
    },
  ],
  readings: [
    { id: 'r1', subjectId: 's2', title: 'Bedriftens verdsettelse', week: 34, chapters: [] },
  ],
  assignments: [
    { id: 'a1', subjectId: 's1', title: 'Arbeidskrav 1 – forretningsjus', deadline: '2026-10-01', status: 'not_started' },
  ],
  exams: [
    { id: 'e1', subjectId: 's1', title: 'Skriftlig skoleeksamen', date: '2026-12-15', time: '09:00' },
  ],
}

const s1 = search(data, 'forretningsjus')
assert.equal(s1.subjects.length, 1)
assert.equal(s1.subjects[0].id, 's1')
assert.equal(s1.assignments[0].assignment.id, 'a1')
assert.equal(s1.exams.length, 0, 'eksamen treffer bare på tittel')
assert.equal(s1.lectures.length, 0, 'forelesning treffer ikke på fagnavn')

const s2 = search(data, 'kapittel 3')
assert.equal(s2.lectures.length, 1)
assert.equal(s2.lectures[0].lecture.id, 'l1')
assert.equal(s2.lectures[0].chapters.length, 1)

const s3 = search(data, 'A-201')
assert.equal(s3.lectures.length, 1)
assert.equal(s3.lectures[0].chapters.length, 0)

const s4 = search(data, 'GUNNAR')
assert.equal(s4.lectures.length, 1, 'case-insensitiv')

const s5 = search(data, 'verdsettelse')
assert.equal(s5.readings.length, 1)
assert.equal(s5.readings[0].reading.id, 'r1')

const s6 = search(data, 'arbeidskrav 1')
assert.equal(s6.assignments.length, 1)
assert.equal(s6.subjects.length, 0, 'treffer bare tittel, ikke fag')

const s6b = search(data, 'skoleeksamen')
assert.equal(s6b.exams.length, 1)
assert.equal(s6b.exams[0].exam.id, 'e1')

const s7 = search(data, 'bedøk')
assert.equal(s7.subjects.length, 1)
assert.equal(s7.subjects[0].id, 's2', 'treffer på kortkode')

const s8 = search(data, '')
assert.deepEqual(s8, { subjects: [], lectures: [], readings: [], assignments: [], exams: [] })

const big = {
  subjects: Array.from({ length: 10 }, (_, i) => ({ id: 's' + i, code: 'KOD' + i, name: 'Fag med treff', short: 'F' + i })),
  lectures: [], readings: [], assignments: [], exams: [],
}
assert.equal(search(big, 'treff').subjects.length, MAX_PER_GROUP, 'maks 5 per gruppe')