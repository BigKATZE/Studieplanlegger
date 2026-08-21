export const DEFAULT_WEEKS = [
  ...Array.from({ length: 53 - 34 + 1 }, (_, i) => 34 + i),
  ...Array.from({ length: 24 }, (_, i) => i + 1),
]

export function schoolYearStart() {
  const now = new Date()
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
}

export function weekRangeByWeek(week) {
  const year = week >= 34 ? schoolYearStart() : schoolYearStart() + 1
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const day = jan4.getUTCDay() || 7
  const w1 = new Date(Date.UTC(year, 0, 4 - (day - 1)))
  return weekRange(new Date(w1.getTime() + (week - 1) * 7 * 86400000))
}

export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

export function fmtShort(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

export function weekdayShort(date) {
  return date.toLocaleDateString('nb-NO', { weekday: 'short' })
}

export function iso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return Math.round((date - today) / 86400000)
}

export function weekRange(date) {
  const day = (date.getDay() + 6) % 7
  const mon = new Date(date)
  mon.setDate(date.getDate() - day)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return `${fmtShort(mon)} – ${fmtShort(sun)}`
}

// ISO 'yyyy-mm-dd' -> visning 'dd/mm/yyyy' (for tekstfelt, uavhengig av nettleser-locale)
export function isoToDisplayDate(iso) {
  const m = (iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ''
  return `${m[3]}/${m[2]}/${m[1]}`
}

// Visning 'dd/mm/yyyy' -> ISO 'yyyy-mm-dd', eller null hvis ugyldig/ufullstendig
export function displayDateToIso(text) {
  const m = (text ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const [, dd, mm, yyyy] = m
  const day = Number(dd)
  const month = Number(mm)
  const year = Number(yyyy)
  if (month < 1 || month > 12) return null
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day < 1 || day > daysInMonth) return null
  return `${yyyy}-${mm}-${dd}`
}

// Sjekker at teksten er et gyldig 24-timers klokkeslett 'HH:mm'
export function isValidTime(text) {
  const m = (text ?? '').match(/^(\d{2}):(\d{2})$/)
  if (!m) return false
  const h = Number(m[1])
  const min = Number(m[2])
  return h <= 23 && min <= 59
}
