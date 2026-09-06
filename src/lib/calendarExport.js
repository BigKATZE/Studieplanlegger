const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
const oslo = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })

export function validCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const stamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const dateOnly = (date) => date.replaceAll('-', '')
function osloParts(epoch) {
  const parts = Object.fromEntries(oslo.formatToParts(new Date(epoch)).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
}

// Convert Norwegian wall time independently of the exporting device's time zone.
// Ambiguous autumn times use the first occurrence; nonexistent spring times are rejected.
export function osloTime(date, time) {
  if (!validCalendarDate(date) || !timePattern.test(time ?? '')) return null
  const wall = `${date}T${time}:00`
  const epoch = Date.parse(`${wall}Z`)
  const offsets = new Set([-86400000, 0, 86400000].map((delta) => Date.parse(`${osloParts(epoch + delta)}Z`) - (epoch + delta)))
  const matches = [...offsets].map((offset) => epoch - offset).filter((candidate) => osloParts(candidate) === wall).sort((a, b) => a - b)
  return matches.length ? stamp(new Date(matches[0])) : null
}

function escapeText(value) {
  // eslint-disable-next-line no-control-regex -- Strip unsafe iCalendar control characters, preserving line breaks for escaping.
  return String(value ?? '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
}

function fold(line) {
  const encoder = new TextEncoder()
  let result = ''
  let bytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    if (bytes + size > 75) { result += '\r\n '; bytes = 1 }
    result += char
    bytes += size
  }
  return result
}

export function exportCalendar(data, options = {}, now = new Date()) {
  const { subjectId = '', from = '', to = '', includeCompleted = false, types = ['lectures', 'assignments', 'exams', 'reviews'] } = options
  if ((from && !validCalendarDate(from)) || (to && !validCalendarDate(to)) || (from && to && from > to)) throw new Error('Velg en gyldig periode. Fra-dato må være før til-dato.')
  const subjects = Object.fromEntries((data.subjects ?? []).map((item) => [item.id, item.short || item.name]))
  const definitions = {
    lectures: { label: 'Forelesning', date: 'date', start: 'start', end: 'end' },
    assignments: { label: 'Frist', date: 'deadline' },
    exams: { label: 'Eksamen', date: 'date', start: 'time' },
    reviews: { label: 'Repetisjon', date: 'nextReview' },
  }
  const events = []
  let skipped = 0
  for (const type of new Set(types)) {
    const def = definitions[type]
    if (!def) continue
    for (const item of data[type] ?? []) {
      if (subjectId && item.subjectId !== subjectId) continue
      if (!includeCompleted && (item.done || item.status === 'done')) continue
      const date = item[def.date]
      if (!validCalendarDate(date)) { skipped++; continue }
      if ((from && date < from) || (to && date > to)) continue
      const time = def.start && item[def.start]
      const endTime = def.end && item[def.end]
      const start = time ? osloTime(date, time) : null
      const end = endTime ? osloTime(date, endTime) : null
      if ((time && !start) || (endTime && (!start || !end || end <= start))) { skipped++; continue }
      const lines = ['BEGIN:VEVENT', `UID:${encodeURIComponent(`${type}-${item.id}`)}@studieplanlegger`, `DTSTAMP:${stamp(now)}`]
      if (start) {
        lines.push(`DTSTART:${start}`)
        if (end) lines.push(`DTEND:${end}`)
      } else {
        const next = new Date(`${date}T12:00:00Z`)
        next.setUTCDate(next.getUTCDate() + 1)
        lines.push(`DTSTART;VALUE=DATE:${dateOnly(date)}`, `DTEND;VALUE=DATE:${dateOnly(next.toISOString().slice(0, 10))}`)
      }
      const title = [def.label, subjects[item.subjectId], item.title || item.topic].filter(Boolean).join(' – ')
      lines.push(`SUMMARY:${escapeText(title)}`)
      if (type === 'lectures' && item.room) lines.push(`LOCATION:${escapeText(item.room)}`)
      lines.push('END:VEVENT')
      events.push({ date, lines })
    }
  }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studieplanlegger//Kalendereksport//NB', 'CALSCALE:GREGORIAN', ...events.sort((a, b) => a.date.localeCompare(b.date)).flatMap((event) => event.lines), 'END:VCALENDAR']
  return { text: `${lines.map(fold).join('\r\n')}\r\n`, count: events.length, skipped }
}
