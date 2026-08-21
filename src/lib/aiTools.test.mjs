import assert from 'node:assert/strict'
import { buildAiRequest, formatBreakdownPlan } from './aiTools.js'

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
})
assert.equal(quiz.text.length, 20_000)
assert.deepEqual(quiz.quiz, {
  difficulty: 'hard',
  count: 13,
  previousQuestions: ['Første spørsmål?', 'Andre spørsmål?'],
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
