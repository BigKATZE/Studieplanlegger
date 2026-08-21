import assert from 'node:assert/strict'
import { buildAiRequest, buildWeeklySnapshot, formatBreakdownPlan, rankSourcePassages } from './aiTools.js'

assert.deepEqual(buildAiRequest('breakdown', '  Oppgavetekst  ', {
  subject: ' JUS2010 ',
  assignment: '',
}), {
  tool: 'breakdown',
  text: 'Oppgavetekst',
  context: { subject: 'JUS2010' },
  breakdown: { detail: 'standard' },
})

assert.deepEqual(buildAiRequest('breakdown', 'x'.repeat(20), {}, {
  detail: 'detailed',
  timeBudgetHours: '12',
}).breakdown, { detail: 'detailed', timeBudgetHours: 12 })

assert.deepEqual(buildAiRequest('breakdown', 'x'.repeat(20), {}, {
  detail: 'ukjent',
  timeBudgetHours: '0',
}).breakdown, { detail: 'standard' })

const quiz = buildAiRequest('quiz', 'x'.repeat(21_000), {}, {
  difficulty: 'hard',
  count: 13,
  previousQuestions: [' Første spørsmål? ', 'Andre spørsmål?'],
  weakQuestions: [' Svakt tema '],
})
assert.equal(quiz.text.length, 20_000)
assert.deepEqual(quiz.quiz, {
  difficulty: 'hard',
  count: 13,
  previousQuestions: ['Første spørsmål?', 'Andre spørsmål?'],
  weakQuestions: ['Svakt tema'],
})

assert.equal(formatBreakdownPlan({
  summary: 'Lag en juridisk drøftelse.',
  requirements: ['Bruk juridisk metode'],
  steps: [{ title: 'Lag disposisjon', description: 'Sorter spørsmålene.', doneCriteria: 'Alle spørsmål har en plass.', estimatedMinutes: 30 }],
  clarifications: ['Kontroller henvisningsstil'],
}), `ARBEIDSPLAN

Lag en juridisk drøftelse.

KRAV
- Bruk juridisk metode

DELOPPGAVER
1. Lag disposisjon (30 min)
Sorter spørsmålene.
   Ferdig når: Alle spørsmål har en plass.

AVKLAR FØR DU STARTER
- Kontroller henvisningsstil`)

const passages = rankSourcePassages([{ id: 's1', subjectId: 'math', title: 'Notater', text: 'Derivasjon handler om endring. Derivasjon brukes i analyse.' }, { id: 's2', subjectId: 'other', title: 'Utenfor', text: 'Derivasjon' }], 'math', 'derivasjon', 12_000)
assert.equal(passages.length, 1)
assert.equal(passages[0].sourceId, 's1')
assert.equal(passages[0].id, 's1:1')
assert.deepEqual(buildWeeklySnapshot({
  assignments: [
    { title: 'Fullført', deadline: '2026-08-17', status: 'done', completedAt: '2026-08-17T10:00:00.000Z' },
    { title: 'Forfalt', deadline: '2026-08-16', status: 'not_started' },
    { title: 'Neste frist', deadline: '2026-08-24', status: 'not_started' },
  ],
  lectures: [{ topic: 'Forelesning', date: '2026-08-18', done: true, completedAt: '2026-08-18T10:00:00.000Z' }],
  exams: [{ title: 'Eksamen', date: '2026-08-25' }],
  reviews: [
    { title: 'Gammel repetisjon', nextReview: '2026-08-15' },
    { title: 'Ny repetisjon', nextReview: '2026-08-20' },
  ],
}, new Date(2026, 7, 18, 12)), {
  week: { from: '2026-08-17', to: '2026-08-23' },
  completedThisWeek: [
    { title: 'Fullført', date: '2026-08-17' },
    { title: 'Forelesning', date: '2026-08-18' },
  ],
  overdueIncomplete: [
    { title: 'Forfalt', date: '2026-08-16' },
    { title: 'Gammel repetisjon', date: '2026-08-15' },
  ],
  upcomingDeadlines: [
    { title: 'Neste frist', date: '2026-08-24' },
    { title: 'Eksamen', date: '2026-08-25' },
    { title: 'Ny repetisjon', date: '2026-08-20' },
  ],
})
