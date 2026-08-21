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

assert.equal(buildAiRequest('quiz', 'x'.repeat(21_000)).text.length, 20_000)
