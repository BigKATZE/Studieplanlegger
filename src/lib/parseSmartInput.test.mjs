import assert from 'node:assert'
import { parseSmartInput } from './parseSmartInput.js'

const subjects = [
  { id: 's1', code: 'EXC3401', name: 'Business Communication, Culture and Ethics', short: 'BizCom' },
  { id: 's2', code: 'JUR3420', name: 'Forretningsjus', short: 'Forretningsjus' },
  { id: 's3', code: 'BØK3430', name: 'Bedriftsøkonomi og finans', short: 'Bedøk' },
  { id: 's4', code: 'ORG3403', name: 'Organisasjonsadferd og ledelse', short: 'Org & ledelse' },
  { id: 's5', code: 'JUS2010-1', name: 'Rettstaten', short: 'Rettstaten' },
]

const a1 = parseSmartInput('Arbeidskrav 1 i forretningsjus, frist 1. oktober', subjects)
assert.equal(a1.ok, true)
assert.equal(a1.actions.length, 1)
assert.equal(a1.actions[0].type, 'assignment')
assert.equal(a1.actions[0].subject.id, 's2')
assert.equal(a1.actions[0].title, 'Arbeidskrav 1')
assert.equal(a1.actions[0].date.getDate(), 1)
assert.equal(a1.actions[0].date.getMonth(), 9)

const a2 = parseSmartInput('les kapittel 4 til forelesningen på tirsdag', subjects)
assert.equal(a2.ok, true)
assert.equal(a2.actions.length, 1)
assert.equal(a2.actions[0].type, 'chapter')
assert.equal(a2.actions[0].label, 'Kapittel 4')

const a3 = parseSmartInput('forelesning i bedøk torsdag kl 10:00', subjects)
assert.equal(a3.ok, true)
assert.equal(a3.actions.length, 1)
assert.equal(a3.actions[0].type, 'lecture')
assert.equal(a3.actions[0].subject.id, 's3')
assert.equal(a3.actions[0].time, '10:00')

const a4 = parseSmartInput('Skriftlig skoleeksamen i rettstaten 1. november', subjects)
assert.equal(a4.ok, true)
assert.equal(a4.actions.length, 1)
assert.equal(a4.actions[0].type, 'exam')
assert.equal(a4.actions[0].title, 'Skriftlig skoleeksamen')
assert.equal(a4.actions[0].subject.id, 's5')
assert.equal(a4.actions[0].date.getMonth(), 10)

const a5 = parseSmartInput('hei hei', subjects)
assert.equal(a5.ok, false)

const a6 = parseSmartInput('arbeidskrav 1 med frist 1. oktober', subjects)
assert.equal(a6.ok, false, 'missing subject should fail')

const a7 = parseSmartInput('eksamen i bedøk 1. november og 3. november', subjects)
assert.equal(a7.ok, true)
assert.equal(a7.actions.length, 2)
assert.equal(a7.actions[0].type, 'exam')
assert.equal(a7.actions[0].date.getDate(), 1)
assert.equal(a7.actions[1].date.getDate(), 3)

const a8 = parseSmartInput('eksamen i bedøk 1. og 3. november', subjects)
assert.equal(a8.ok, true)
assert.equal(a8.actions.length, 2)
assert.equal(a8.actions[0].date.getDate(), 1)
assert.equal(a8.actions[1].date.getDate(), 3)

const a9 = parseSmartInput(
  'Arbeidskrav 1 i forretningsjus, frist 1. oktober, eksamen i bedøk 1. november og 3. november',
  subjects,
)
assert.equal(a9.ok, true)
assert.equal(a9.actions.length, 3)
assert.equal(a9.actions[0].type, 'assignment')
assert.equal(a9.actions[1].type, 'exam')
assert.equal(a9.actions[1].date.getDate(), 1)
assert.equal(a9.actions[2].type, 'exam')
assert.equal(a9.actions[2].date.getDate(), 3)

const a10 = parseSmartInput('pensum kapittel 3 i forretningsjus 1. november og 3. november', subjects)
assert.equal(a10.ok, true)
assert.equal(a10.actions.length, 2)
assert.equal(a10.actions[0].type, 'reading')
assert.equal(a10.actions[0].label, 'Kapittel 3')
assert.equal(a10.actions[0].subject.id, 's2')
assert.equal(a10.actions[1].date.getDate(), 3)

// Dato mer enn ~2 måneder tilbake skal rulles til neste år (skoleåret krysser kalenderår).
const now = new Date()
now.setHours(0, 0, 0, 0)
const twoMonthsAgo = new Date(now)
twoMonthsAgo.setMonth(now.getMonth() - 2)

const a11 = parseSmartInput('eksamen i bedøk 1. mai', subjects)
assert.equal(a11.ok, true)
assert.equal(a11.actions[0].date.getMonth(), 4)
assert.ok(a11.actions[0].date >= twoMonthsAgo, 'dato > 2 måneder tilbake skal rulles til neste år')

const a12 = parseSmartInput('eksamen i bedøk 1. mai 2025', subjects)
assert.equal(a12.ok, true)
assert.equal(a12.actions[0].date.getFullYear(), 2025, 'eksplisitt årstall skal beholdes')

const a13 = parseSmartInput('eksamen i bedøk 1. august', subjects)
assert.ok(a13.actions[0].date >= twoMonthsAgo, 'august ruller til neste år hvis > 2 måneder tilbake')

console.log('parseSmartInput: ok')