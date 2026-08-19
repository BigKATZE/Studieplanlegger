import assert from 'node:assert'
import { parseIcs, guessKind, extractCode } from './ics.js'

const isoLocal = (s) => {
  const d = new Date(s)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261001
SUMMARY:Arbeidskrav 1 Forretningsjus
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Europe/Oslo:20261015T120000
SUMMARY:Eksamen i bedøk
END:VEVENT
BEGIN:VEVENT
DTSTART:20261020T100000Z
SUMMARY:Innlevering
END:VEVENT
END:VCALENDAR`

const events = parseIcs(ics)
assert.equal(events.length, 3)
assert.equal(events[0].title, 'Arbeidskrav 1 Forretningsjus')
assert.equal(events[0].date, '2026-10-01')
assert.equal(events[0].time, '')
assert.equal(events[1].title, 'Eksamen i bedøk')
assert.equal(events[1].date, '2026-10-15')
assert.equal(events[1].time, '12:00')
assert.equal(events[2].date, isoLocal('2026-10-20T10:00:00Z'))
assert.equal(events[2].time, '10:00')

assert.equal(guessKind('Eksamen i bedøk'), 'exam')
assert.equal(guessKind('Forelesning – Gina Bråthen'), 'lecture')
assert.equal(guessKind('Seminar i rettslære'), 'lecture')
assert.equal(guessKind('Arbeidskrav 1 Forretningsjus'), 'assignment')
assert.equal(guessKind('Innlevering kapittel 3'), 'assignment')
assert.equal(guessKind('Hjemmeeksamen'), 'exam')

assert.equal(extractCode('JUS2010 Forelesning Statsrett intro'), 'JUS2010')
assert.equal(extractCode('Forelesning JUR3420'), 'JUR3420')
assert.equal(extractCode('Seminar BØK 3430'), 'BØK3430')
assert.equal(extractCode('Eksamen i bedøk'), '')
assert.equal(extractCode('Forelesning Statsrett/EØS-rett tirs 10.15 u 35'), '')

console.log('ics parseIcs: ok')