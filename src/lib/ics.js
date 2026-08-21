function unfold(text) {
  return text.split(/\r?\n/).reduce((acc, line) => {
    if (line.startsWith(' ') || line.startsWith('\t')) acc[acc.length - 1] += line.slice(1)
    else acc.push(line)
    return acc
  }, [])
}

function icsText(value) {
  return value.replace(/\\([nN,;\\])/g, (_, char) => char.toLowerCase() === 'n' ? '\n' : char)
}

function icsDateTime(value, prop) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/)
  if (!m) return { date: null, time: '' }
  const [, y, mo, d, h, mi, s, z] = m
  if (prop.toUpperCase().includes('VALUE=DATE')) return { date: `${y}-${mo}-${d}`, time: '' }
  const date = z
    ? new Date(Date.UTC(+y, +mo - 1, +d, +(h || 0), +(mi || 0), +(s || 0)))
    : new Date(+y, +mo - 1, +d, +(h || 0), +(mi || 0), +(s || 0))
  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  }
}

export function extractCode(title) {
  const m = title.match(/\b[A-ZÆØÅ]{2,}\s*\d{3,}\b/)
  return m ? m[0].replace(/\s+/g, '') : ''
}

export function guessKind(title) {
  const low = title.toLowerCase()
  if (/eksamen|exam|tentamen|prøve/.test(low)) return 'exam'
  if (/pensum|les\s+kapittel/.test(low)) return 'reading'
  if (/innlevering|arbeidskrav|oblig|oppgave|\btest\b/.test(low)) return 'assignment'
  if (/forelesning|seminar|øving|øvelse|lab|laboratorium|gruppe|colloquium/.test(low)) return 'lecture'
  return 'lecture'
}

export function parseIcs(text) {
  const events = []
  let ev = null
  for (const line of unfold(text)) {
    const upper = line.toUpperCase()
    if (upper.startsWith('BEGIN:VEVENT')) {
      ev = {}
      continue
    }
    if (upper.startsWith('END:VEVENT')) {
      if (ev && ev.title && ev.date) events.push({ title: ev.title, date: ev.date, time: ev.time ?? '', room: ev.room ?? '' })
      ev = null
      continue
    }
    if (!ev) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const prop = line.slice(0, idx)
    const value = line.slice(idx + 1)
    const name = prop.split(';')[0].toUpperCase()
    if (name === 'SUMMARY') ev.title = icsText(value.trim())
    else if (name === 'LOCATION') ev.room = icsText(value.trim())
    else if (name === 'DTSTART') {
      const start = icsDateTime(value, prop)
      ev.date = start.date
      ev.time = start.time
    }
  }
  return events
}
