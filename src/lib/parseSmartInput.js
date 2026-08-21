const WEEKDAYS = { mandag: 1, tirsdag: 2, onsdag: 3, torsdag: 4, fredag: 5, lørdag: 6, søndag: 0 }
const MONTHS = {
  januar: 1, februar: 2, mars: 3, april: 4, mai: 5, juni: 6,
  juli: 7, august: 8, september: 9, oktober: 10, november: 11, desember: 12,
}
const ASSIGNMENT_TITLE = /(arbeidskrav\s*\d*|oppgave\s*\d*|oblig(?:atorisk)?\s*\d*|innlevering\s*\d*|prøve\s*\d*|test\s*\d*)/
const EXAM_TITLE = /(hjemmeeksamen|skriftlig\s+skoleeksamen|muntlig\s+eksamen|skoleeksamen|eksamen)/
const ENTRY_KEYWORDS = /(eksamen|arbeidskrav|innlevering|oblig|oppgave|prøve|test|forelesning|pensum|les\s+kapittel|lese\s+kapittel|kapittel)/

function norm(s) {
  return s.toLowerCase().replace(/ø/g, 'o').replace(/æ/g, 'a').replace(/å/g, 'a').replace(/[^a-z0-9]/g, '')
}

function looseCode(code) {
  const parts = code.match(/[A-ZØÆÅ]+|\d[\d-]*/gi) || []
  return parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*')
}

export function matchSubject(low, subjects) {
  if (!subjects?.length) return null
  const n = norm(low)
  for (const s of subjects) {
    const code = norm(s.code ?? '')
    if (code && n.includes(code)) return s
  }
  for (const s of subjects) if (norm(s.short).length >= 3 && n.includes(norm(s.short))) return s
  for (const s of subjects) if (norm(s.name).length >= 4 && n.includes(norm(s.name))) return s
  return null
}

function isoStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function validDate(year, month, day) {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

function nextWeekday(name) {
  const target = WEEKDAYS[name]
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let diff = target - today.getDay()
  if (diff <= 0) diff += 7
  const d = new Date(today)
  d.setDate(today.getDate() + diff)
  return d
}

function rollToNextYearIfPast(date) {
  const ref = new Date()
  ref.setHours(0, 0, 0, 0)
  ref.setMonth(ref.getMonth() - 2)
  if (date < ref) date.setFullYear(date.getFullYear() + 1)
  return date
}

function matchDate(low) {
  const isoM = low.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/)
  if (isoM) return validDate(+isoM[1], +isoM[2], +isoM[3])
  const dmy = low.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/)
  if (dmy) {
    const month = +dmy[2]
    if (month >= 1 && month <= 12) {
      let year = dmy[3] ? +dmy[3] : new Date().getFullYear()
      if (year < 100) year += 2000
      const d = validDate(year, month, +dmy[1])
      if (!d) return null
      return dmy[3] ? d : rollToNextYearIfPast(d)
    }
  }
  if (/\bimorgen\b|i\s+morgen/.test(low)) {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    t.setDate(t.getDate() + 1)
    return t
  }
  if (/\bovermorgen\b/.test(low)) {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    t.setDate(t.getDate() + 2)
    return t
  }
  for (const [name] of Object.entries(WEEKDAYS)) {
    if (low.includes(name)) return nextWeekday(name)
  }
  const m = low.match(/\b(\d{1,2})\.\s*([a-zæøå]+)(?:\s+(\d{4}))?\b/)
  if (m && MONTHS[m[2]] !== undefined) {
    const y = m[3] ? +m[3] : new Date().getFullYear()
    const d = validDate(y, MONTHS[m[2]], +m[1])
    if (!d) return null
    return m[3] ? d : rollToNextYearIfPast(d)
  }
  return null
}

function matchDates(low) {
  const re = /\b(\d{1,2})\.\s*(?:og\s*)?(\d{1,2})\.\s*([a-zæøå]+)\b|\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b|\b(\d{4})-(\d{1,2})-(\d{1,2})\b|\b(\d{1,2})\.\s*([a-zæøå]+)(?:\s+(\d{4}))?\b/g
  const out = []
  let m
  while ((m = re.exec(low))) {
    if (m[1] && m[3]) {
      const month = MONTHS[m[3]]
      const year = new Date().getFullYear()
      const first = month && validDate(year, month, +m[1])
      const second = month && validDate(year, month, +m[2])
      if (first) out.push(rollToNextYearIfPast(first))
      if (second) out.push(rollToNextYearIfPast(second))
    } else if (m[4] && m[5]) {
      const y = m[6] ? (m[6].length === 2 ? 2000 + +m[6] : +m[6]) : new Date().getFullYear()
      if (+m[5] >= 1 && +m[5] <= 12) {
        const d = validDate(y, +m[5], +m[4])
        if (d) out.push(m[6] ? d : rollToNextYearIfPast(d))
      }
    } else if (m[7] && m[8] && m[9]) {
      const d = validDate(+m[7], +m[8], +m[9])
      if (d) out.push(d)
    } else if (m[10] && m[11] && MONTHS[m[11]] !== undefined) {
      const y = m[12] ? +m[12] : new Date().getFullYear()
      const d = validDate(y, MONTHS[m[11]], +m[10])
      if (d) out.push(m[12] ? d : rollToNextYearIfPast(d))
    }
  }
  const seen = new Set()
  return out.filter((d) => {
    const k = isoStr(d)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function matchTime(low) {
  const m = low.match(/kl\.?\s*(\d{1,2})(?:[:.](\d{2}))?/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2] ?? '00'}`
  const m2 = low.match(/\b(\d{1,2}):(\d{2})\b/)
  if (m2) return `${m2[1].padStart(2, '0')}:${m2[2]}`
  return null
}

function stripNoise(low, subjects) {
  let s = low
  s = s.replace(/\b(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag)\b/g, ' ')
  s = s.replace(/\bi\s+morgen\b|\bimorgen\b|\bovermorgen\b/g, ' ')
  s = s.replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, ' ')
  s = s.replace(/\b\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?\b/g, ' ')
  s = s.replace(/\b\d{1,2}[:.]\d{2}\b/g, ' ')
  s = s.replace(/\bkl\.?/g, ' ')
  s = s.replace(/til\s+forelesningen?\b/g, ' ')
  for (const sub of subjects) {
    s = s.replace(new RegExp(looseCode(sub.code), 'gi'), ' ')
    s = s.replace(new RegExp(sub.short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ')
    s = s.replace(new RegExp(sub.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ')
  }
  s = s.replace(/\b(til|på|for|i|med|frist|dato|frem|levere|lever|om)\b/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function splitEntries(raw) {
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  const entries = []
  for (const p of parts) {
    if (entries.length && !ENTRY_KEYWORDS.test(p.toLowerCase())) {
      entries[entries.length - 1] += ', ' + p
    } else {
      entries.push(p)
    }
  }
  return entries
}

function parseEntry(input, subjects) {
  const low = input.toLowerCase()
  const subject = matchSubject(low, subjects)
  const dates = matchDates(low)
  const date = dates[0] ?? matchDate(low)
  const time = matchTime(low)
  const chapterMatch = low.match(/kap(?:ittel)?\.?\s*(\d{1,2}(?:\s*[-–]\s*\d{1,2})?)/)

  const hasExamKw = /eksamen/.test(low)
  const hasAssignmentKw = /arbeidskrav|innlevering|oblig|levere inn|prøve|test|oppgave/.test(low)
  const hasLectureKw = /forelesning|timeplan|foreleser|time\s+kl/.test(low)
  const hasReadingKw = /pensum/.test(low)

  let type
  if (hasExamKw) type = 'exam'
  else if (hasAssignmentKw && !hasLectureKw) type = 'assignment'
  else if (hasReadingKw) type = 'reading'
  else if (chapterMatch || /\bles\b|\blese\b/.test(low)) type = 'chapter'
  else if (hasLectureKw || time) type = 'lecture'
  else {
    return {
      ok: false,
      error: 'Kunne ikke tolke det. Prøv f.eks. «arbeidskrav 1 i forretningsjus, frist 1. oktober», «eksamen i bedøk 1. november» eller «les kapittel 4 til tirsdag».',
    }
  }

  if (type === 'assignment') {
    if (!subject) return { ok: false, error: 'Fant ikke hvilket fag det gjelder. Skriv f.eks. «i forretningsjus».' }
    if (!dates.length) return { ok: false, error: 'Mangler frist. Skriv f.eks. «frist 1. oktober».' }
    const titleMatch = low.match(ASSIGNMENT_TITLE)
    const title = titleMatch ? capitalize(titleMatch[1].trim()) : 'Arbeidskrav'
    return { ok: true, actions: dates.map((d) => ({ type: 'assignment', subject, title, date: d })) }
  }

  if (type === 'exam') {
    if (!subject) return { ok: false, error: 'Fant ikke hvilket fag eksamen er i. Skriv f.eks. «i forretningsjus».' }
    if (!dates.length) return { ok: false, error: 'Mangler eksamensdato. Skriv f.eks. «1. november».' }
    const titleMatch = low.match(EXAM_TITLE)
    const title = titleMatch ? capitalize(titleMatch[1].trim()) : 'Eksamen'
    return { ok: true, actions: dates.map((d) => ({ type: 'exam', subject, title, date: d, time: time ?? '' })) }
  }

  if (type === 'reading') {
    if (!subject) return { ok: false, error: 'Fant ikke hvilket fag det gjelder. Skriv f.eks. «pensum kapittel 3 i forretningsjus».' }
    let label = chapterMatch ? 'Kapittel ' + chapterMatch[1].replace(/\s+/g, '') : null
    if (!label) {
      label = stripNoise(low, subjects).replace(/^pensum\s*/i, '').replace(/^les\s*/i, '') || 'Pensum'
      label = capitalize(label)
    }
    const dlist = dates.length ? dates : [date]
    return { ok: true, actions: dlist.map((d) => ({ type: 'reading', subject, date: d, label })) }
  }

  if (type === 'chapter') {
    if (!subject && !date) {
      return { ok: false, error: 'Angi fag og/eller dag, f.eks. «les kapittel 4 i forretningsjus til tirsdag».' }
    }
    let label = chapterMatch ? 'Kapittel ' + chapterMatch[1].replace(/\s+/g, '') : null
    if (!label) {
      label = stripNoise(low, subjects).replace(/^les\s*/, '') || 'Pensum'
      label = capitalize(label)
    }
    return { ok: true, actions: [{ type: 'chapter', subject, date, label }] }
  }

  if (!subject) return { ok: false, error: 'Fant ikke hvilket fag forelesningen er i. Skriv f.eks. «i bedøk».' }
  if (!date) return { ok: false, error: 'Mangler dato. Skriv f.eks. «tirsdag» eller «1. oktober».' }
  const topic = capitalize(stripNoise(low, subjects).replace(/^forelesning\s*/, '').trim()) || ''
  return { ok: true, actions: [{ type: 'lecture', subject, date, time: time ?? '10:00', topic }] }
}

export function parseSmartInput(raw, subjects) {
  const input = raw.trim()
  if (!input) return { ok: false, error: 'Skriv noe først.' }
  const entries = splitEntries(input)
  const parsed = entries.map((e) => parseEntry(e, subjects))
  const failed = parsed.findIndex((r) => !r.ok)
  if (failed !== -1) return { ok: false, error: parsed[failed].error }
  return { ok: true, actions: parsed.flatMap((r) => r.actions) }
}
