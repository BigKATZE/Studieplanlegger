import assert from 'node:assert/strict'
import { extractSharedSemester } from '../../supabase/functions/shared-semester/extract.js'

const data = {
  subjects: [
    { id: 'fag-1', name: ' Programmering ', code: 'DAT101', short: 'Prog', color: '#059669' },
    { id: 'fag-2', name: 'Statistikk', code: 'STA100', short: 'Stat', color: 'javascript:alert(1)' },
  ],
  lectures: [
    { subjectId: 'fag-1', date: '2026-08-24', start: '10:15', end: '12:00', room: 'E-102', lecturer: 'Doe', topic: 'Intro', done: true, chapters: [{ text: 'Kap 1', done: true }], createdAt: 'HEMMELIG', completedAt: 'HEMMELIG' },
    { subjectId: 'ukjent-fag', date: '2026-08-25', secret: 'skal ikke lekke' },
  ],
  readings: [{ id: 'r1', subjectId: 'fag-1', title: 'Lærebok A', week: 34, done: false, chapters: [{ text: 'Kap 1-3', done: false }] }],
  assignments: [{ id: 'a1', subjectId: 'fag-1', title: 'Øving 1', deadline: '2026-09-01', status: 'in_progress', completedAt: 'HEMMELIG' }],
  exams: [{ id: 'e1', subjectId: 'fag-1', title: 'Skriftlig eksamen', date: '2026-11-28', time: '09:00', createdAt: 'HEMMELIG' }],
  aiSources: [{ text: 'HEMMELIG NOTAT' }],
  quizAttempts: [{ userAnswer: 'HEMMELIG SVAR' }],
  workPlans: [{ title: 'HEMMELIG PLAN' }],
  reviews: [{ title: 'HEMMELIG REPETISJON' }],
  weekTemplates: [{ name: 'HEMMELIG MAL' }],
  semesterArchives: [{ name: 'HEMMELIG ARKIV', data: { subjects: [{ name: 'HEMMELIG FAG' }] } }],
}

const result = extractSharedSemester(data)

assert.equal(result.subjects.length, 2)
assert.deepEqual(result.subjects[0], {
  id: 'fag-1',
  name: 'Programmering',
  code: 'DAT101',
  short: 'Prog',
  color: '#059669',
  lectures: [{
    subjectId: 'fag-1',
    date: '2026-08-24',
    start: '10:15',
    end: '12:00',
    room: 'E-102',
    lecturer: 'Doe',
    topic: 'Intro',
    done: true,
    chapters: [{ text: 'Kap 1', done: true }],
  }],
  readings: [{ subjectId: 'fag-1', title: 'Lærebok A', week: 34, done: false, chapters: [{ text: 'Kap 1-3', done: false }] }],
  assignments: [{ subjectId: 'fag-1', title: 'Øving 1', deadline: '2026-09-01', status: 'in_progress' }],
  exams: [{ subjectId: 'fag-1', title: 'Skriftlig eksamen', date: '2026-11-28', time: '09:00' }],
})

// ugyldig farge fallbackes, ingenting fra ukjente fag eller private lister lekker
assert.equal(result.subjects[1].color, '#146c54')
const flat = JSON.stringify(result)
for (const secret of ['HEMMELIG', 'ukjent-fag', 'javascript:', 'createdAt', 'aiSources']) {
  assert.ok(!flat.includes(secret), `lekasje: ${secret}`)
}
assert.ok(result.generatedAt)

// tom/ugyldig data gir null
assert.equal(extractSharedSemester(null), null)
assert.equal(extractSharedSemester({ subjects: [] }), null)
