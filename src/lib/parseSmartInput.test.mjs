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
assert.equal(a1.action.type, 'assignment')
assert.equal(a1.action.subject.id, 's2')
assert.equal(a1.action.title, 'Arbeidskrav 1')
assert.equal(a1.action.date.getDate(), 1)
assert.equal(a1.action.date.getMonth(), 9)

const a2 = parseSmartInput('les kapittel 4 til forelesningen på tirsdag', subjects)
assert.equal(a2.ok, true)
assert.equal(a2.action.type, 'chapter')
assert.equal(a2.action.label, 'Kapittel 4')

const a3 = parseSmartInput('forelesning i bedøk torsdag kl 10:00', subjects)
assert.equal(a3.ok, true)
assert.equal(a3.action.type, 'lecture')
assert.equal(a3.action.subject.id, 's3')
assert.equal(a3.action.time, '10:00')

const a4 = parseSmartInput('Skriftlig skoleeksamen i rettstaten 1. november', subjects)
assert.equal(a4.ok, true)
assert.equal(a4.action.type, 'exam')
assert.equal(a4.action.title, 'Skriftlig skoleeksamen')
assert.equal(a4.action.subject.id, 's5')
assert.equal(a4.action.date.getMonth(), 10)

const a5 = parseSmartInput('hei hei', subjects)
assert.equal(a5.ok, false)

const a6 = parseSmartInput('arbeidskrav 1 med frist 1. oktober', subjects)
assert.equal(a6.ok, false, 'missing subject should fail')

console.log('parseSmartInput: ok')