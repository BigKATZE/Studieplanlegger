import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { parseIcs, guessKind, extractCode } from './ics.js'

const isoLocal = (s) => {
  const d = new Date(s)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const timeLocal = (s) => new Date(s).toTimeString().slice(0, 5)

const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261001
SUMMARY:Arbeidskrav 1 Forretningsjus
LOCATION:C432
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
assert.equal(events[0].room, 'C432')
assert.equal(events[1].title, 'Eksamen i bedøk')
assert.equal(events[1].date, '2026-10-15')
assert.equal(events[1].time, '12:00')
assert.equal(events[2].date, isoLocal('2026-10-20T10:00:00Z'))
assert.equal(events[2].time, timeLocal('2026-10-20T10:00:00Z'))

const midnightUtc = parseIcs('BEGIN:VEVENT\nDTSTART:20261020T230000Z\nSUMMARY:Sen time\nEND:VEVENT')[0]
assert.equal(midnightUtc.date, isoLocal('2026-10-20T23:00:00Z'))
assert.equal(midnightUtc.time, timeLocal('2026-10-20T23:00:00Z'))

assert.equal(guessKind('Eksamen i bedøk'), 'exam')
assert.equal(guessKind('Forelesning – Gina Bråthen'), 'lecture')
assert.equal(guessKind('Seminar i rettslære'), 'lecture')
assert.equal(guessKind('Arbeidskrav 1 Forretningsjus'), 'assignment')
assert.equal(guessKind('Innlevering kapittel 3'), 'assignment')
assert.equal(guessKind('Hjemmeeksamen'), 'exam')
assert.equal(guessKind('Pensum TEST1234 – les kapittel 1–3'), 'reading')

assert.equal(extractCode('JUS2010 Forelesning Statsrett intro'), 'JUS2010')
assert.equal(extractCode('Forelesning JUR3420'), 'JUR3420')
assert.equal(extractCode('Seminar BØK 3430'), 'BØK3430')
assert.equal(extractCode('Eksamen i bedøk'), '')
assert.equal(extractCode('Forelesning Statsrett/EØS-rett tirs 10.15 u 35'), '')

const fixtureEvents = parseIcs(readFileSync(new URL('../../test-kalender.ics', import.meta.url), 'utf8'))
assert.equal(fixtureEvents.length, 12, 'testkalenderen skal inneholde 12 hendelser')
assert.deepEqual(
  Object.fromEntries(['lecture', 'reading', 'assignment', 'exam'].map((kind) => [kind, fixtureEvents.filter((e) => guessKind(e.title) === kind).length])),
  { lecture: 3, reading: 3, assignment: 3, exam: 3 },
)
assert.deepEqual(new Set(fixtureEvents.map((e) => extractCode(e.title))), new Set(['TEST1234', 'TES2345', 'TES3456']))
assert.equal(fixtureEvents.find((e) => e.title.includes('Introduksjon')).room, 'C432')

console.log('ics parseIcs: ok')
