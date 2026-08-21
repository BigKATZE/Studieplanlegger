import assert from 'node:assert/strict'
import { extractSharedPlan } from '../../supabase/functions/shared-plan/extract.js'

const result = extractSharedPlan({
  aiSources: [{ text: 'hemmelig kilde' }],
  quizAttempts: [{ userAnswer: 'hemmelig svar' }],
  workPlans: [{
    id: '123e4567-e89b-42d3-a456-426614174000',
    title: ' Plan ',
    summary: 'Kort oppsummering',
    subjectId: 'privat-fag',
    requirements: ['Krav 1'],
    clarifications: ['Avklaring 1'],
    steps: [{
      id: '123e4567-e89b-42d3-a456-426614174001',
      title: 'Steg',
      description: 'Beskrivelse',
      doneCriteria: 'Kontrollert',
      estimatedMinutes: 45,
      completed: true,
      privateNote: 'hemmelig',
    }],
    owner: 'hemmelig',
  }],
}, '123e4567-e89b-42d3-a456-426614174000')

assert.deepEqual(result, {
  id: '123e4567-e89b-42d3-a456-426614174000',
  title: 'Plan',
  summary: 'Kort oppsummering',
  requirements: ['Krav 1'],
  clarifications: ['Avklaring 1'],
  steps: [{
    id: '123e4567-e89b-42d3-a456-426614174001',
    title: 'Steg',
    description: 'Beskrivelse',
    doneCriteria: 'Kontrollert',
    estimatedMinutes: 45,
  }],
})

assert.equal(extractSharedPlan({ workPlans: [] }, 'missing'), null)
