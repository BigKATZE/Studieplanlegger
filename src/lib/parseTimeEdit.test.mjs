import assert from 'node:assert'
import { parseTimeEdit, detectCourseCode } from './parseTimeEdit.js'

const sample = `TimeEdit
Timeplan OH1
JUR 3420, Forretningsjus, JUR 3420 OH1, Forretningsjus, 202620
10.08.2026 - 31.12.2026
Uke   Ukedag   Startdato   Starttidspunkt Sluttidspunkt Studentgruppe Foreleser Rom
u 34   Mandag   17.08.2026   10:00   11:45   Forelesning   Gina Bråthen C2-060
u 35   Fredag   28.08.2026   10:00   11:45   Forelesning   Harald Benestad Anderssen C2-060
u 38   Onsdag   16.09.2026   10:00   11:45   Forelesning   Harald Benestad Anderssen B1-020
https://cloud.timeedit.net/bi/web/staff/example.html`

const out = parseTimeEdit(sample)
assert.equal(out.length, 3, 'should skip header/url lines')
assert.deepEqual(out[0], { date: '2026-08-17', start: '10:00', end: '11:45', room: 'C2-060', lecturer: 'Gina Bråthen' })
assert.equal(out[1].lecturer, 'Harald Benestad Anderssen')
assert.equal(out[2].room, 'B1-020')
assert.equal(detectCourseCode(sample), 'JUR3420')

console.log(`parseTimeEdit: ok (${out.length} lectures parsed)`)
