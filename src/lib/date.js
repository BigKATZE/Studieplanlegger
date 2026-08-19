export const DEFAULT_WEEKS = [
  ...Array.from({ length: 52 - 34 + 1 }, (_, i) => 34 + i),
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
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
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
  const d = new Date(dateStr)
  return Math.round((d - today) / 86400000)
}

export function weekRange(date) {
  const day = (date.getDay() + 6) % 7
  const mon = new Date(date)
  mon.setDate(date.getDate() - day)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return `${fmtShort(mon)} – ${fmtShort(sun)}`
}