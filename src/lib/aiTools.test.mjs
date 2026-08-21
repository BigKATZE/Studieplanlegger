import assert from 'node:assert/strict'
import { buildAiRequest } from './aiTools.js'

assert.deepEqual(buildAiRequest('breakdown', '  Oppgavetekst  ', {
  subject: ' JUS2010 ',
  assignment: '',
}), {
  tool: 'breakdown',
  text: 'Oppgavetekst',
  context: { subject: 'JUS2010' },
})

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
