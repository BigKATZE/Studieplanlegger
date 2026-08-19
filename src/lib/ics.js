function unfold(text) {
  return text.split(/\r?\n/).reduce((acc, line) => {
    if (line.startsWith(' ') || line.startsWith('\t')) acc[acc.length - 1] += line.slice(1)
    else acc.push(line)
    return acc
  }, [])
}

function icsDate(value, prop) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/)
  if (!m) return null
  const [, y, mo, d, h, mi, s, z] = m
  if (prop.toUpperCase().includes('VALUE=DATE')) return `${y}-${mo}-${d}`
  const date = z
    ? new Date(Date.UTC(+y, +mo - 1, +d, +(h || 0), +(mi || 0), +(s || 0)))
    : new Date(+y, +mo - 1, +d, +(h || 0), +(mi || 0), +(s || 0))
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function extractCode(title) {
  const m = title.match(/\b[A-ZÆØÅ]{2,}\s*\d{3,}\b/)
  return m ? m[0].replace(/\s+/g, '') : ''
}

export function guessKind(title) {
  const low = title.toLowerCase()
  if (/eksamen|exam|tentamen|prøve/.test(low)) return 'exam'
  if (/forelesning|seminar|øving|øvelse|lab|laboratorium|gruppe|colloquium/.test(low)) return 'lecture'
  if (/innlevering|arbeidskrav|oblig|oppgave|test/.test(low)) return 'assignment'
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
      if (ev && ev.title && ev.date) events.push({ title: ev.title, date: ev.date, time: ev.time ?? '' })
      ev = null
      continue
    }
    if (!ev) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const prop = line.slice(0, idx)
    const value = line.slice(idx + 1)
    const name = prop.split(';')[0].toUpperCase()
    if (name === 'SUMMARY') ev.title = value.trim()
    else if (name === 'DTSTART') {
      ev.date = icsDate(value, prop)
      const t = value.match(/T(\d{2})(\d{2})/)
      ev.time = t ? `${t[1]}:${t[2]}` : ''
    }
  }
  return events
}