export const DEFAULT_WEEKS = Array.from({ length: 52 - 34 + 1 }, (_, i) => 34 + i)

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